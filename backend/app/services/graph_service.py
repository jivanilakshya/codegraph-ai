"""Read-only PostgreSQL projection for a scanned project's code graph."""

import logging
from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased

from app.database.postgres import SessionLocal
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.project import Project
from app.models.relationship import FileRelationship
from app.schemas.graph import (
    GraphEdge,
    GraphNode,
    GraphRelationshipType,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)

logger = logging.getLogger(__name__)

MAX_GRAPH_NODES = 5_000


class GraphServiceError(Exception):
    """Base error raised while assembling a project graph."""


class GraphProjectNotFoundError(GraphServiceError):
    """Raised when a graph is requested for a missing project."""


class GraphNodeNotFoundError(GraphServiceError):
    """Raised when a focus graph is requested for an unknown node."""


@dataclass(frozen=True)
class _ProjectGraphRecords:
    files: list[File]
    entities: list[CodeEntity]
    file_relationships: list[FileRelationship]
    entity_relationships: list[EntityRelationship]


class GraphService:
    """Build a bounded graph from persisted repository-analysis records."""

    def build_project_graph(self, project_id: int) -> ProjectGraphResponse:
        """Return files, supported entities, and only fully-resolved relationships."""
        records = self._load_project_graph(project_id)
        nodes: list[GraphNode] = []
        node_ids: set[str] = set()

        def add_node(node: GraphNode) -> None:
            if node.id not in node_ids and len(nodes) < MAX_GRAPH_NODES:
                node_ids.add(node.id)
                nodes.append(node)

        for file_record in records.files:
            add_node(
                GraphNode(
                    id=self._file_node_id(file_record.id),
                    label=file_record.path,
                    type="file",
                )
            )

        for entity in records.entities:
            node_type = self._entity_node_type(entity.entity_type)
            if node_type is not None:
                add_node(
                    GraphNode(
                        id=self._entity_node_id(entity.id),
                        label=entity.name,
                        type=node_type,
                    )
                )

        edges: list[GraphEdge] = []
        edge_keys: set[tuple[str, str, str]] = set()

        def add_edge(
            source: str, target: str, relationship_type: GraphRelationshipType
        ) -> None:
            key = (source, target, relationship_type)
            if source not in node_ids or target not in node_ids or key in edge_keys:
                return
            edge_keys.add(key)
            edges.append(
                GraphEdge(
                    id=f"edge_{len(edges) + 1}",
                    source=source,
                    target=target,
                    type=relationship_type,
                )
            )

        for relationship in records.file_relationships:
            if relationship.relationship_type == "IMPORTS":
                add_edge(
                    self._file_node_id(relationship.source_file_id),
                    self._file_node_id(relationship.target_file_id),
                    "IMPORTS",
                )

        for entity in records.entities:
            if self._entity_node_type(entity.entity_type) is not None:
                add_edge(
                    self._file_node_id(entity.file_id),
                    self._entity_node_id(entity.id),
                    "DECLARES",
                )

        for relationship in records.entity_relationships:
            if relationship.relationship_type == "CALLS":
                add_edge(
                    self._entity_node_id(relationship.source_entity_id),
                    self._entity_node_id(relationship.target_entity_id),
                    "CALLS",
                )

        requested_node_count = len(records.files) + sum(
            self._entity_node_type(entity.entity_type) is not None
            for entity in records.entities
        )
        if requested_node_count > len(nodes):
            logger.info(
                "Graph for project %s was limited to %s nodes.", project_id, MAX_GRAPH_NODES
            )
        logger.info(
            "Built persisted graph for project %s (%s nodes, %s edges)",
            project_id,
            len(nodes),
            len(edges),
        )
        return ProjectGraphResponse(nodes=nodes, edges=edges)

    def get_project_graph_stats(self, project_id: int) -> ProjectGraphStatsResponse:
        """Return counts calculated from the same graph projection as the endpoint."""
        graph = self.build_project_graph(project_id)
        return ProjectGraphStatsResponse(
            nodes=len(graph.nodes),
            edges=len(graph.edges),
            files=sum(node.type == "file" for node in graph.nodes),
            functions=sum(node.type == "function" for node in graph.nodes),
            classes=sum(node.type == "class" for node in graph.nodes),
        )

    def build_focus_graph(
        self,
        project_id: int,
        *,
        file_id: int | None = None,
        entity_id: int | None = None,
        depth: int = 1,
    ) -> ProjectGraphResponse:
        """Return a focused graph, expanding file call chains through ``depth`` hops."""
        if file_id is not None and entity_id is not None:
            raise ValueError("Specify either file_id or entity_id, not both.")

        if file_id is None and entity_id is None:
            return self.build_project_graph(project_id)

        # A file focus must not be built from ``build_project_graph``: that
        # projection is deliberately globally capped, so its CALL endpoints
        # can be absent before this focused traversal even begins.
        if file_id is not None:
            return self._build_persisted_file_focus_graph(project_id, file_id, depth)

        graph = self.build_project_graph(project_id)

        node_id = (
            self._file_node_id(file_id)
            if file_id is not None
            else self._entity_node_id(entity_id)
        )
        nodes_by_id = {node.id: node for node in graph.nodes}
        if node_id not in nodes_by_id:
            raise GraphNodeNotFoundError("Graph focus target was not found.")

        adjacent_ids: dict[str, set[str]] = defaultdict(set)
        for edge in graph.edges:
            adjacent_ids[edge.source].add(edge.target)
            adjacent_ids[edge.target].add(edge.source)

        focus_node_ids = {node_id}
        frontier = {node_id}
        for _ in range(2):
            frontier = {
                adjacent
                for current in frontier
                for adjacent in adjacent_ids.get(current, set())
                if adjacent not in focus_node_ids
            }
            if not frontier:
                break
            focus_node_ids.update(frontier)

        focused_edges = [
            edge
            for edge in graph.edges
            if edge.source in focus_node_ids and edge.target in focus_node_ids
        ]
        return ProjectGraphResponse(
            nodes=[node for node in graph.nodes if node.id in focus_node_ids],
            edges=focused_edges,
        )

    @staticmethod
    def _build_file_focus_graph(
        graph: ProjectGraphResponse, file_node_id: str, depth: int
    ) -> ProjectGraphResponse:
        """Return one file's context and progressively wider call-chain horizon.

        Depth one intentionally includes no call edges: it is the compact file
        overview.  Each later depth adds one CALLS hop from the entities reached
        at the previous depth, keeping graph growth predictable for the canvas.
        """
        declared_entity_ids = {
            edge.target
            for edge in graph.edges
            if edge.type == "DECLARES" and edge.source == file_node_id
        }
        focused_edges = [
            edge
            for edge in graph.edges
            if (
                edge.type == "DECLARES" and edge.source == file_node_id
            )
            or (
                edge.type == "IMPORTS"
                and file_node_id in {edge.source, edge.target}
            )
        ]

        call_edges = [edge for edge in graph.edges if edge.type == "CALLS"]
        call_frontier = declared_entity_ids
        seen_call_edges: set[str] = set()
        for _ in range(1, depth):
            next_frontier: set[str] = set()
            for edge in call_edges:
                if edge.id in seen_call_edges:
                    continue
                if edge.source in call_frontier or edge.target in call_frontier:
                    focused_edges.append(edge)
                    seen_call_edges.add(edge.id)
                    next_frontier.update((edge.source, edge.target))
            # Only expand from entities newly discovered at this hop. This makes
            # depth 3 the next call-chain hop rather than a broad re-walk.
            call_frontier = next_frontier - declared_entity_ids
            if not call_frontier:
                break

        focused_node_ids = {file_node_id}
        for edge in focused_edges:
            focused_node_ids.update((edge.source, edge.target))

        return ProjectGraphResponse(
            nodes=[node for node in graph.nodes if node.id in focused_node_ids],
            edges=focused_edges,
        )

    def _build_persisted_file_focus_graph(
        self, project_id: int, file_id: int, depth: int
    ) -> ProjectGraphResponse:
        """Project one file's persisted neighborhood without the global graph cap.

        The returned records are intentionally loaded in two explicit CALLS
        hops: declarations in the selected file -> their direct targets -> one
        further outgoing hop.  This preserves the semantic meaning of depths
        1--3 and prevents unrelated calls from entering the result.
        """
        records = self._load_file_focus_records(project_id, file_id, depth)
        nodes: list[GraphNode] = []
        node_ids: set[str] = set()

        def add_node(node: GraphNode) -> None:
            if node.id not in node_ids:
                node_ids.add(node.id)
                nodes.append(node)

        for file_record in records.files:
            add_node(
                GraphNode(
                    id=self._file_node_id(file_record.id),
                    label=file_record.path,
                    type="file",
                )
            )
        for entity in records.entities:
            node_type = self._entity_node_type(entity.entity_type)
            if node_type is not None:
                add_node(
                    GraphNode(
                        id=self._entity_node_id(entity.id),
                        label=entity.name,
                        type=node_type,
                    )
                )

        edges: list[GraphEdge] = []
        edge_keys: set[tuple[str, str, str]] = set()

        def add_edge(
            edge_id: str,
            source: str,
            target: str,
            relationship_type: GraphRelationshipType,
        ) -> None:
            key = (source, target, relationship_type)
            if source not in node_ids or target not in node_ids or key in edge_keys:
                return
            edge_keys.add(key)
            edges.append(
                GraphEdge(
                    id=edge_id,
                    source=source,
                    target=target,
                    type=relationship_type,
                )
            )

        for relationship in records.file_relationships:
            add_edge(
                f"import_{relationship.source_file_id}_{relationship.target_file_id}",
                self._file_node_id(relationship.source_file_id),
                self._file_node_id(relationship.target_file_id),
                "IMPORTS",
            )
        for entity in records.entities:
            if entity.file_id == file_id and self._entity_node_type(entity.entity_type):
                add_edge(
                    f"declare_{file_id}_{entity.id}",
                    self._file_node_id(file_id),
                    self._entity_node_id(entity.id),
                    "DECLARES",
                )
        for relationship in records.entity_relationships:
            if relationship.relationship_type == "CALLS":
                add_edge(
                    f"call_{relationship.source_entity_id}_{relationship.target_entity_id}",
                    self._entity_node_id(relationship.source_entity_id),
                    self._entity_node_id(relationship.target_entity_id),
                    "CALLS",
                )

        return ProjectGraphResponse(nodes=nodes, edges=edges)

    @staticmethod
    def _load_file_focus_records(
        project_id: int, file_id: int, depth: int
    ) -> _ProjectGraphRecords:
        """Load one ownership-scoped file graph directly from PostgreSQL."""
        source_file = aliased(File)
        target_file = aliased(File)
        source_entity = aliased(CodeEntity)
        target_entity = aliased(CodeEntity)
        try:
            with SessionLocal() as session:
                if session.get(Project, project_id) is None:
                    raise GraphProjectNotFoundError("Project was not found.")
                selected_file = session.scalar(
                    select(File).where(File.id == file_id, File.project_id == project_id)
                )
                if selected_file is None:
                    raise GraphNodeNotFoundError("Graph focus target was not found.")

                file_relationships = list(
                    session.scalars(
                        select(FileRelationship)
                        .join(
                            source_file,
                            FileRelationship.source_file_id == source_file.id,
                        )
                        .join(
                            target_file,
                            FileRelationship.target_file_id == target_file.id,
                        )
                        .where(
                            FileRelationship.relationship_type == "IMPORTS",
                            source_file.project_id == project_id,
                            target_file.project_id == project_id,
                            or_(source_file.id == file_id, target_file.id == file_id),
                        )
                        .order_by(FileRelationship.id)
                    )
                )
                context_file_ids = {file_id}
                for relationship in file_relationships:
                    context_file_ids.update(
                        (relationship.source_file_id, relationship.target_file_id)
                    )
                files = list(
                    session.scalars(
                        select(File)
                        .where(File.project_id == project_id, File.id.in_(context_file_ids))
                        .order_by(File.path, File.id)
                    )
                )

                entity_relationships: list[EntityRelationship] = []
                direct_calls: list[EntityRelationship] = []
                if depth >= 2:
                    # Equivalent to selecting EntityRelationship joined to its
                    # source CodeEntity scoped to ``file_id``; joining targets
                    # too ensures malformed cross-project rows never leak.
                    direct_calls = list(
                        session.scalars(
                            select(EntityRelationship)
                            .join(
                                source_entity,
                                EntityRelationship.source_entity_id == source_entity.id,
                            )
                            .join(source_file, source_entity.file_id == source_file.id)
                            .join(
                                target_entity,
                                EntityRelationship.target_entity_id == target_entity.id,
                            )
                            .join(target_file, target_entity.file_id == target_file.id)
                            .where(
                                EntityRelationship.relationship_type == "CALLS",
                                source_file.id == file_id,
                                source_file.project_id == project_id,
                                target_file.project_id == project_id,
                            )
                            .order_by(EntityRelationship.id)
                        )
                    )
                    entity_relationships.extend(direct_calls)

                if depth >= 3 and direct_calls:
                    direct_target_ids = {
                        relationship.target_entity_id for relationship in direct_calls
                    }
                    second_hop_calls = list(
                        session.scalars(
                            select(EntityRelationship)
                            .join(
                                source_entity,
                                EntityRelationship.source_entity_id == source_entity.id,
                            )
                            .join(source_file, source_entity.file_id == source_file.id)
                            .join(
                                target_entity,
                                EntityRelationship.target_entity_id == target_entity.id,
                            )
                            .join(target_file, target_entity.file_id == target_file.id)
                            .where(
                                EntityRelationship.relationship_type == "CALLS",
                                source_entity.id.in_(direct_target_ids),
                                source_file.project_id == project_id,
                                target_file.project_id == project_id,
                            )
                            .order_by(EntityRelationship.id)
                        )
                    )
                    entity_relationships.extend(second_hop_calls)

                entity_ids = {
                    entity.id
                    for entity in session.scalars(
                        select(CodeEntity).where(CodeEntity.file_id == file_id)
                    )
                }
                for relationship in entity_relationships:
                    entity_ids.update(
                        (relationship.source_entity_id, relationship.target_entity_id)
                    )
                entities = list(
                    session.scalars(
                        select(CodeEntity)
                        .join(File, CodeEntity.file_id == File.id)
                        .where(
                            File.project_id == project_id,
                            CodeEntity.id.in_(entity_ids),
                        )
                        .order_by(CodeEntity.id)
                    )
                )
                return _ProjectGraphRecords(
                    files=files,
                    entities=entities,
                    file_relationships=file_relationships,
                    entity_relationships=entity_relationships,
                )
        except (GraphProjectNotFoundError, GraphNodeNotFoundError):
            raise
        except SQLAlchemyError as error:
            logger.exception("Could not load focused graph data for project %s", project_id)
            raise GraphServiceError("Could not load the requested focus graph.") from error

    def search_project_graph_nodes(
        self, project_id: int, query: str, limit: int = 10
    ) -> list[GraphNode]:
        """Return a bounded set of matching files and declarations."""
        normalized_query = query.strip().casefold()
        if not normalized_query:
            return []
        return [
            node
            for node in self.build_project_graph(project_id).nodes
            if normalized_query in node.label.casefold()
        ][:limit]

    @staticmethod
    def _load_project_graph(project_id: int) -> _ProjectGraphRecords:
        try:
            with SessionLocal() as session:
                if session.get(Project, project_id) is None:
                    raise GraphProjectNotFoundError("Project was not found.")
                files = list(
                    session.scalars(
                        select(File)
                        .where(File.project_id == project_id)
                        .order_by(File.path, File.id)
                    )
                )
                entities = list(
                    session.scalars(
                        select(CodeEntity)
                        .join(File, CodeEntity.file_id == File.id)
                        .where(File.project_id == project_id)
                        .order_by(CodeEntity.id)
                    )
                )
                file_relationships = list(
                    session.scalars(
                        select(FileRelationship)
                        .join(File, FileRelationship.source_file_id == File.id)
                        .where(File.project_id == project_id)
                        .order_by(FileRelationship.id)
                    )
                )
                entity_relationships = list(
                    session.scalars(
                        select(EntityRelationship)
                        .join(
                            CodeEntity,
                            EntityRelationship.source_entity_id == CodeEntity.id,
                        )
                        .join(File, CodeEntity.file_id == File.id)
                        .where(File.project_id == project_id)
                        .order_by(EntityRelationship.id)
                    )
                )
                return _ProjectGraphRecords(
                    files=files,
                    entities=entities,
                    file_relationships=file_relationships,
                    entity_relationships=entity_relationships,
                )
        except GraphProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception("Could not load graph data for project %s", project_id)
            raise GraphServiceError("Could not load the requested project graph.") from error

    @staticmethod
    def _entity_node_type(entity_type: str) -> str | None:
        return entity_type if entity_type in {"function", "class", "variable"} else None

    @staticmethod
    def _file_node_id(file_id: int) -> str:
        return f"file_{file_id}"

    @staticmethod
    def _entity_node_id(entity_id: int) -> str:
        return f"entity_{entity_id}"
