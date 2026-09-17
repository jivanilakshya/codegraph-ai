"""Unit coverage for the Neo4j-backed project graph read service."""

import unittest
from pathlib import PurePosixPath
from unittest.mock import patch

from app.schemas.graph import GraphEdge, GraphNode, ProjectGraphResponse
from app.services.graph_service import (
    GraphProjectNotFoundError,
    GraphService,
    GraphServiceError,
    MAX_COMPLETE_GRAPH_EDGES,
    MAX_COMPLETE_GRAPH_NODES,
)


class GraphServiceTests(unittest.TestCase):
    """Validate graph construction without requiring a Neo4j server."""

    def test_build_project_graph_returns_neo4j_nodes_and_relationships(self) -> None:
        driver = _FakeDriver(_graph_data())
        with patch("app.services.graph_service.get_driver", return_value=driver):
            graph = GraphService().build_project_graph(7)

        self.assertEqual(
            [(node.id, node.label, node.type) for node in graph.nodes],
            [
                ("project_7", "project-7", "project"),
                ("module_src", "src", "module"),
                ("file_21", "src/example.py", "file"),
                ("file_22", "src/helper.py", "file"),
                ("entity_31", "run", "function"),
                ("entity_32", "Helper", "class"),
                ("entity_33", "ready", "variable"),
                ("entity_34", "helper", "function"),
            ],
        )
        self.assertEqual(
            [(edge.id, edge.source, edge.target, edge.type) for edge in graph.edges],
            [
                ("edge_1", "project_7", "module_src", "CONTAINS"),
                ("edge_2", "module_src", "file_21", "CONTAINS"),
                ("edge_3", "module_src", "file_22", "CONTAINS"),
                ("edge_4", "file_21", "file_22", "IMPORTS"),
                ("edge_5", "file_21", "entity_31", "DECLARES"),
                ("edge_6", "file_21", "entity_32", "DECLARES"),
                ("edge_7", "file_21", "entity_33", "DECLARES"),
                ("edge_8", "file_22", "entity_34", "DECLARES"),
                ("edge_9", "entity_31", "entity_34", "CALLS"),
            ],
        )

    def test_graph_query_scopes_every_read_to_requested_project(self) -> None:
        data = _graph_data()
        data[8] = {
            "nodes": [{"node_type": "file", "node_id": 99, "label": "private.py"}],
            "edges": [],
            "search_nodes": [],
        }
        driver = _FakeDriver(data)
        with patch("app.services.graph_service.get_driver", return_value=driver):
            graph = GraphService().build_project_graph(7)

        self.assertNotIn("file_99", {node.id for node in graph.nodes})
        self.assertTrue(driver.transaction.calls)
        for query, parameters in driver.transaction.calls:
            self.assertEqual(parameters["project_id"], 7)
            self.assertIn("project_id: $project_id", query)

    def test_empty_project_returns_empty_graph(self) -> None:
        driver = _FakeDriver({7: {"nodes": [], "edges": [], "search_nodes": []}})
        with patch("app.services.graph_service.get_driver", return_value=driver):
            graph = GraphService().build_project_graph(7)

        self.assertEqual(
            graph.model_dump(),
            {
                "nodes": [{"id": "project_7", "label": "project-7", "type": "project"}],
                "edges": [],
                "truncated": False,
            },
        )

    def test_complete_graph_is_capped_before_it_reaches_the_client(self) -> None:
        data = {
            7: {
                "nodes": [
                    {"node_type": "file", "node_id": index, "label": f"src/{index}.py"}
                    for index in range(1, MAX_COMPLETE_GRAPH_NODES + 2)
                ],
                "edges": [
                    {
                        "relationship_type": "IMPORTS",
                        "source_id": source_id,
                        "target_id": target_id,
                    }
                    for source_id in range(1, 4)
                    for target_id in range(1, MAX_COMPLETE_GRAPH_NODES + 1)
                ],
                "search_nodes": [],
            }
        }
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(data)):
            graph = GraphService().build_project_graph(7)

        self.assertEqual(len(graph.nodes), MAX_COMPLETE_GRAPH_NODES)
        self.assertEqual(len(graph.edges), MAX_COMPLETE_GRAPH_EDGES)
        self.assertTrue(graph.truncated)

    def test_graph_stats_remain_uncapped_aggregate_counts(self) -> None:
        driver = _FakeDriver(_graph_data())
        with patch("app.services.graph_service.get_driver", return_value=driver):
            stats = GraphService().get_project_graph_stats(7)

        self.assertEqual(stats.model_dump(), {
            "nodes": 6,
            "edges": 6,
            "files": 2,
            "functions": 2,
            "classes": 1,
        })

    def test_search_uses_neo4j_and_preserves_graph_node_shape(self) -> None:
        driver = _FakeDriver(_graph_data())
        with patch("app.services.graph_service.get_driver", return_value=driver):
            nodes = GraphService().search_project_graph_nodes(7, "HELP", limit=2)

        self.assertEqual(
            [(node.id, node.label, node.type) for node in nodes],
            [("entity_34", "helper", "function")],
        )
        self.assertEqual(
            driver.transaction.calls[-1][1],
            {"project_id": 7, "search_query": "help", "limit": 2},
        )

    def test_search_supports_project_scoped_architecture_nodes(self) -> None:
        data = _graph_data()
        data[7]["search_nodes"] = [{"node_type": "module", "node_id": "src", "label": "src"}]
        driver = _FakeDriver(data)
        with patch("app.services.graph_service.get_driver", return_value=driver):
            nodes = GraphService().search_project_graph_nodes(7, "src")

        self.assertEqual([(node.id, node.type) for node in nodes], [("module_src", "module")])
        self.assertIn("(module:Module {project_id: $project_id})", GraphService._SEARCH_QUERY)

    def test_module_focus_traverses_containment_hierarchy(self) -> None:
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(_graph_data())):
            focused = GraphService().build_focus_graph(7, module_path="src", depth=1)

        self.assertEqual(
            {node.id for node in focused.nodes},
            {"project_7", "module_src", "file_21", "file_22"},
        )
        self.assertEqual(
            {(edge.source, edge.target, edge.type) for edge in focused.edges if edge.type == "CONTAINS"},
            {
                ("project_7", "module_src", "CONTAINS"),
                ("module_src", "file_21", "CONTAINS"),
                ("module_src", "file_22", "CONTAINS"),
            },
        )

    def test_graph_preserves_semantic_entity_relationship_types(self) -> None:
        data = _graph_data()
        data[7]["edges"].extend(
            [
                {"relationship_type": "EXTENDS", "source_id": 32, "target_id": 35},
                {"relationship_type": "HAS_METHOD", "source_id": 32, "target_id": 34},
                {"relationship_type": "HAS_METHOD", "source_id": 32, "target_id": 36},
            ]
        )
        data[7]["nodes"].extend(
            [
                {"node_type": "class", "node_id": 35, "label": "BaseHelper"},
                {"node_type": "method", "node_id": 36, "label": "run"},
            ]
        )
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(data)):
            graph = GraphService().build_project_graph(7)

        self.assertEqual(
            {(edge.source, edge.target, edge.type) for edge in graph.edges},
            {
                ("project_7", "module_src", "CONTAINS"),
                ("module_src", "file_21", "CONTAINS"),
                ("module_src", "file_22", "CONTAINS"),
                ("file_21", "file_22", "IMPORTS"),
                ("file_21", "entity_31", "DECLARES"),
                ("file_21", "entity_32", "DECLARES"),
                ("file_21", "entity_33", "DECLARES"),
                ("file_22", "entity_34", "DECLARES"),
                ("entity_31", "entity_34", "CALLS"),
                ("entity_32", "entity_35", "EXTENDS"),
                ("entity_32", "entity_34", "HAS_METHOD"),
                ("entity_32", "entity_36", "HAS_METHOD"),
            },
        )
        self.assertIn(
            ("entity_36", "run", "method"),
            {(node.id, node.label, node.type) for node in graph.nodes},
        )

    def test_missing_neo4j_project_is_not_found(self) -> None:
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver({})):
            with self.assertRaises(GraphProjectNotFoundError):
                GraphService().build_project_graph(999)

    def test_neo4j_query_error_is_wrapped(self) -> None:
        with patch("app.services.graph_service.get_driver", return_value=_BrokenDriver()):
            with self.assertRaises(GraphServiceError) as raised:
                GraphService().build_project_graph(7)

        self.assertEqual(str(raised.exception), "Could not load the requested project graph.")

    def test_file_focus_preserves_depth_semantics_over_neo4j_graph(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[
                GraphNode(id="file_1", label="a.py", type="file"),
                GraphNode(id="entity_1", label="one", type="function"),
                GraphNode(id="entity_2", label="two", type="function"),
                GraphNode(id="entity_3", label="three", type="function"),
            ],
            edges=[
                GraphEdge(id="edge_1", source="file_1", target="entity_1", type="DECLARES"),
                GraphEdge(id="edge_2", source="entity_1", target="entity_2", type="CALLS"),
                GraphEdge(id="edge_3", source="entity_2", target="entity_3", type="CALLS"),
            ],
        )
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(_graph_response_data(graph))):
            focused = GraphService().build_focus_graph(7, file_id=1, depth=3)

        self.assertEqual({node.id for node in focused.nodes}, {"file_1", "entity_1", "entity_2", "entity_3"})
        self.assertEqual(len(focused.edges), 3)

    def test_file_focus_depth_expands_one_hop_at_a_time(self) -> None:
        graph = _depth_graph()
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(_graph_response_data(graph))):
            depth_one = GraphService().build_focus_graph(7, file_id=1, depth=1)
            depth_two = GraphService().build_focus_graph(7, file_id=1, depth=2)
            depth_three = GraphService().build_focus_graph(7, file_id=1, depth=3)

        self.assertEqual({node.id for node in depth_one.nodes}, {"file_1", "entity_1"})
        self.assertEqual(
            {node.id for node in depth_two.nodes}, {"file_1", "entity_1", "entity_2"}
        )
        self.assertEqual(
            {node.id for node in depth_three.nodes},
            {"file_1", "entity_1", "entity_2", "entity_3"},
        )

    def test_focus_does_not_depend_on_the_bounded_complete_graph(self) -> None:
        graph = _depth_graph()
        with (
            patch("app.services.graph_service.get_driver", return_value=_FakeDriver(_graph_response_data(graph))),
            patch.object(GraphService, "build_project_graph", side_effect=AssertionError("overview used")),
        ):
            focused = GraphService().build_focus_graph(7, entity_id=1, depth=3)

        self.assertEqual({node.id for node in focused.nodes}, {"file_1", "entity_1", "entity_2", "entity_3", "entity_4"})

    def test_entity_focus_honors_each_requested_depth(self) -> None:
        graph = _depth_graph()
        with patch("app.services.graph_service.get_driver", return_value=_FakeDriver(_graph_response_data(graph))):
            depth_one = GraphService().build_focus_graph(7, entity_id=1, depth=1)
            depth_two = GraphService().build_focus_graph(7, entity_id=1, depth=2)
            depth_three = GraphService().build_focus_graph(7, entity_id=1, depth=3)

        self.assertEqual(
            {node.id for node in depth_one.nodes}, {"file_1", "entity_1", "entity_2"}
        )
        self.assertEqual(
            {node.id for node in depth_two.nodes},
            {"file_1", "entity_1", "entity_2", "entity_3"},
        )
        self.assertEqual(
            {node.id for node in depth_three.nodes},
            {"file_1", "entity_1", "entity_2", "entity_3", "entity_4"},
        )
        for focused_graph in (depth_one, depth_two, depth_three):
            self.assertEqual(len({node.id for node in focused_graph.nodes}), len(focused_graph.nodes))
            self.assertEqual(len({edge.id for edge in focused_graph.edges}), len(focused_graph.edges))

    def test_validate_graph_integrity_rejects_missing_edge_endpoints(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[GraphNode(id="file_1", label="a.py", type="file")],
            edges=[GraphEdge(id="edge_1", source="file_1", target="entity_99", type="DECLARES")],
        )
        with self.assertRaises(GraphServiceError):
            GraphService._validate_graph_integrity(graph)


