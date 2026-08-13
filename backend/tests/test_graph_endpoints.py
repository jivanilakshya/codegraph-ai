"""Contract tests for project graph endpoints."""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.api.v1.endpoints.graph import get_project_graph
from app.schemas.graph import GraphNode, ProjectGraphResponse
from app.services.graph_service import GraphProjectNotFoundError


class GraphEndpointTests(unittest.TestCase):
    """Ensure graph endpoint parameters map to the graph service contract."""

    def test_get_project_graph_returns_full_graph(self) -> None:
        graph = _graph()
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_project_graph",
            return_value=graph,
        ) as build_project_graph:
            response = get_project_graph(7)

        self.assertEqual(response, graph)
        build_project_graph.assert_called_once_with(7)

    def test_get_project_graph_returns_not_found_for_missing_project(self) -> None:
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_project_graph",
            side_effect=GraphProjectNotFoundError("Project was not found."),
        ):
            with self.assertRaises(HTTPException) as raised:
                get_project_graph(999)

        self.assertEqual(raised.exception.status_code, 404)


def _graph() -> ProjectGraphResponse:
    return ProjectGraphResponse(
        nodes=[GraphNode(id="file_21", label="example.py", type="file")],
        edges=[],
    )
