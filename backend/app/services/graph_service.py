"""Read-only graph projection for a scanned project."""

import logging
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.schemas.graph import (
    GraphEdge,
    GraphNode,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)
from app.schemas.relationships import Relationship
from app.services.parser_service import (
    ParsedFile,
    ParsedNode,
    ParserService,
    ParserServiceError,
)

logger = logging.getLogger(__name__)


class GraphServiceError(Exception):
    """Base error raised while assembling a project graph."""


class GraphProjectNotFoundError(GraphServiceError):
    """Raised when a graph is requested for a missing project."""


@dataclass(frozen=True)
class _ProjectFiles:
    """The project and inventory records needed for graph construction."""

    project: Project
    files: list[File]


class GraphService:
    """Build a graph from persisted inventory and existing analysis services.

    Symbol and relationship analysis is intentionally read-only: the current
    application persists project/file inventory but does not have separate
    symbol or relationship tables. Reusing ``ParserService`` keeps this graph
    consistent with the existing AST endpoint without changing that pipeline.
    """

    def build_project_graph(self, project_id: int) -> ProjectGraphResponse:
        """Return all graph nodes and edges available for a project."""
        project_files = self._load_project_files(project_id)
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []
        node_ids: set[str] = set()
        edge_keys: set[tuple[str, str, str]] = set()
        symbols_by_name: dict[str, list[str]] = defaultdict(list)
        extracted_relationships: list[tuple[str, list[Relationship]]] = []
        parser_service = ParserService()

        for file_record in project_files.files:
            file_node_id = self._file_node_id(file_record.id)
            self._add_node(
                nodes,
                node_ids,
                GraphNode(
                    id=file_node_id,
                    label=file_record.path,
                    type="file",
                    file_id=file_record.id,
                    project_id=project_id,
                ),
            )

            source_path = self._source_path(project_files.project, file_record)
            if source_path is None:
                continue

            try:
                parsed_file = parser_service.parse_file(source_path)
            except ParserServiceError as error:
                logger.info(
                    "Skipping graph analysis for project %s file %s: %s",
                    project_id,
                    file_record.path,
                    error,
                )
                continue
            except OSError:
                logger.exception(
                    "Unexpected filesystem error while analyzing project %s file %s",
                    project_id,
                    file_record.path,
                )
                continue

            self._add_import_nodes(
                project_id,
                file_record,
                file_node_id,
                parsed_file.imports,
                nodes,
                node_ids,
                edges,
                edge_keys,
            )
            self._add_declaration_nodes(
                project_id,
                file_record,
                file_node_id,
                parsed_file,
                nodes,
                node_ids,
                edges,
                edge_keys,
                symbols_by_name,
            )
            extracted_relationships.append((file_node_id, parsed_file.relationships))

        # Resolve relationships after all files have contributed their symbols so
        # cross-file references can be represented as graph edges.
        for file_node_id, relationships in extracted_relationships:
            self._add_extracted_relationships(
                relationships, symbols_by_name, file_node_id, edges, edge_keys
            )

        logger.info(
            "Built graph for project %s (%s nodes, %s edges)",
            project_id,
            len(nodes),
            len(edges),
        )
        return ProjectGraphResponse(nodes=nodes, edges=edges)

    def get_project_graph_stats(self, project_id: int) -> ProjectGraphStatsResponse:
        """Return counts calculated from the same projection as the graph endpoint."""
        graph = self.build_project_graph(project_id)
        return ProjectGraphStatsResponse(
            nodes=len(graph.nodes),
            edges=len(graph.edges),
            files=sum(node.type == "file" for node in graph.nodes),
            functions=sum(node.type == "function" for node in graph.nodes),
            classes=sum(node.type == "class" for node in graph.nodes),
        )

    @staticmethod
    def _load_project_files(project_id: int) -> _ProjectFiles:
        try:
            with SessionLocal() as session:
                project = session.get(Project, project_id)
                if project is None:
                    raise GraphProjectNotFoundError("Project was not found.")
                files = list(
                    session.scalars(
                        select(File)
                        .where(File.project_id == project_id)
                        .order_by(File.path, File.id)
                    )
                )
                # Detach fields needed outside the session without retaining DB state.
                session.expunge(project)
                for file_record in files:
                    session.expunge(file_record)
                return _ProjectFiles(project=project, files=files)
        except GraphProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception("Could not load graph data for project %s", project_id)
            raise GraphServiceError("Could not load the requested project graph.") from error

    @staticmethod
    def _source_path(project: Project, file_record: File) -> Path | None:
        """Safely resolve a stored relative file path under its project root."""
        if not project.local_path:
            logger.warning("Project %s has no repository path", project.id)
            return None

        repository_root = Path(project.local_path).resolve()
        persisted_path = Path(file_record.path)
        source_path = (
            persisted_path.resolve()
            if persisted_path.is_absolute()
            else (repository_root / persisted_path).resolve()
        )
        if not source_path.is_relative_to(repository_root):
            logger.warning(
                "Skipping invalid stored path for project %s file %s",
                project.id,
                file_record.id,
            )
            return None
        return source_path

    @staticmethod
    def _add_import_nodes(
        project_id: int,
        file_record: File,
        file_node_id: str,
        imports: list[ParsedNode],
        nodes: list[GraphNode],
        node_ids: set[str],
        edges: list[GraphEdge],
        edge_keys: set[tuple[str, str, str]],
    ) -> None:
        for imported_module in imports:
            module_label = imported_module.name.strip("'\"")
            if not module_label:
                continue
            module_node_id = f"module:{file_record.id}:{module_label}"
            GraphService._add_node(
                nodes,
                node_ids,
                GraphNode(
                    id=module_node_id,
                    label=module_label,
                    type="module",
                    file_id=file_record.id,
                    project_id=project_id,
                ),
            )
            GraphService._add_edge(
                edges,
                edge_keys,
                GraphEdge(
                    source=file_node_id,
                    target=module_node_id,
                    relationship="IMPORTS",
                ),
            )

    @staticmethod
    def _add_declaration_nodes(
        project_id: int,
        file_record: File,
        file_node_id: str,
        parsed_file: ParsedFile,
        nodes: list[GraphNode],
        node_ids: set[str],
        edges: list[GraphEdge],
        edge_keys: set[tuple[str, str, str]],
        symbols_by_name: dict[str, list[str]],
    ) -> None:
        declarations = (
            ("class", parsed_file.classes),
            ("function", parsed_file.functions),
            ("method", parsed_file.methods),
        )
        for node_type, parsed_nodes in declarations:
            for parsed_node in parsed_nodes:
                node_id = (
                    f"symbol:{file_record.id}:{node_type}:"
                    f"{parsed_node.start_line}:{parsed_node.name}"
                )
                GraphService._add_node(
                    nodes,
                    node_ids,
                    GraphNode(
                        id=node_id,
                        label=parsed_node.name,
                        type=node_type,
                        file_id=file_record.id,
                        project_id=project_id,
                    ),
                )
                symbols_by_name[parsed_node.name].append(node_id)
                GraphService._add_edge(
                    edges,
                    edge_keys,
                    GraphEdge(source=file_node_id, target=node_id, relationship="CONTAINS"),
                )

        for variable_name in parsed_file.symbols.variables:
            node_id = f"symbol:{file_record.id}:variable:{variable_name}"
            GraphService._add_node(
                nodes,
                node_ids,
                GraphNode(
                    id=node_id,
                    label=variable_name,
                    type="variable",
                    file_id=file_record.id,
                    project_id=project_id,
                ),
            )
            symbols_by_name[variable_name].append(node_id)
            GraphService._add_edge(
                edges,
                edge_keys,
                GraphEdge(source=file_node_id, target=node_id, relationship="CONTAINS"),
            )

    @staticmethod
    def _add_extracted_relationships(
        relationships: list[Relationship],
        symbols_by_name: dict[str, list[str]],
        file_node_id: str,
        edges: list[GraphEdge],
        edge_keys: set[tuple[str, str, str]],
    ) -> None:
        supported_relationships = {
            "CALLS",
            "HAS_METHOD",
            "EXTENDS",
        }
        for relationship in relationships:
            if relationship.relationship not in supported_relationships:
                continue
            # The existing extractor records calls from the source file rather
            # than a containing function, while class relationships are
            # symbol-to-symbol.
            source_ids = (
                [file_node_id]
                if relationship.relationship == "CALLS"
                else symbols_by_name.get(relationship.source, [])
            )
            target_ids = symbols_by_name.get(relationship.target, [])
            if not source_ids or not target_ids:
                logger.debug(
                    "Skipping unresolved %s relationship %s -> %s",
                    relationship.relationship,
                    relationship.source,
                    relationship.target,
                )
                continue
            GraphService._add_edge(
                edges,
                edge_keys,
                GraphEdge(
                    source=source_ids[0],
                    target=target_ids[0],
                    relationship=relationship.relationship,
                ),
            )

        # Existing extraction reports exports as symbol-to-file EXPORTED_BY.
        for relationship in relationships:
            if relationship.relationship != "EXPORTED_BY":
                continue
            source_ids = symbols_by_name.get(relationship.source, [])
            if source_ids:
                GraphService._add_edge(
                    edges,
                    edge_keys,
                    GraphEdge(
                        source=source_ids[0],
                        target=file_node_id,
                        relationship="EXPORTS",
                    ),
                )

    @staticmethod
    def _add_node(
        nodes: list[GraphNode], node_ids: set[str], node: GraphNode
    ) -> None:
        if node.id not in node_ids:
            node_ids.add(node.id)
            nodes.append(node)

    @staticmethod
    def _add_edge(
        edges: list[GraphEdge],
        edge_keys: set[tuple[str, str, str]],
        edge: GraphEdge,
    ) -> None:
        key = (edge.source, edge.target, edge.relationship)
        if key not in edge_keys:
            edge_keys.add(key)
            edges.append(edge)

    @staticmethod
    def _file_node_id(file_id: int) -> str:
        return f"file:{file_id}"
