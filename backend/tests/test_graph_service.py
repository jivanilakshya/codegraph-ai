"""Regression tests for the read-only project graph projection."""

import unittest
from unittest.mock import patch

from app.models.file import File
from app.models.project import Project
from app.schemas.relationships import Relationship
from app.schemas.symbols import SymbolResponse
from app.services.graph_service import GraphService, _ProjectFiles
from app.services.parser_service import ParsedFile, ParsedNode, RawAstNode, RawAstPoint


class GraphServiceTests(unittest.TestCase):
    """Validate graph construction without a database or parser runtime."""

    def test_build_project_graph_returns_nodes_and_resolved_edges(self) -> None:
        project = Project(id=7, name="demo", local_path="C:/repositories/demo")
        file_record = File(
            id=21,
            project_id=7,
            path="src/example.js",
            language="JavaScript",
            size=100,
        )
        parsed_file = _parsed_file()

        with (
            patch.object(
                GraphService,
                "_load_project_files",
                return_value=_ProjectFiles(project=project, files=[file_record]),
            ),
            patch("app.services.graph_service.ParserService") as parser_service,
        ):
            parser_service.return_value.parse_file.return_value = parsed_file
            graph = GraphService().build_project_graph(7)

        node_ids = {node.id for node in graph.nodes}
        self.assertEqual(
            {node.type for node in graph.nodes},
            {"file", "class", "function", "method", "module", "variable"},
        )
        self.assertTrue(
            all(
                edge.source in node_ids and edge.target in node_ids
                for edge in graph.edges
            )
        )
        self.assertEqual(
            {edge.relationship for edge in graph.edges},
            {"IMPORTS", "EXPORTS", "CALLS", "HAS_METHOD", "CONTAINS"},
        )


def _parsed_file() -> ParsedFile:
    """Return a compact parser result covering graph node and edge types."""
    point = RawAstPoint(row=0, column=0)
    ast = RawAstNode(
        type="program",
        is_named=True,
        start_byte=0,
        end_byte=0,
        start_point=point,
        end_point=point,
        children=[],
    )
    return ParsedFile(
        file="example.js",
        language="JavaScript",
        ast=ast,
        symbols=SymbolResponse(variables=["configuration"]),
        relationships=[
            Relationship(source="Example", target="execute", relationship="HAS_METHOD"),
            Relationship(source="example.js", target="execute", relationship="CALLS"),
            Relationship(source="run", target="example.js", relationship="EXPORTED_BY"),
        ],
        imports=[
            ParsedNode(
                name="dependency", type="import_statement", start_line=1, end_line=1
            )
        ],
        classes=[
            ParsedNode(
                name="Example", type="class_declaration", start_line=3, end_line=5
            )
        ],
        functions=[
            ParsedNode(
                name="run", type="function_declaration", start_line=7, end_line=9
            )
        ],
        methods=[
            ParsedNode(
                name="execute", type="method_definition", start_line=4, end_line=4
            )
        ],
        interfaces=[],
    )