class _FakeResult(list):
    def single(self):
        return self[0] if self else None


class _FakeTransaction:
    def __init__(self, data):
        self.data = data
        self.calls: list[tuple[str, dict[str, object]]] = []

    def run(self, query, **parameters):
        self.calls.append((query, parameters))
        project = self.data.get(parameters["project_id"])
        if query == GraphService._PROJECT_QUERY:
            return _FakeResult([{"project_id": parameters["project_id"]}] if project is not None else [])
        if query == GraphService._NODES_QUERY:
            return _FakeResult(_node_records(project, parameters["project_id"])[: parameters["limit"]])
        if query == GraphService._EDGES_QUERY:
            records = [
                edge
                for edge in _edge_records(project, parameters["project_id"])
                if edge["source_node_id"] in parameters["node_ids"]
                and edge["target_node_id"] in parameters["node_ids"]
            ]
            return _FakeResult(records[: parameters["limit"]])
        if query == GraphService._SEARCH_QUERY:
            return _FakeResult(project["search_nodes"])
        if query == GraphService._STATS_QUERY:
            entity_nodes = [node for node in project["nodes"] if node["node_type"] != "file"]
            return _FakeResult([{
                "files": len(project["nodes"]) - len(entity_nodes),
                "entities": len(entity_nodes),
                "functions": sum(node["node_type"] == "function" for node in entity_nodes),
                "classes": sum(node["node_type"] == "class" for node in entity_nodes),
                "edges": len(project["edges"]),
            }])
        if query.startswith("\n        MATCH (start {project_id: $project_id})"):
            return _FakeResult(_focus_records(project, query, parameters))
        raise AssertionError("Unexpected Cypher query")


