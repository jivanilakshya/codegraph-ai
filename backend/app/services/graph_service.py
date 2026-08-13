"""Read-only PostgreSQL projection for a scanned project's code graph."""

import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.project import Project
from app.models.relationship import FileRelationship
from app.schemas.graph import (
    GraphEdge,
    GraphNode,
    GraphNodeType,
    GraphRelationshipType,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)

logger = logging.getLogger(__name__)

VALID_NODE_TYPES: set[GraphNodeType] = {"file", "function", "class", "variable"}
VALID_RELATIONSHIP_TYPES: set[GraphRelationshipType] = {"IMPORTS", "DECLARES", "CALLS"}


class GraphServiceError(Exception):
    """Base error raised while assembling a project graph."""


class GraphProjectNotFoundError(GraphServiceError):
    """Raised when a graph is requested for a missing project."""


@dataclass(frozen=True)
class _ProjectGraphRecords:
    files: list[File]
    entities: list[CodeEntity]
    file_relationships: list[FileRelationship]
    entity_relationships: list[EntityRelationship]


class GraphService:
    """Build a complete graph from persisted repository-analysis records."""

    def build_project_graph(self, project_id: int) -> ProjectGraphResponse:
        """Return files, supported entities, and only fully-resolved relationships."""
        records = self._load_project_graph(project_id)
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

        logger.info(
            "Built persisted graph for project %s (%s nodes, %s edges)",
            project_id,
            len(nodes),
            len(edges),
        )
        return self._validate_graph_integrity(
            ProjectGraphResponse(nodes=nodes, edges=edges)
        )

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
    def _validate_graph_integrity(graph: ProjectGraphResponse) -> ProjectGraphResponse:
        """Ensure the graph is internally consistent before returning it."""
        node_ids: set[str] = set()
        for node in graph.nodes:
            if node.id in node_ids:
                raise GraphServiceError(f"Duplicate node ID: {node.id}")
            if node.type not in VALID_NODE_TYPES:
                raise GraphServiceError(f"Invalid node type: {node.type}")
            node_ids.add(node.id)

        edge_ids: set[str] = set()
        edge_keys: set[tuple[str, str, str]] = set()
        for edge in graph.edges:
            if edge.id in edge_ids:
                raise GraphServiceError(f"Duplicate edge ID: {edge.id}")
            relationship_key = (edge.source, edge.target, edge.type)
            if relationship_key in edge_keys:
                raise GraphServiceError(
                    f"Duplicate relationship: {edge.source} -> {edge.target} ({edge.type})"
                )
            if edge.type not in VALID_RELATIONSHIP_TYPES:
                raise GraphServiceError(f"Invalid relationship type: {edge.type}")
            if edge.source not in node_ids:
                raise GraphServiceError(f"Edge source not found: {edge.source}")
            if edge.target not in node_ids:
                raise GraphServiceError(f"Edge target not found: {edge.target}")
            edge_ids.add(edge.id)
            edge_keys.add(relationship_key)

        return graph

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
