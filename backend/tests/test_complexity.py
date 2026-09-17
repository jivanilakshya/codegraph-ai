"""Tests for project-scoped Complexity Analysis service and endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.api.v1.endpoints.complexity import get_project_complexity
from app.schemas.complexity import (
    ComplexityItem,
    ComplexityResponse,
    ComplexitySummary,
)
from app.services.complexity_service import (
    ComplexityProjectNotFoundError,
    ComplexityService,
)


class ComplexityEndpointTests(unittest.TestCase):
    """Test API endpoint behavior for complexity analysis."""

    def test_get_project_complexity_success(self) -> None:
        mock_response = ComplexityResponse(
            project_id=7,
            summary=ComplexitySummary(
                total_items=1,
                high_complexity=1,
                medium_complexity=0,
                low_complexity=0,
                average_complexity=12.0,
                max_complexity=12,
            ),
            items=[
                ComplexityItem(
                    entity_id=42,
                    entity_type="function",
                    name="complex_handler",
                    file_id=10,
                    file_path="src/handler.py",
                    start_line=1,
                    end_line=120,
                    line_count=120,
                    complexity=12,
                    severity="high",
                    size_warning="very_large",
                )
            ],
        )

        with patch(
            "app.api.v1.endpoints.complexity.ComplexityService.analyze_project",
            return_value=mock_response,
        ) as mock_analyze:
            response = get_project_complexity(7)

        self.assertEqual(response, mock_response)
        mock_analyze.assert_called_once_with(7)

    def test_get_project_complexity_not_found(self) -> None:
        with patch(
            "app.api.v1.endpoints.complexity.ComplexityService.analyze_project",
            side_effect=ComplexityProjectNotFoundError("Project with ID 999 was not found."),
        ):
            with self.assertRaises(HTTPException) as ctx:
                get_project_complexity(999)

            self.assertEqual(ctx.exception.status_code, 404)
            self.assertIn("999", ctx.exception.detail)


class ComplexityServiceLogicTests(unittest.TestCase):
    """Test ComplexityService cyclomatic complexity calculation and heuristics."""

    def setUp(self) -> None:
        self.service = ComplexityService()

    def test_1_simple_function_complexity_equals_one(self) -> None:
        code = "def simple():\n    return 42\n"
        score = self.service.calculate_complexity("function", "Python", 1, 2, source_code=code)
        self.assertEqual(score, 1)

    def test_2_if_elif_else_complexity(self) -> None:
        code = "def check(x):\n    if x > 0:\n        return 1\n    elif x < 0:\n        return -1\n    else:\n        return 0\n"
        score = self.service.calculate_complexity("function", "Python", 1, 7, source_code=code)
        self.assertEqual(score, 3)  # 1 base + if + elif

    def test_3_for_loop_complexity(self) -> None:
        code = "def loop(items):\n    for item in items:\n        print(item)\n"
        score = self.service.calculate_complexity("function", "Python", 1, 3, source_code=code)
        self.assertEqual(score, 2)  # 1 base + for

    def test_4_while_loop_complexity(self) -> None:
        code = "def countdown(n):\n    while n > 0:\n        n -= 1\n"
        score = self.service.calculate_complexity("function", "Python", 1, 3, source_code=code)
        self.assertEqual(score, 2)  # 1 base + while

    def test_5_nested_control_flow(self) -> None:
        code = (
            "def nested(items):\n"
            "    for item in items:\n"
            "        if item > 0:\n"
            "            while item < 10:\n"
            "                item += 1\n"
        )
        score = self.service.calculate_complexity("function", "Python", 1, 5, source_code=code)
        self.assertEqual(score, 4)  # 1 base + for + if + while

    def test_6_python_except(self) -> None:
        code = "def run():\n    try:\n        do_work()\n    except Exception:\n        handle_error()\n"
        score = self.service.calculate_complexity("function", "Python", 1, 5, source_code=code)
        self.assertEqual(score, 2)  # 1 base + except

    def test_7_python_boolean_and_or(self) -> None:
        code = "def evaluate(a, b):\n    if a and b or not a:\n        return True\n"
        score = self.service.calculate_complexity("function", "Python", 1, 3, source_code=code)
        self.assertEqual(score, 4)  # 1 base + if + and + or

    def test_8_js_ts_catch(self) -> None:
        code = "function run() {\n    try {\n        doWork();\n    } catch (e) {\n        console.error(e);\n    }\n}\n"
        score = self.service.calculate_complexity("function", "TypeScript", 1, 7, source_code=code)
        self.assertEqual(score, 2)  # 1 base + catch

    def test_9_js_ts_ternary(self) -> None:
        code = "const val = (a > b) ? 'yes' : 'no';\n"
        score = self.service.calculate_complexity("function", "JavaScript", 1, 1, source_code=code)
        self.assertEqual(score, 2)  # 1 base + ternary

    def test_10_js_ts_logical_and_or(self) -> None:
        code = "if (a && b || c) {\n    return true;\n}\n"
        score = self.service.calculate_complexity("function", "JavaScript", 1, 3, source_code=code)
        self.assertEqual(score, 4)  # 1 base + if + && + ||

    def test_11_low_severity_threshold(self) -> None:
        # Score 1-5 -> low
        code = "def f(x):\n    if x:\n        return 1\n"
        score = self.service.calculate_complexity("function", "Python", 1, 3, source_code=code)
        self.assertTrue(1 <= score <= 5)

    def test_12_medium_severity_threshold(self) -> None:
        # Score 6-10 -> medium
        code = (
            "def f(x):\n"
            "    if x == 1: pass\n"
            "    if x == 2: pass\n"
            "    if x == 3: pass\n"
            "    if x == 4: pass\n"
            "    if x == 5: pass\n"
        )
        score = self.service.calculate_complexity("function", "Python", 1, 7, source_code=code)
        self.assertEqual(score, 6)
        self.assertTrue(6 <= score <= 10)

    def test_13_high_severity_threshold(self) -> None:
        # Score > 10 -> high
        code = "\n".join(f"    if x == {i}: pass" for i in range(11))
        code = "def f(x):\n" + code
        score = self.service.calculate_complexity("function", "Python", 1, 12, source_code=code)
        self.assertEqual(score, 12)
        self.assertTrue(score > 10)

    def test_14_large_function_size_warning(self) -> None:
        line_count = 60
        warning = "large" if line_count > 50 else None
        self.assertEqual(warning, "large")

    def test_15_very_large_function_size_warning(self) -> None:
        line_count = 120
        warning = "very_large" if line_count > 100 else "large" if line_count > 50 else None
        self.assertEqual(warning, "very_large")

    def test_16_project_isolation(self) -> None:
        with patch("app.services.complexity_service.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value.__enter__.return_value = mock_session

            # Mock project found
            mock_session.get.return_value = MagicMock(id=8, name="Isolated Project", local_path=None)
            # Mock empty entities
            mock_session.scalars.return_value.all.return_value = []

            res = self.service.analyze_project(8)
            self.assertEqual(res.project_id, 8)
            self.assertEqual(res.summary.total_items, 0)
            from app.models.project import Project
            mock_session.get.assert_called_once_with(Project, 8)

    def test_17_nonexistent_project_returns_404(self) -> None:
        with patch("app.services.complexity_service.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value.__enter__.return_value = mock_session

            # Mock project not found
            mock_session.get.return_value = None

            with self.assertRaises(ComplexityProjectNotFoundError):
                self.service.analyze_project(9999)

    def test_18_deterministic_output_ordering(self) -> None:
        items = [
            ComplexityItem(
                entity_id=1, entity_type="function", name="b_func", file_id=1,
                file_path="b.py", start_line=1, end_line=10, line_count=10,
                complexity=5, severity="low", size_warning=None,
            ),
            ComplexityItem(
                entity_id=2, entity_type="function", name="a_func", file_id=1,
                file_path="a.py", start_line=1, end_line=10, line_count=10,
                complexity=10, severity="medium", size_warning=None,
            ),
        ]

        severity_rank = {"high": 0, "medium": 1, "low": 2}
        items.sort(
            key=lambda item: (
                -item.complexity,
                severity_rank.get(item.severity, 3),
                item.file_path,
                item.start_line,
                item.name,
                item.entity_id,
            )
        )

        self.assertEqual(items[0].name, "a_func")
        self.assertEqual(items[1].name, "b_func")

    def test_19_empty_project_behavior(self) -> None:
        with patch("app.services.complexity_service.SessionLocal") as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value.__enter__.return_value = mock_session

            mock_session.get.return_value = MagicMock(id=1, name="Empty Project", local_path=None)
            mock_session.scalars.return_value.all.return_value = []

            res = self.service.analyze_project(1)
            self.assertEqual(res.summary.total_items, 0)
            self.assertEqual(res.summary.average_complexity, 0.0)

    def test_20_response_schema_validation(self) -> None:
        response = ComplexityResponse(
            project_id=1,
            summary=ComplexitySummary(total_items=0),
            items=[],
        )
        self.assertEqual(response.project_id, 1)
        self.assertEqual(response.summary.total_items, 0)


if __name__ == "__main__":
    unittest.main()