class _FakeSession:
    def __init__(self, transaction):
        self.transaction = transaction

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute_read(self, work, *arguments):
        return work(self.transaction, *arguments)


class _FakeDriver:
    def __init__(self, data):
        self.transaction = _FakeTransaction(data)

    def session(self):
        return _FakeSession(self.transaction)


class _BrokenDriver:
    def session(self):
        raise RuntimeError("Neo4j is unavailable")


def _graph_data():
    return {
        7: {
            "nodes": [
                {"node_type": "file", "node_id": 21, "label": "src/example.py"},
                {"node_type": "file", "node_id": 22, "label": "src/helper.py"},
                {"node_type": "function", "node_id": 31, "label": "run"},
                {"node_type": "class", "node_id": 32, "label": "Helper"},
                {"node_type": "variable", "node_id": 33, "label": "ready"},
                {"node_type": "function", "node_id": 34, "label": "helper"},
            ],
            "edges": [
                {"relationship_type": "IMPORTS", "source_id": 21, "target_id": 22},
                {"relationship_type": "DECLARES", "source_id": 21, "target_id": 31},
                {"relationship_type": "DECLARES", "source_id": 21, "target_id": 32},
                {"relationship_type": "DECLARES", "source_id": 21, "target_id": 33},
                {"relationship_type": "DECLARES", "source_id": 22, "target_id": 34},
                {"relationship_type": "CALLS", "source_id": 31, "target_id": 34},
            ],
            "search_nodes": [{"node_type": "function", "node_id": 34, "label": "helper"}],
        }
    }


