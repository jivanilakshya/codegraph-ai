"""Pydantic schemas for project-scoped Code Quality Dashboard."""

from pydantic import BaseModel, Field

from app.schemas.circular_dependency import CircularDependencySummary
from app.schemas.complexity import ComplexitySummary
from app.schemas.dead_code import DeadCodeSummary


class CodeQualitySummary(BaseModel):
    """Aggregated project health metrics, score, and grade."""

    project_id: int = Field(..., description="Analyzed project ID")
    overall_score: int = Field(..., description="Deterministic project health score (0-100)")
    quality_grade: str = Field(..., description="Letter grade: A, B, C, D, or F")
    dead_code_count: int = Field(default=0, description="Total candidate dead code items")
    dead_code_high_confidence_count: int = Field(default=0, description="High confidence dead code candidates")
    circular_dependency_count: int = Field(default=0, description="Total circular dependency cycles")
    high_circular_dependency_count: int = Field(default=0, description="High severity circular dependency cycles")
    complexity_total: int = Field(default=0, description="Total analyzed functions and methods")
    high_complexity_count: int = Field(default=0, description="High complexity functions (>10)")
    medium_complexity_count: int = Field(default=0, description="Medium complexity functions (6-10)")
    low_complexity_count: int = Field(default=0, description="Low complexity functions (1-5)")
    average_complexity: float = Field(default=0.0, description="Average complexity score")
    max_complexity: int = Field(default=0, description="Maximum complexity score observed")


class CodeQualityBreakdown(BaseModel):
    """Detailed domain summaries for dead code, circular dependencies, and complexity."""

    dead_code: DeadCodeSummary = Field(..., description="Dead code detection summary")
    circular_dependency: CircularDependencySummary = Field(..., description="Circular dependency summary")
    complexity: ComplexitySummary = Field(..., description="Complexity analysis summary")


class CodeQualityResponse(BaseModel):
    """Complete project-scoped code quality dashboard response."""

    project_id: int = Field(..., description="Analyzed project ID")
    summary: CodeQualitySummary = Field(..., description="Aggregated summary score and counts")
    breakdown: CodeQualityBreakdown = Field(..., description="Domain breakdown metrics")
