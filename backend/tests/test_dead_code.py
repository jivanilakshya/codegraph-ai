"""Tests for project-scoped Dead Code Detection service and endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.api.v1.endpoints.dead_code import get_project_dead_code
from app.schemas.dead_code import (
    DeadCodeItem,
    DeadCodeResponse,
    DeadCodeSummary,
)
from app.services.dead_code_service import (
    DeadCodeProjectNotFoundError,
    DeadCodeService,
)


class DeadCodeEndpointTests(unittest.TestCase):
    """Test API endpoint behavior for dead code detection."""

    def test_get_project_dead_code_success(self) -> None:
        mock_response = DeadCodeResponse(
            project_id=7,
            total_candidates=2,
            summary=DeadCodeSummary(files=1, functions=1),
            items=[
                DeadCodeItem(
                    id="file_10",
                    entity_type="file",
                    name="src/unused_module.py",
                    file_id=10,
                    file_path="src/unused_module.py",
                    confidence="medium",
                    reason="File has no incoming import references.",
                ),
                DeadCodeItem(
                    id="entity_20",
                    entity_type="function",
                    name="dead_helper",
                    file_id=11,
                    file_path="src/helpers.py",
                    start_line=10,
                    end_line=20,
                    confidence="high",
                    reason="Function has no incoming CALLS edges.",
                ),
            ],
        )

        with patch("app.api.v1.endpoints.dead_code.DeadCodeService.detect_dead_code", return_value=mock_response) as mock_detect:
            response = get_project_dead_code(7)

        self.assertEqual(response, mock_response)
        mock_detect.assert_called_once_with(7)

    def test_get_project_dead_code_not_found(self) -> None:
        with patch(
            "app.api.v1.endpoints.dead_code.DeadCodeService.detect_dead_code",
            side_effect=DeadCodeProjectNotFoundError("Project with ID 999 was not found."),
        ):
            with self.assertRaises(HTTPException) as ctx:
                get_project_dead_code(999)

            self.assertEqual(ctx.exception.status_code, 404)
            self.assertIn("999", ctx.exception.detail)


class DeadCodeServiceLogicTests(unittest.TestCase):
    """Test DeadCodeService classification and heuristic logic."""

    def setUp(self) -> None:
        self.service = DeadCodeService()

    def test_entrypoint_files_not_flagged_as_dead(self) -> None:
        mock_main = MagicMock(id=1, path="src/main.py")
        mock_index = MagicMock(id=2, path="frontend/index.ts")
        mock_app = MagicMock(id=3, path="app.py")
        mock_page = MagicMock(id=4, path="app/dashboard/page.tsx")
        mock_helper = MagicMock(id=5, path="src/utils/orphan.py")

        imported_file_ids = set()

        self.assertFalse(self.service._is_potential_dead_file(mock_main, imported_file_ids))
        self.assertFalse(self.service._is_potential_dead_file(mock_index, imported_file_ids))
        self.assertFalse(self.service._is_potential_dead_file(mock_app, imported_file_ids))
        self.assertFalse(self.service._is_potential_dead_file(mock_page, imported_file_ids))
        self.assertTrue(self.service._is_potential_dead_file(mock_helper, imported_file_ids))

    def test_dunder_methods_not_flagged(self) -> None:
        file_map = {1: MagicMock(id=1, path="src/models.py")}
        called_entity_ids = set()

        init_entity = MagicMock(id=10, file_id=1, start_line=1, end_line=5)
        init_entity.entity_type = "method"
        init_entity.name = "__init__"

        str_entity = MagicMock(id=11, file_id=1, start_line=6, end_line=8)
        str_entity.entity_type = "method"
        str_entity.name = "__str__"

        unused_method = MagicMock(id=12, file_id=1, start_line=10, end_line=15)
        unused_method.entity_type = "method"
        unused_method.name = "calculate_obsolete_val"

        self.assertIsNone(self.service._analyze_entity(init_entity, file_map, called_entity_ids))
        self.assertIsNone(self.service._analyze_entity(str_entity, file_map, called_entity_ids))

        res = self.service._analyze_entity(unused_method, file_map, called_entity_ids)
        self.assertIsNotNone(res)
        if res is not None:
            self.assertEqual(res.name, "calculate_obsolete_val")
            self.assertEqual(res.entity_type, "method")
            self.assertEqual(res.confidence, "high")


if __name__ == "__main__":
    unittest.main()