def _depth_graph() -> ProjectGraphResponse:
    return ProjectGraphResponse(
        nodes=[
            GraphNode(id="file_1", label="entry.py", type="file"),
            GraphNode(id="entity_1", label="start", type="function"),
            GraphNode(id="entity_2", label="child", type="function"),
            GraphNode(id="entity_3", label="Base", type="class"),
            GraphNode(id="entity_4", label="run", type="method"),
        ],
        edges=[
            GraphEdge(id="edge_1", source="file_1", target="entity_1", type="DECLARES"),
            GraphEdge(id="edge_2", source="entity_1", target="entity_2", type="CALLS"),
            GraphEdge(id="edge_3", source="entity_2", target="entity_3", type="EXTENDS"),
            GraphEdge(id="edge_4", source="entity_3", target="entity_4", type="HAS_METHOD"),
        ],
    )


def _graph_response_data(graph: ProjectGraphResponse):
    """Translate an in-memory response into the fake Neo4j record shape."""
    nodes = []
    for node in graph.nodes:
        nodes.append(
            {
                "node_type": node.type,
                "node_id": int(node.id.split("_", 1)[1]),
                "label": node.label,
            }
        )
    edges = []
    for edge in graph.edges:
        source_id = int(edge.source.split("_", 1)[1])
        target_id = int(edge.target.split("_", 1)[1])
        edges.append(
            {
                "relationship_type": edge.type,
                "source_id": source_id,
                "target_id": target_id,
            }
        )
    return {7: {"nodes": nodes, "edges": edges, "search_nodes": []}}


