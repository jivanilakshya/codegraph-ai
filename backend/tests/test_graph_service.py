"""Unit coverage for the persisted PostgreSQL graph projection."""

import unittest
from unittest.mock import patch

from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.relationship import FileRelationship
from app.schemas.graph import GraphEdge, GraphNode, ProjectGraphResponse
from app.services.graph_service import GraphService, GraphServiceError, _ProjectGraphRecords


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

    def test_validate_graph_integrity_rejects_duplicate_node_ids(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[
                GraphNode(id="file_1", label="a.py", type="file"),
                GraphNode(id="file_1", label="b.py", type="file"),
            ],
            edges=[],
        )
        with self.assertRaises(GraphServiceError):
            GraphService._validate_graph_integrity(graph)

    def test_validate_graph_integrity_rejects_missing_edge_endpoints(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[GraphNode(id="file_1", label="a.py", type="file")],
            edges=[
                GraphEdge(id="edge_1", source="file_1", target="entity_99", type="DECLARES"),
            ],
        )
        with self.assertRaises(GraphServiceError):
            GraphService._validate_graph_integrity(graph)

    def test_validate_graph_integrity_rejects_duplicate_relationships(self) -> None:
        graph = ProjectGraphResponse(
            nodes=[
                GraphNode(id="file_1", label="a.py", type="file"),
                GraphNode(id="entity_1", label="run", type="function"),
            ],
            edges=[
                GraphEdge(id="edge_1", source="file_1", target="entity_1", type="DECLARES"),
                GraphEdge(id="edge_2", source="file_1", target="entity_1", type="DECLARES"),
            ],
        )
        with self.assertRaises(GraphServiceError):
            GraphService._validate_graph_integrity(graph)


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
