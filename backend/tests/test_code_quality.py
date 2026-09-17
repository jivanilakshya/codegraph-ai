"""Tests for project-scoped Code Quality aggregation service and endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.api.v1.endpoints.code_quality import get_project_code_quality
from app.models.project import Project
from app.schemas.circular_dependency import CircularDependencyResponse, CircularDependencySummary
from app.schemas.code_quality import (
    CodeQualityBreakdown,
    CodeQualityResponse,
    CodeQualitySummary,
)
from app.schemas.complexity import ComplexityItem, ComplexityResponse, ComplexitySummary
from app.schemas.dead_code import DeadCodeItem, DeadCodeResponse, DeadCodeSummary
from app.services.code_quality_service import (
    CodeQualityProjectNotFoundError,
    CodeQualityService,
)


class CodeQualityEndpointTests(unittest.TestCase):
    """Test API endpoint behavior for code quality dashboard."""

    def test_get_project_code_quality_success(self) -> None:
        mock_response = CodeQualityResponse(
            project_id=7,
            summary=CodeQualitySummary(
                project_id=7,
                overall_score=85,
                quality_grade="B",
                dead_code_count=2,
                circular_dependency_count=1,
                complexity_total=5,
            ),
            breakdown=CodeQualityBreakdown(
                dead_code=DeadCodeSummary(files=1, functions=1),
                circular_dependency=CircularDependencySummary(total_cycles=1, low_severity=1),
                complexity=ComplexitySummary(total_items=5, low_complexity=5),
            ),
        )

        with patch(
            "app.api.v1.endpoints.code_quality.CodeQualityService.analyze_project",
            return_value=mock_response,
        ) as mock_analyze:
            response = get_project_code_quality(7)

        self.assertEqual(response, mock_response)
        mock_analyze.assert_called_once_with(7)

    def test_get_project_code_quality_not_found(self) -> None:
        with patch(
            "app.api.v1.endpoints.code_quality.CodeQualityService.analyze_project",
            side_effect=CodeQualityProjectNotFoundError("Project with ID 999 was not found."),
        ):
            with self.assertRaises(HTTPException) as ctx:
                get_project_code_quality(999)

            self.assertEqual(ctx.exception.status_code, 404)
            self.assertIn("999", ctx.exception.detail)


class CodeQualityServiceLogicTests(unittest.TestCase):
    """Test CodeQualityService penalty calculation, grading, and service aggregation."""

    def setUp(self) -> None:
        self.service = CodeQualityService()

    @patch("app.services.code_quality_service.DeadCodeService.detect_dead_code")
    @patch("app.services.code_quality_service.CircularDependencyService.detect_cycles")
    @patch("app.services.code_quality_service.ComplexityService.analyze_project")
    @patch("app.services.code_quality_service.SessionLocal")
    def test_no_issues_produces_score_100_grade_A(
        self, mock_session_cls: MagicMock, mock_comp: MagicMock, mock_circ: MagicMock, mock_dead: MagicMock
    ) -> None:
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.get.return_value = MagicMock(id=1, name="Clean Project")

        mock_dead.return_value = DeadCodeResponse(
            project_id=1, total_candidates=0, summary=DeadCodeSummary(), items=[]
        )
        mock_circ.return_value = CircularDependencyResponse(
            project_id=1, summary=CircularDependencySummary(), cycles=[]
        )
        mock_comp.return_value = ComplexityResponse(
            project_id=1, summary=ComplexitySummary(), items=[]
        )

        res = self.service.analyze_project(1)
        self.assertEqual(res.project_id, 1)
        self.assertEqual(res.summary.overall_score, 100)
        self.assertEqual(res.summary.quality_grade, "A")
        mock_session.get.assert_called_once_with(Project, 1)

    @patch("app.services.code_quality_service.DeadCodeService.detect_dead_code")
    @patch("app.services.code_quality_service.CircularDependencyService.detect_cycles")
    @patch("app.services.code_quality_service.ComplexityService.analyze_project")
    @patch("app.services.code_quality_service.SessionLocal")
    def test_high_severity_issues_produce_stronger_penalties(
        self, mock_session_cls: MagicMock, mock_comp: MagicMock, mock_circ: MagicMock, mock_dead: MagicMock
    ) -> None:
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.get.return_value = MagicMock(id=2, name="Problem Project")

        # Dead code with 1 high confidence candidate (-5)
        mock_dead.return_value = DeadCodeResponse(
            project_id=2,
            total_candidates=1,
            summary=DeadCodeSummary(functions=1),
            items=[
                DeadCodeItem(
                    id="entity_1", entity_type="function", name="dead1", file_id=1,
                    file_path="a.py", start_line=1, end_line=10, confidence="high", reason="unused"
                )
            ],
        )

        # 1 high severity circular dependency (-15)
        mock_circ.return_value = CircularDependencyResponse(
            project_id=2,
            summary=CircularDependencySummary(total_cycles=1, high_severity=1, max_cycle_length=4),
            cycles=[],
        )

        # 1 high complexity function (-8)
        mock_comp.return_value = ComplexityResponse(
            project_id=2,
            summary=ComplexitySummary(total_items=1, high_complexity=1, max_complexity=15),
            items=[
                ComplexityItem(
                    entity_id=10, entity_type="function", name="complex1", file_id=1,
                    file_path="a.py", start_line=1, end_line=20, line_count=20,
                    complexity=15, severity="high", size_warning=None
                )
            ],
        )

        res = self.service.analyze_project(2)

        # Penalties: Dead code = 5, Circ = 15, Comp = 8. Total penalty = 28. Score = 100 - 28 = 72 (Grade C)
        self.assertEqual(res.summary.overall_score, 72)
        self.assertEqual(res.summary.quality_grade, "C")
        self.assertEqual(res.summary.dead_code_count, 1)
        self.assertEqual(res.summary.high_circular_dependency_count, 1)
        self.assertEqual(res.summary.high_complexity_count, 1)

    @patch("app.services.code_quality_service.DeadCodeService.detect_dead_code")
    @patch("app.services.code_quality_service.CircularDependencyService.detect_cycles")
    @patch("app.services.code_quality_service.ComplexityService.analyze_project")
    @patch("app.services.code_quality_service.SessionLocal")
    def test_score_bounded_between_0_and_100(
        self, mock_session_cls: MagicMock, mock_comp: MagicMock, mock_circ: MagicMock, mock_dead: MagicMock
    ) -> None:
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.get.return_value = MagicMock(id=3, name="Bad Project")

        # Huge penalties exceeding 100
        mock_dead.return_value = DeadCodeResponse(
            project_id=3,
            total_candidates=10,
            summary=DeadCodeSummary(functions=10),
            items=[
                DeadCodeItem(
                    id=f"entity_{i}", entity_type="function", name=f"dead{i}", file_id=1,
                    file_path="a.py", start_line=1, end_line=10, confidence="high", reason="unused"
                )
                for i in range(10)
            ],
        )

        mock_circ.return_value = CircularDependencyResponse(
            project_id=3,
            summary=CircularDependencySummary(total_cycles=5, high_severity=5, max_cycle_length=4),
            cycles=[],
        )

        mock_comp.return_value = ComplexityResponse(
            project_id=3,
            summary=ComplexitySummary(total_items=10, high_complexity=10, max_complexity=20),
            items=[],
        )

        res = self.service.analyze_project(3)
        self.assertTrue(0 <= res.summary.overall_score <= 100)
        self.assertEqual(res.summary.overall_score, 0)
        self.assertEqual(res.summary.quality_grade, "F")

    def test_grade_thresholds(self) -> None:
        # 90-100 -> A, 80-89 -> B, 70-79 -> C, 60-69 -> D, 0-59 -> F
        self.assertTrue(90 >= 90)

    @patch("app.services.code_quality_service.SessionLocal")
    def test_nonexistent_project_returns_404(self, mock_session_cls: MagicMock) -> None:
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.get.return_value = None

        with self.assertRaises(CodeQualityProjectNotFoundError):
            self.service.analyze_project(9999)


if __name__ == "__main__":
    unittest.main()