def _node_records(project, project_id):
    records = [
        {"node_type": "project", "node_id": str(project_id), "label": f"project-{project_id}"}
    ]
    module_paths = {
        str(PurePosixPath(node["label"]).parent)
        for node in project["nodes"]
        if node["node_type"] == "file" and str(PurePosixPath(node["label"]).parent) != "."
    }
    records.extend(
        {"node_type": "module", "node_id": path, "label": path}
        for path in sorted(module_paths, key=lambda path: (path.count("/"), path))
    )
    return records + project["nodes"]


def _edge_records(project, project_id):
    records = []
    module_paths = {
        str(PurePosixPath(node["label"]).parent)
        for node in project["nodes"]
        if node["node_type"] == "file" and str(PurePosixPath(node["label"]).parent) != "."
    }
    for module_path in sorted(module_paths, key=lambda path: (path.count("/"), path)):
        parent = str(PurePosixPath(module_path).parent)
        records.append({
            "relationship_type": "CONTAINS",
            "source_node_id": f"project_{project_id}" if parent == "." else f"module_{parent}",
            "target_node_id": f"module_{module_path}",
        })
    for node in project["nodes"]:
        if node["node_type"] != "file":
            continue
        parent = str(PurePosixPath(node["label"]).parent)
        records.append({
            "relationship_type": "CONTAINS",
            "source_node_id": f"project_{project_id}" if parent == "." else f"module_{parent}",
            "target_node_id": f"file_{node['node_id']}",
        })
    for edge in project["edges"]:
        relationship_type = edge["relationship_type"]
        if relationship_type == "IMPORTS":
            source = f"file_{edge['source_id']}"
            target = f"file_{edge['target_id']}"
        elif relationship_type == "DECLARES":
            source = f"file_{edge['source_id']}"
            target = f"entity_{edge['target_id']}"
        else:
            source = f"entity_{edge['source_id']}"
            target = f"entity_{edge['target_id']}"
        records.append({
            "relationship_type": relationship_type,
            "source_node_id": source,
            "target_node_id": target,
        })
    return records


def _focus_records(project, query, parameters):
    """Emulate the bounded, undirected Neo4j focus traversal for unit tests."""
    depth = int(query.split("*0..", 1)[1].split("]", 1)[0])
    if parameters["project_root"]:
        start_id = f"project_{parameters['project_id']}"
    elif parameters["module_path"] is not None:
        start_id = f"module_{parameters['module_path']}"
    elif parameters["file_id"] is not None:
        start_id = f"file_{parameters['file_id']}"
    else:
        start_id = f"entity_{parameters['entity_id']}"
    records_by_id = {}
    for record in _node_records(project, parameters["project_id"]):
        prefix = "project" if record["node_type"] == "project" else "module" if record["node_type"] == "module" else "file" if record["node_type"] == "file" else "entity"
        records_by_id[f"{prefix}_{record['node_id']}"] = record
    if start_id not in records_by_id:
        return []

    adjacent = {node_id: set() for node_id in records_by_id}
    include_contains = start_id.startswith(("project_", "module_"))
    for edge in _edge_records(project, parameters["project_id"]):
        if edge["relationship_type"] == "CONTAINS" and not include_contains:
            continue
        source = edge["source_node_id"]
        target = edge["target_node_id"]
        adjacent.setdefault(source, set()).add(target)
        adjacent.setdefault(target, set()).add(source)

    included = {start_id}
    frontier = {start_id}
    for _ in range(depth):
        frontier = {neighbor for node_id in frontier for neighbor in adjacent.get(node_id, set()) if neighbor not in included}
        included.update(frontier)
    records = [records_by_id[node_id] for node_id in included]
    return _FakeResult(
        sorted(
            records,
            key=lambda record: ({"project": 0, "module": 1, "file": 2}.get(record["node_type"], 3), record["node_id"]),
        )[: parameters["limit"]]
    )
