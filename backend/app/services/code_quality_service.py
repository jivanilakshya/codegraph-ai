"""Project-scoped Code Quality Aggregation service."""

import logging

from sqlalchemy import select

from app.database.postgres import SessionLocal
from app.models.project import Project
from app.schemas.code_quality import (
    CodeQualityBreakdown,
    CodeQualityResponse,
    CodeQualitySummary,
)
from app.services.circular_dependency_service import CircularDependencyService
from app.services.complexity_service import ComplexityService
from app.services.dead_code_service import DeadCodeService

logger = logging.getLogger(__name__)


class CodeQualityProjectNotFoundError(Exception):
    """Raised when the specified project ID does not exist."""


class CodeQualityServiceError(Exception):
    """Base error raised during code quality aggregation."""


class CodeQualityService:
    """Aggregate project health metrics from dead code, circular dependencies, and complexity analysis."""

    def analyze_project(self, project_id: int) -> CodeQualityResponse:
        """Perform project-scoped code quality aggregation and score calculation."""
        try:
            with SessionLocal() as session:
                project = session.get(Project, project_id)
                if project is None:
                    raise CodeQualityProjectNotFoundError(
                        f"Project with ID {project_id} was not found."
                    )

            # Re-use existing analysis services directly (no duplicate HTTP/analysis logic)
            dead_code_res = DeadCodeService().detect_dead_code(project_id)
            circular_dep_res = CircularDependencyService().detect_cycles(project_id)
            complexity_res = ComplexityService().analyze_project(project_id)

            # Dead code counts & penalties
            dead_code_high_count = sum(
                1 for item in dead_code_res.items if item.confidence.lower() == "high"
            )
            dead_code_medium_count = sum(
                1 for item in dead_code_res.items if item.confidence.lower() == "medium"
            )
            dead_code_low_count = sum(
                1 for item in dead_code_res.items if item.confidence.lower() == "low"
            )
            dead_code_penalty = min(
                30,
                (dead_code_high_count * 5)
                + (dead_code_medium_count * 3)
                + (dead_code_low_count * 1),
            )

            # Circular dependency counts & penalties
            circ_high_count = circular_dep_res.summary.high_severity
            circ_medium_count = circular_dep_res.summary.medium_severity
            circ_low_count = circular_dep_res.summary.low_severity
            circ_penalty = min(
                35,
                (circ_high_count * 15)
                + (circ_medium_count * 10)
                + (circ_low_count * 5),
            )

            # Complexity counts & penalties
            comp_high_count = complexity_res.summary.high_complexity
            comp_medium_count = complexity_res.summary.medium_complexity
            comp_very_large_count = sum(
                1 for item in complexity_res.items if item.size_warning == "very_large"
            )
            comp_large_count = sum(
                1 for item in complexity_res.items if item.size_warning == "large"
            )
            comp_penalty = min(
                35,
                (comp_high_count * 8)
                + (comp_medium_count * 3)
                + (comp_very_large_count * 2)
                + (comp_large_count * 1),
            )

            total_penalty = dead_code_penalty + circ_penalty + comp_penalty
            overall_score = max(0, min(100, 100 - total_penalty))

            # Grade thresholds
            if overall_score >= 90:
                quality_grade = "A"
            elif overall_score >= 80:
                quality_grade = "B"
            elif overall_score >= 70:
                quality_grade = "C"
            elif overall_score >= 60:
                quality_grade = "D"
            else:
                quality_grade = "F"

            summary = CodeQualitySummary(
                project_id=project_id,
                overall_score=overall_score,
                quality_grade=quality_grade,
                dead_code_count=dead_code_res.total_candidates,
                dead_code_high_confidence_count=dead_code_high_count,
                circular_dependency_count=circular_dep_res.summary.total_cycles,
                high_circular_dependency_count=circ_high_count,
                complexity_total=complexity_res.summary.total_items,
                high_complexity_count=comp_high_count,
                medium_complexity_count=comp_medium_count,
                low_complexity_count=complexity_res.summary.low_complexity,
                average_complexity=complexity_res.summary.average_complexity,
                max_complexity=complexity_res.summary.max_complexity,
            )

            breakdown = CodeQualityBreakdown(
                dead_code=dead_code_res.summary,
                circular_dependency=circular_dep_res.summary,
                complexity=complexity_res.summary,
            )

            return CodeQualityResponse(
                project_id=project_id,
                summary=summary,
                breakdown=breakdown,
            )
        except CodeQualityProjectNotFoundError:
            raise
        except Exception as error:
            logger.exception("Unexpected error during code quality analysis for project %s", project_id)
            raise CodeQualityServiceError("Code quality analysis failed.") from error
