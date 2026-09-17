"""Read-only Neo4j projection for a scanned project's code graph."""

import logging
from collections import defaultdict
from typing import Any

from app.database.neo4j import get_driver
from app.schemas.graph import (
    GraphEdge,
    GraphNode,
    GraphNodeType,
    GraphRelationshipType,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)

logger = logging.getLogger(__name__)

# The overview is deliberately capped before it reaches the browser.  Search
# and focus have separate reads, so a node outside this overview remains
# discoverable and can still be explored.
MAX_COMPLETE_GRAPH_NODES = 500
MAX_COMPLETE_GRAPH_EDGES = 1_000
MAX_FOCUS_GRAPH_NODES = 500
MAX_FOCUS_GRAPH_EDGES = 1_000

VALID_NODE_TYPES: set[GraphNodeType] = {
    "project",
    "module",
    "api_route",
    "file",
    "function",
    "class",
    "method",
    "variable",
}
VALID_RELATIONSHIP_TYPES: set[GraphRelationshipType] = {
    "CONTAINS",
    "IMPORTS",
    "DECLARES",
    "CALLS",
    "EXTENDS",
    "HAS_METHOD",
    "HANDLES",
}


class GraphServiceError(Exception):
    """Base error raised while reading a project graph."""


class GraphProjectNotFoundError(GraphServiceError):
    """Raised when a graph is requested for a project missing from Neo4j."""


class GraphNodeNotFoundError(GraphServiceError):
    """Raised when a focus graph is requested for an unknown node."""


