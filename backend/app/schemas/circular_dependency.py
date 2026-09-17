"""Pydantic schemas for project-scoped Circular Dependency Detection."""

from pydantic import BaseModel, Field


class CircularDependencyItem(BaseModel):
    """Potential circular dependency cycle between workspace files."""

    id: str = Field(..., description="Unique cycle identifier, e.g. cycle_10_20")
    project_id: int = Field(..., description="Analyzed project ID")
    cycle: list[str] = Field(..., description="Ordered file paths forming the cycle path e.g. [A, B, A]")
    cycle_length: int = Field(..., description="Number of unique files involved in the cycle")
    severity: str = Field(..., description="Severity rating: high, medium, low")
    explanation: str = Field(..., description="Human-readable architectural explanation")
    file_ids: list[int] = Field(..., description="Unique file IDs in cycle order")
    file_paths: list[str] = Field(..., description="Unique file paths in cycle order")


class CircularDependencySummary(BaseModel):
    """Breakdown of detected cycles by severity and max length."""

    total_cycles: int = Field(default=0, description="Total detected dependency cycles")
    high_severity: int = Field(default=0, description="Number of high severity cycles (length >= 4)")
    medium_severity: int = Field(default=0, description="Number of medium severity cycles (length == 3)")
    low_severity: int = Field(default=0, description="Number of low severity cycles (length == 2)")
    max_cycle_length: int = Field(default=0, description="Maximum cycle length observed")


class CircularDependencyResponse(BaseModel):
    """Complete project-scoped circular dependency analysis response."""

    project_id: int = Field(..., description="Analyzed project ID")
    summary: CircularDependencySummary = Field(..., description="Cycle summary metrics")
    cycles: list[CircularDependencyItem] = Field(default_factory=list, description="List of detected dependency cycles")
