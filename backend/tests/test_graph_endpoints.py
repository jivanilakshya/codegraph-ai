"""Contract tests for project graph endpoints."""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.api.v1.endpoints.graph import get_project_graph_focus
from app.schemas.graph import GraphNode, ProjectGraphResponse
from app.services.graph_service import GraphProjectNotFoundError


class GraphEndpointTests(unittest.TestCase):
    """Ensure focus endpoint parameters map to the graph service contract."""

    def test_focus_without_target_returns_full_graph(self) -> None:
        graph = _graph()
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_project_graph",
            return_value=graph,
        ) as build_project_graph:
            response = get_project_graph_focus(7, file_id=None, entity_id=None, depth=1)

        self.assertEqual(response, graph)
        build_project_graph.assert_called_once_with(7)

    def test_focus_with_file_id_returns_file_neighborhood(self) -> None:
        graph = _graph()
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_focus_graph",
            return_value=graph,
        ) as build_focus_graph:
            response = get_project_graph_focus(7, file_id=21, entity_id=None, depth=3)

        self.assertEqual(response, graph)
        build_focus_graph.assert_called_once_with(7, file_id=21, entity_id=None, depth=3)

    def test_focus_with_entity_id_returns_entity_neighborhood(self) -> None:
        graph = _graph()
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_focus_graph",
            return_value=graph,
        ) as build_focus_graph:
            response = get_project_graph_focus(7, file_id=None, entity_id=31, depth=1)

        self.assertEqual(response, graph)
        build_focus_graph.assert_called_once_with(7, file_id=None, entity_id=31, depth=1)

    def test_focus_rejects_multiple_targets(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            get_project_graph_focus(7, file_id=21, entity_id=31, depth=1)

        self.assertEqual(raised.exception.status_code, 422)

    def test_focus_returns_not_found_for_missing_project(self) -> None:
        with patch(
            "app.api.v1.endpoints.graph.GraphService.build_project_graph",
            side_effect=GraphProjectNotFoundError("Project was not found."),
        ):
            with self.assertRaises(HTTPException) as raised:
                get_project_graph_focus(999, file_id=None, entity_id=None, depth=1)

        self.assertEqual(raised.exception.status_code, 404)


def _graph() -> ProjectGraphResponse:
    return ProjectGraphResponse(
        nodes=[GraphNode(id="file_21", label="example.py", type="file")],
        edges=[],
    )
