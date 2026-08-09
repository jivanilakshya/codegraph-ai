"""Unit coverage for the persisted PostgreSQL graph projection."""

import unittest
from unittest.mock import patch

from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.relationship import FileRelationship
from app.schemas.graph import GraphEdge, GraphNode, ProjectGraphResponse
from app.services.graph_service import GraphService, _ProjectGraphRecords


class GraphServiceTests(unittest.TestCase):
    """Validate graph construction without a database or parser runtime."""

    def test_build_project_graph_uses_persisted_files_entities_and_relationships(self) -> None:
        records = _records()
        with patch.object(GraphService, "_load_project_graph", return_value=records):
            graph = GraphService().build_project_graph(7)

        self.assertEqual(
            [(node.id, node.label, node.type) for node in graph.nodes],
            [
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
                ("edge_1", "file_21", "file_22", "IMPORTS"),
                ("edge_2", "file_21", "entity_31", "DECLARES"),
                ("edge_3", "file_21", "entity_32", "DECLARES"),
                ("edge_4", "file_21", "entity_33", "DECLARES"),
                ("edge_5", "file_22", "entity_34", "DECLARES"),
                ("edge_6", "entity_31", "entity_34", "CALLS"),
            ],
        )

    def test_build_focus_graph_returns_two_hop_call_neighborhood(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[
                GraphNode(id="entity_1", label="one", type="function"),
                GraphNode(id="entity_2", label="two", type="function"),
                GraphNode(id="entity_3", label="three", type="function"),
                GraphNode(id="entity_4", label="four", type="function"),
            ],
            edges=[
                GraphEdge(id="edge_1", source="entity_1", target="entity_2", type="CALLS"),
                GraphEdge(id="edge_2", source="entity_2", target="entity_3", type="CALLS"),
                GraphEdge(id="edge_3", source="entity_3", target="entity_4", type="CALLS"),
            ],
        )
        with patch.object(GraphService, "build_project_graph", return_value=graph):
            focus_graph = GraphService().build_focus_graph(7, entity_id=1)

        self.assertEqual({node.id for node in focus_graph.nodes}, {"entity_1", "entity_2", "entity_3"})
        self.assertEqual(len(focus_graph.edges), 2)

    def test_build_focus_graph_without_target_returns_full_graph(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[GraphNode(id="file_1", label="example.py", type="file")],
            edges=[],
        )
        with patch.object(GraphService, "build_project_graph", return_value=graph):
            focused_graph = GraphService().build_focus_graph(7)

        self.assertEqual(focused_graph, graph)

    def test_build_file_focus_graph_expands_persisted_call_chains_by_depth(self) -> None:
        """Depths use persisted calls, not the bounded full-graph projection."""
        depth_one_records = _file_focus_records([])
        depth_two_records = _file_focus_records(
            [EntityRelationship(id=51, source_entity_id=31, target_entity_id=32, relationship_type="CALLS")]
        )
        depth_three_records = _file_focus_records(
            [
                EntityRelationship(id=51, source_entity_id=31, target_entity_id=32, relationship_type="CALLS"),
                EntityRelationship(id=52, source_entity_id=32, target_entity_id=33, relationship_type="CALLS"),
            ]
        )
        with patch.object(
            GraphService,
            "_load_file_focus_records",
            side_effect=[depth_one_records, depth_two_records, depth_three_records],
        ):
            depth_one = GraphService().build_focus_graph(7, file_id=1, depth=1)
            depth_two = GraphService().build_focus_graph(7, file_id=1, depth=2)
            depth_three = GraphService().build_focus_graph(7, file_id=1, depth=3)

        self.assertFalse([edge for edge in depth_one.edges if edge.type == "CALLS"])
        self.assertEqual(
            [(edge.id, edge.source, edge.target) for edge in depth_two.edges if edge.type == "CALLS"],
            [("call_31_32", "entity_31", "entity_32")],
        )
        self.assertEqual(
            [(edge.id, edge.source, edge.target) for edge in depth_three.edges if edge.type == "CALLS"],
            [
                ("call_31_32", "entity_31", "entity_32"),
                ("call_32_33", "entity_32", "entity_33"),
            ],
        )
        self.assertGreater(len(depth_three.nodes), len(depth_two.nodes))


def _records() -> _ProjectGraphRecords:
    return _ProjectGraphRecords(
        files=[
            File(id=21, project_id=7, path="src/example.py", language="Python", size=100),
            File(id=22, project_id=7, path="src/helper.py", language="Python", size=100),
        ],
        entities=[
            CodeEntity(id=31, file_id=21, name="run", entity_type="function", start_line=1, end_line=2),
            CodeEntity(id=32, file_id=21, name="Helper", entity_type="class", start_line=4, end_line=6),
            CodeEntity(id=33, file_id=21, name="ready", entity_type="variable", start_line=8, end_line=8),
            CodeEntity(id=34, file_id=22, name="helper", entity_type="function", start_line=1, end_line=2),
            CodeEntity(id=35, file_id=22, name="helper", entity_type="export", start_line=1, end_line=2),
        ],
        file_relationships=[
            FileRelationship(id=41, source_file_id=21, target_file_id=22, relationship_type="IMPORTS")
        ],
        entity_relationships=[
            EntityRelationship(
                id=51,
                source_entity_id=31,
                target_entity_id=34,
                relationship_type="CALLS",
            )
        ],
    )


def _file_focus_records(calls: list[EntityRelationship]) -> _ProjectGraphRecords:
    """Selected-file records with A -> B -> C persisted CALLS."""
    included_ids = {31, 32}
    for call in calls:
        included_ids.update((call.source_entity_id, call.target_entity_id))
    entities_by_id = {
        31: CodeEntity(id=31, file_id=1, name="A", entity_type="function", start_line=1, end_line=2),
        32: CodeEntity(id=32, file_id=1, name="B", entity_type="function", start_line=4, end_line=5),
        33: CodeEntity(id=33, file_id=2, name="C", entity_type="function", start_line=1, end_line=2),
    }
    return _ProjectGraphRecords(
        files=[
            File(id=1, project_id=7, path="src/a.py", language="Python", size=100),
            File(id=2, project_id=7, path="src/c.py", language="Python", size=100),
        ],
        entities=[entities_by_id[entity_id] for entity_id in sorted(included_ids)],
        file_relationships=[
            FileRelationship(id=41, source_file_id=1, target_file_id=2, relationship_type="IMPORTS")
        ],
        entity_relationships=calls,
    )