class GraphService:
    """Build graph API responses from the Neo4j project projection."""

    _PROJECT_QUERY = """
        MATCH (project:Project {project_id: $project_id})
        RETURN project.project_id AS project_id
        LIMIT 1
    """

    _NODES_QUERY = """
        CALL {
            MATCH (project:Project {project_id: $project_id})
            RETURN 'project' AS node_type, toString(project.project_id) AS node_id,
                   project.name AS label, 0 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (route:ApiRoute {project_id: $project_id})
            RETURN 'api_route' AS node_type, route.route_id AS node_id,
                   route.method + ' ' + route.path AS label, 3 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (module:Module {project_id: $project_id})
            RETURN 'module' AS node_type, module.path AS node_id,
                   module.path AS label, 1 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (file:CodeFile {project_id: $project_id})
            RETURN 'file' AS node_type, toString(file.file_id) AS node_id,
                   file.path AS label, 2 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (:CodeFile {project_id: $project_id})-[:DECLARES]->
                (entity:CodeEntity {project_id: $project_id})
            WHERE entity.entity_type IN ['function', 'class', 'method', 'variable']
            RETURN entity.entity_type AS node_type, toString(entity.entity_id) AS node_id,
                   entity.name AS label, 4 AS sort_order
        }
        RETURN DISTINCT node_type, node_id, label, sort_order
        ORDER BY sort_order, node_id
        LIMIT $limit
    """

    _EDGES_QUERY = """
        CALL {
            MATCH (source {project_id: $project_id})-[relationship:CONTAINS]->
                (target {project_id: $project_id})
            WHERE (source:Project OR source:Module)
              AND (target:Module OR target:CodeFile)
              AND CASE WHEN source:Project THEN 'project_' + toString(source.project_id) IN $node_ids
                       ELSE 'module_' + source.path IN $node_ids END
              AND CASE WHEN target:Module THEN 'module_' + target.path IN $node_ids
                       ELSE 'file_' + toString(target.file_id) IN $node_ids END
            RETURN 'CONTAINS' AS relationship_type,
                   CASE WHEN source:Project THEN 'project_' + toString(source.project_id)
                        ELSE 'module_' + source.path END AS source_node_id,
                   CASE WHEN target:Module THEN 'module_' + target.path
                        ELSE 'file_' + toString(target.file_id) END AS target_node_id,
                   0 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (source:CodeFile {project_id: $project_id})-[:CONTAINS]->(target:ApiRoute {project_id: $project_id})
            WHERE 'file_' + toString(source.file_id) IN $node_ids AND 'api_route_' + target.route_id IN $node_ids
            RETURN 'CONTAINS' AS relationship_type, 'file_' + toString(source.file_id) AS source_node_id,
                   'api_route_' + target.route_id AS target_node_id, 3 AS sort_order
            UNION
            MATCH (source:ApiRoute {project_id: $project_id})-[:HANDLES]->(target:CodeEntity {project_id: $project_id})
            WHERE 'api_route_' + source.route_id IN $node_ids AND 'entity_' + toString(target.entity_id) IN $node_ids
            RETURN 'HANDLES' AS relationship_type, 'api_route_' + source.route_id AS source_node_id,
                   'entity_' + toString(target.entity_id) AS target_node_id, 4 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (source:CodeFile {project_id: $project_id})-[relationship:IMPORTS]->
                (target:CodeFile {project_id: $project_id})
            WHERE source.file_id IN $file_ids
              AND target.file_id IN $file_ids
            RETURN 'IMPORTS' AS relationship_type,
                   'file_' + toString(source.file_id) AS source_node_id,
                   'file_' + toString(target.file_id) AS target_node_id, 5 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (source:CodeFile {project_id: $project_id})-[:DECLARES]->
                (target:CodeEntity {project_id: $project_id})
            WHERE target.entity_type IN ['function', 'class', 'method', 'variable']
              AND source.file_id IN $file_ids
              AND target.entity_id IN $entity_ids
            RETURN 'DECLARES' AS relationship_type,
                   'file_' + toString(source.file_id) AS source_node_id,
                   'entity_' + toString(target.entity_id) AS target_node_id, 6 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (:CodeFile {project_id: $project_id})-[:DECLARES]->
                (source:CodeEntity {project_id: $project_id})-[relationship]->
                (target:CodeEntity {project_id: $project_id})
            WHERE source.entity_type IN ['function', 'class', 'method', 'variable']
              AND target.entity_type IN ['function', 'class', 'method', 'variable']
              AND source.entity_id IN $entity_ids
              AND target.entity_id IN $entity_ids
              AND type(relationship) IN ['CALLS', 'EXTENDS', 'HAS_METHOD']
            RETURN type(relationship) AS relationship_type,
                   'entity_' + toString(source.entity_id) AS source_node_id,
                   'entity_' + toString(target.entity_id) AS target_node_id, 7 AS sort_order
        }
        RETURN DISTINCT relationship_type, source_node_id, target_node_id, sort_order
        ORDER BY sort_order, source_node_id, target_node_id
        LIMIT $limit
    """

    _FOCUS_NODES_QUERY = """
        MATCH (start {project_id: $project_id})
        WHERE (start:Project AND $project_root)
           OR (start:Module AND start.path = $module_path)
           OR (start:ApiRoute AND start.route_id = $route_id)
           OR (start:CodeFile AND start.file_id = $file_id)
           OR (start:CodeEntity AND start.entity_id = $entity_id)
        MATCH path = (start)-[rels*0..%d]-(node)
        WHERE node.project_id = $project_id
          AND all(relationship IN rels WHERE type(relationship) IN
              CASE WHEN start:Project OR start:Module
                   THEN ['CONTAINS', 'IMPORTS', 'DECLARES', 'CALLS', 'EXTENDS', 'HAS_METHOD', 'HANDLES']
                   ELSE ['IMPORTS', 'DECLARES', 'CALLS', 'EXTENDS', 'HAS_METHOD', 'HANDLES'] END)
          AND (
              node:Project
              OR node:Module
              OR node:CodeFile OR node:ApiRoute
              OR (node:CodeEntity AND node.entity_type IN ['function', 'class', 'method', 'variable'])
          )
        WITH DISTINCT node,
             CASE WHEN node:Project THEN 'project' WHEN node:Module THEN 'module' WHEN node:ApiRoute THEN 'api_route'
                  WHEN node:CodeFile THEN 'file' ELSE node.entity_type END AS node_type,
             CASE WHEN node:Project THEN toString(node.project_id) WHEN node:Module THEN node.path WHEN node:ApiRoute THEN node.route_id
                  WHEN node:CodeFile THEN toString(node.file_id) ELSE toString(node.entity_id) END AS node_id,
             CASE WHEN node:Project THEN node.name WHEN node:Module THEN node.path WHEN node:ApiRoute THEN node.method + ' ' + node.path
                  WHEN node:CodeFile THEN node.path ELSE node.name END AS label,
             CASE WHEN node:Project THEN 0 WHEN node:Module THEN 1 WHEN node:CodeFile THEN 2 WHEN node:ApiRoute THEN 3 ELSE 4 END AS sort_order
        RETURN node_type, node_id, label, sort_order
        ORDER BY sort_order, node_id
        LIMIT $limit
    """

    _STATS_QUERY = """
        MATCH (project:Project {project_id: $project_id})
        CALL {
            WITH project
            MATCH (project)-[:CONTAINS*]->(file:CodeFile {project_id: $project_id})
            RETURN count(DISTINCT file) AS files
        }
        CALL {
            WITH project
            MATCH (project)-[:CONTAINS*]->(:CodeFile {project_id: $project_id})-[:DECLARES]->
                (entity:CodeEntity {project_id: $project_id})
            WHERE entity.entity_type IN ['function', 'class', 'method', 'variable']
            RETURN count(DISTINCT entity) AS entities,
                   count(DISTINCT CASE WHEN entity.entity_type = 'function' THEN entity END) AS functions,
                   count(DISTINCT CASE WHEN entity.entity_type = 'class' THEN entity END) AS classes
        }
        CALL {
            WITH project
            CALL {
                WITH project
                MATCH (project)-[:CONTAINS*]->(source:CodeFile {project_id: $project_id})-
                    [relationship:IMPORTS]->(target:CodeFile {project_id: $project_id})
                RETURN count(DISTINCT relationship) AS edge_count
                UNION ALL
                WITH project
                MATCH (project)-[:CONTAINS*]->(source:CodeFile {project_id: $project_id})-
                    [relationship:DECLARES]->(target:CodeEntity {project_id: $project_id})
                WHERE target.entity_type IN ['function', 'class', 'method', 'variable']
                RETURN count(DISTINCT relationship) AS edge_count
                UNION ALL
                WITH project
                MATCH (project)-[:CONTAINS*]->(:CodeFile {project_id: $project_id})-[:DECLARES]->
                    (source:CodeEntity {project_id: $project_id})-[relationship]->
                    (target:CodeEntity {project_id: $project_id})
                WHERE source.entity_type IN ['function', 'class', 'method', 'variable']
                  AND target.entity_type IN ['function', 'class', 'method', 'variable']
                  AND type(relationship) IN ['CALLS', 'EXTENDS', 'HAS_METHOD']
                RETURN count(DISTINCT relationship) AS edge_count
            }
            RETURN sum(edge_count) AS edges
        }
        RETURN files, entities, functions, classes, edges
    """

    _SEARCH_QUERY = """
        CALL {
            MATCH (project:Project {project_id: $project_id})
            WHERE toLower(project.name) CONTAINS $search_query
            RETURN 'project' AS node_type, toString(project.project_id) AS node_id,
                   project.name AS label, 0 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (module:Module {project_id: $project_id})
            WHERE toLower(module.path) CONTAINS $search_query
            RETURN 'module' AS node_type, module.path AS node_id,
                   module.path AS label, 1 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (file:CodeFile {project_id: $project_id})
            WHERE toLower(file.path) CONTAINS $search_query
            RETURN 'file' AS node_type, toString(file.file_id) AS node_id,
                   file.path AS label, 2 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (route:ApiRoute {project_id: $project_id})
            WHERE toLower(route.path) CONTAINS $search_query
               OR toLower(route.method + ' ' + route.path) CONTAINS $search_query
            RETURN 'api_route' AS node_type, route.route_id AS node_id,
                   route.method + ' ' + route.path AS label, 3 AS sort_order
            UNION
            MATCH (:Project {project_id: $project_id})-[:CONTAINS*]->
                (:CodeFile {project_id: $project_id})-[:DECLARES]->
                (entity:CodeEntity {project_id: $project_id})
            WHERE entity.entity_type IN ['function', 'class', 'method', 'variable']
              AND toLower(entity.name) CONTAINS $search_query
            RETURN entity.entity_type AS node_type, toString(entity.entity_id) AS node_id,
                   entity.name AS label, 4 AS sort_order
        }
        RETURN DISTINCT node_type, node_id, label, sort_order
        ORDER BY sort_order, node_id
        LIMIT $limit
    """

    def build_project_graph(self, project_id: int) -> ProjectGraphResponse:
        """Return the bounded, project-scoped Neo4j graph overview."""
        try:
            with get_driver().session() as session:
                graph = session.execute_read(self._read_bounded_project_graph, project_id)
        except GraphProjectNotFoundError:
            raise
        except Exception as error:
            logger.exception("Could not load Neo4j graph data for project %s", project_id)
            raise GraphServiceError("Could not load the requested project graph.") from error

        logger.info(
            "Built bounded Neo4j graph for project %s (%s nodes, %s edges, truncated=%s)",
            project_id,
            len(graph.nodes),
            len(graph.edges),
            graph.truncated,
        )
        return self._validate_graph_integrity(graph)

    def get_project_graph_stats(self, project_id: int) -> ProjectGraphStatsResponse:
        """Return uncapped aggregate counts for a project's graph projection."""
        try:
            with get_driver().session() as session:
                return session.execute_read(self._read_project_graph_stats, project_id)
        except GraphProjectNotFoundError:
            raise
        except Exception as error:
            logger.exception("Could not load Neo4j graph statistics for project %s", project_id)
            raise GraphServiceError("Could not load the requested project graph statistics.") from error

    def search_project_graph_nodes(
        self, project_id: int, query: str, limit: int = 10
    ) -> list[GraphNode]:
        """Return bounded, case-insensitive Neo4j node matches."""
        normalized_query = query.strip().casefold()
        if not normalized_query:
            return []
        try:
            with get_driver().session() as session:
                return session.execute_read(
                    self._search_project_graph_nodes, project_id, normalized_query, limit
                )
        except GraphProjectNotFoundError:
            raise
        except Exception as error:
            logger.exception("Could not search Neo4j graph nodes for project %s", project_id)
            raise GraphServiceError("Could not search the requested project graph.") from error

    def build_focus_graph(
        self,
        project_id: int,
        *,
        file_id: int | None = None,
        entity_id: int | None = None,
        module_path: str | None = None,
        route_id: str | None = None,
        project_root: bool = False,
        depth: int = 1,
    ) -> ProjectGraphResponse:
        """Return a bounded focus subgraph without depending on the overview."""
        target_count = sum(
            value is not None for value in (file_id, entity_id, module_path, route_id)
        ) + int(project_root)
        if target_count > 1:
            raise ValueError("Specify only one graph focus target.")

        if target_count == 0:
            return self.build_project_graph(project_id)

        try:
            with get_driver().session() as session:
                graph = session.execute_read(
                    self._read_focus_graph,
                    project_id,
                    file_id,
                    entity_id,
                    module_path,
                    route_id,
                    project_root,
                    depth,
                )
        except (GraphProjectNotFoundError, GraphNodeNotFoundError):
            raise
        except Exception as error:
            logger.exception("Could not load focused Neo4j graph data for project %s", project_id)
            raise GraphServiceError("Could not load the requested focus graph.") from error

        return self._validate_graph_integrity(graph)

    @staticmethod
    def _build_neighborhood_graph(
        graph: ProjectGraphResponse, node_id: str, depth: int
    ) -> ProjectGraphResponse:
        """Return the induced subgraph within ``depth`` undirected graph hops."""
        adjacent_ids: dict[str, set[str]] = defaultdict(set)
        for edge in graph.edges:
            adjacent_ids[edge.source].add(edge.target)
            adjacent_ids[edge.target].add(edge.source)

        focus_node_ids = {node_id}
        frontier = {node_id}
        for _ in range(depth):
            frontier = {
                adjacent
                for current in frontier
                for adjacent in adjacent_ids.get(current, set())
                if adjacent not in focus_node_ids
            }
            if not frontier:
                break
            focus_node_ids.update(frontier)

        return GraphService._graph_for_node_ids(graph, focus_node_ids)

    @classmethod
    def _read_bounded_project_graph(
        cls, transaction: Any, project_id: int
    ) -> ProjectGraphResponse:
        cls._require_project(transaction, project_id)
        node_records = list(
            transaction.run(
                cls._NODES_QUERY,
                project_id=project_id,
                limit=MAX_COMPLETE_GRAPH_NODES + 1,
            )
        )
        nodes = [
            cls._node_from_record(record)
            for record in node_records[:MAX_COMPLETE_GRAPH_NODES]
        ]
        edges, edges_truncated = cls._read_edges_for_nodes(
            transaction,
            project_id,
            nodes,
            MAX_COMPLETE_GRAPH_EDGES,
        )
        return ProjectGraphResponse(
            nodes=nodes,
            edges=edges,
            truncated=len(node_records) > MAX_COMPLETE_GRAPH_NODES or edges_truncated,
        )

    @classmethod
    def _read_project_graph_stats(
        cls, transaction: Any, project_id: int
    ) -> ProjectGraphStatsResponse:
        cls._require_project(transaction, project_id)
        record = transaction.run(cls._STATS_QUERY, project_id=project_id).single()
        return ProjectGraphStatsResponse(
            nodes=record["files"] + record["entities"],
            edges=record["edges"],
            files=record["files"],
            functions=record["functions"],
            classes=record["classes"],
        )

    @classmethod
    def _read_focus_graph(
        cls,
        transaction: Any,
        project_id: int,
        file_id: int | None,
        entity_id: int | None,
        module_path: str | None,
        route_id: str | None,
        project_root: bool,
        depth: int,
    ) -> ProjectGraphResponse:
        cls._require_project(transaction, project_id)
        node_records = list(
            transaction.run(
                cls._FOCUS_NODES_QUERY % depth,
                project_id=project_id,
                file_id=file_id,
                entity_id=entity_id,
                module_path=module_path,
                route_id=route_id,
                project_root=project_root,
                limit=MAX_FOCUS_GRAPH_NODES + 1,
            )
        )
        if not node_records:
            raise GraphNodeNotFoundError("Graph focus target was not found.")

        nodes = [
            cls._node_from_record(record)
            for record in node_records[:MAX_FOCUS_GRAPH_NODES]
        ]
        edges, edges_truncated = cls._read_edges_for_nodes(
            transaction,
            project_id,
            nodes,
            MAX_FOCUS_GRAPH_EDGES,
        )
        return ProjectGraphResponse(
            nodes=nodes,
            edges=edges,
            truncated=len(node_records) > MAX_FOCUS_GRAPH_NODES or edges_truncated,
        )

    @classmethod
    def _read_edges_for_nodes(
        cls,
        transaction: Any,
        project_id: int,
        nodes: list[GraphNode],
        edge_limit: int,
    ) -> tuple[list[GraphEdge], bool]:
        file_ids = [int(node.id.removeprefix("file_")) for node in nodes if node.type == "file"]
        entity_ids = [
            int(node.id.removeprefix("entity_"))
            for node in nodes
            if node.type in {"function", "class", "method", "variable"}
        ]
        node_ids = [node.id for node in nodes]
        edge_records = list(
            transaction.run(
                cls._EDGES_QUERY,
                project_id=project_id,
                file_ids=file_ids,
                entity_ids=entity_ids,
                node_ids=node_ids,
                limit=edge_limit + 1,
            )
        )
        returned_node_ids = {node.id for node in nodes}
        edges = [
            cls._edge_from_record(index, record)
            for index, record in enumerate(edge_records[:edge_limit], start=1)
        ]
        # The Cypher predicates keep endpoints in scope; retain this guard to
        # make malformed external graph data unable to escape project bounds.
        edges = [
            edge
            for edge in edges
            if edge.source in returned_node_ids and edge.target in returned_node_ids
        ]
        return edges, len(edge_records) > edge_limit

    @classmethod
    def _search_project_graph_nodes(
        cls, transaction: Any, project_id: int, query: str, limit: int
    ) -> list[GraphNode]:
        cls._require_project(transaction, project_id)
        return [
            cls._node_from_record(record)
            for record in transaction.run(
                cls._SEARCH_QUERY,
                project_id=project_id,
                search_query=query,
                limit=limit,
            )
        ]

    @classmethod
    def _require_project(cls, transaction: Any, project_id: int) -> None:
        if transaction.run(cls._PROJECT_QUERY, project_id=project_id).single() is None:
            raise GraphProjectNotFoundError("Project was not found.")

    @staticmethod
    def _node_from_record(record: Any) -> GraphNode:
        node_type = record["node_type"]
        node_id = record["node_id"]
        if node_type == "project":
            return GraphNode(
                id=GraphService._project_node_id(int(node_id)),
                label=record["label"],
                type="project",
            )
        if node_type == "module":
            return GraphNode(
                id=GraphService._module_node_id(node_id),
                label=record["label"],
                type="module",
            )
        if node_type == "api_route":
            return GraphNode(id=f"api_route_{node_id}", label=record["label"], type="api_route")
        if node_type == "file":
            return GraphNode(
                id=GraphService._file_node_id(node_id),
                label=record["label"],
                type="file",
            )
        return GraphNode(
            id=GraphService._entity_node_id(node_id),
            label=record["label"],
            type=node_type,
        )

    @staticmethod
    def _edge_from_record(index: int, record: Any) -> GraphEdge:
        return GraphEdge(
            id=f"edge_{index}",
            source=record["source_node_id"],
            target=record["target_node_id"],
            type=record["relationship_type"],
        )

    @staticmethod
    def _graph_for_node_ids(
        graph: ProjectGraphResponse, node_ids: set[str]
    ) -> ProjectGraphResponse:
        return ProjectGraphResponse(
            nodes=[node for node in graph.nodes if node.id in node_ids],
            edges=[
                edge
                for edge in graph.edges
                if edge.source in node_ids and edge.target in node_ids
            ],
        )

    @staticmethod
    def _validate_graph_integrity(graph: ProjectGraphResponse) -> ProjectGraphResponse:
        """Ensure the Neo4j projection is internally consistent before returning it."""
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
    def _file_node_id(file_id: int) -> str:
        return f"file_{file_id}"

    @staticmethod
    def _project_node_id(project_id: int) -> str:
        return f"project_{project_id}"

    @staticmethod
    def _module_node_id(module_path: str) -> str:
        return f"module_{module_path}"

    @staticmethod
    def _entity_node_id(entity_id: int) -> str:
        return f"entity_{entity_id}"
