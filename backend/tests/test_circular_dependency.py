"""Tests for project-scoped Circular Dependency Detection service and endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.api.v1.endpoints.circular_dependency import get_project_circular_dependencies
from app.schemas.circular_dependency import (
    CircularDependencyItem,
    CircularDependencyResponse,
    CircularDependencySummary,
)
from app.services.circular_dependency_service import (
    CircularDependencyProjectNotFoundError,
    CircularDependencyService,
)


class CircularDependencyEndpointTests(unittest.TestCase):
    """Test API endpoint behavior for circular dependency detection."""

    def test_get_project_circular_dependencies_success(self) -> None:
        mock_response = CircularDependencyResponse(
            project_id=7,
            summary=CircularDependencySummary(
                total_cycles=1,
                high_severity=0,
                medium_severity=0,
                low_severity=1,
                max_cycle_length=2,
            ),
            cycles=[
                CircularDependencyItem(
                    id="cycle_10_20",
                    project_id=7,
                    cycle=["src/a.py", "src/b.py", "src/a.py"],
                    cycle_length=2,
                    severity="low",
                    explanation="Two files import each other directly.",
                    file_ids=[10, 20],
                    file_paths=["src/a.py", "src/b.py"],
                )
            ],
        )

        with patch(
            "app.api.v1.endpoints.circular_dependency.CircularDependencyService.detect_cycles",
            return_value=mock_response,
        ) as mock_detect:
            response = get_project_circular_dependencies(7)

        self.assertEqual(response, mock_response)
        mock_detect.assert_called_once_with(7)

    def test_get_project_circular_dependencies_not_found(self) -> None:
        with patch(
            "app.api.v1.endpoints.circular_dependency.CircularDependencyService.detect_cycles",
            side_effect=CircularDependencyProjectNotFoundError("Project with ID 999 was not found."),
        ):
            with self.assertRaises(HTTPException) as ctx:
                get_project_circular_dependencies(999)

            self.assertEqual(ctx.exception.status_code, 404)
            self.assertIn("999", ctx.exception.detail)


class CircularDependencyServiceLogicTests(unittest.TestCase):
    """Test CircularDependencyService cycle traversal and normalization logic."""

    def setUp(self) -> None:
        self.service = CircularDependencyService()

    def test_dfs_find_cycles_two_node(self) -> None:
        # 10 -> 20, 20 -> 10
        adj = {10: {20}, 20: {10}}
        raw_cycles: list[list[int]] = []

        for node in [10, 20]:
            self.service._dfs_find_cycles(
                start_node=node,
                current_node=node,
                path=[node],
                visited_in_path={node},
                adj=adj,
                raw_cycles=raw_cycles,
            )

        # Expected: exactly one normalized cycle [10, 20]
        self.assertEqual(len(raw_cycles), 1)
        self.assertEqual(raw_cycles[0], [10, 20])

    def test_dfs_find_cycles_three_node(self) -> None:
        # 10 -> 20 -> 30 -> 10
        adj = {10: {20}, 20: {30}, 30: {10}}
        raw_cycles: list[list[int]] = []

        for node in [10, 20, 30]:
            self.service._dfs_find_cycles(
                start_node=node,
                current_node=node,
                path=[node],
                visited_in_path={node},
                adj=adj,
                raw_cycles=raw_cycles,
            )

        self.assertEqual(len(raw_cycles), 1)
        self.assertEqual(raw_cycles[0], [10, 20, 30])

    def test_dfs_find_cycles_four_node_high_severity(self) -> None:
        # 10 -> 20 -> 30 -> 40 -> 10
        adj = {10: {20}, 20: {30}, 30: {40}, 40: {10}}
        raw_cycles: list[list[int]] = []

        for node in [10, 20, 30, 40]:
            self.service._dfs_find_cycles(
                start_node=node,
                current_node=node,
                path=[node],
                visited_in_path={node},
                adj=adj,
                raw_cycles=raw_cycles,
            )

        self.assertEqual(len(raw_cycles), 1)
        self.assertEqual(raw_cycles[0], [10, 20, 30, 40])

    def test_no_cycle_graph(self) -> None:
        # 10 -> 20 -> 30 (DAG)
        adj = {10: {20}, 20: {30}}
        raw_cycles: list[list[int]] = []

        for node in [10, 20, 30]:
            self.service._dfs_find_cycles(
                start_node=node,
                current_node=node,
                path=[node],
                visited_in_path={node},
                adj=adj,
                raw_cycles=raw_cycles,
            )

        self.assertEqual(len(raw_cycles), 0)

    def test_self_loops_ignored(self) -> None:
        # 10 -> 10
        adj = {10: {10}}
        raw_cycles: list[list[int]] = []

        self.service._dfs_find_cycles(
            start_node=10,
            current_node=10,
            path=[10],
            visited_in_path={10},
            adj=adj,
            raw_cycles=raw_cycles,
        )

        self.assertEqual(len(raw_cycles), 0)

    def test_project_isolation_in_detect_cycles(self) -> None:
        """Verify detect_cycles queries only target project_id."""
        with patch("app.services.circular_dependency_service.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value.__enter__.return_value = mock_session

            # Mock project found
            mock_session.get.return_value = MagicMock(id=5, name="Isolated Project")
            # Mock empty files
            mock_session.scalars.return_value.all.return_value = []

            res = self.service.detect_cycles(5)
            self.assertEqual(res.project_id, 5)
            self.assertEqual(res.summary.total_cycles, 0)
            mock_session.get.assert_called_once()


if __name__ == "__main__":
    unittest.main()
