"""Pydantic schemas for project-scoped Complexity Analysis."""

from pydantic import BaseModel, Field


class ComplexityItem(BaseModel):
    """Complexity metrics and warnings for a single function or method entity."""

    entity_id: int = Field(..., description="Unique entity ID")
    entity_type: str = Field(..., description="Entity category: function or method")
    name: str = Field(..., description="Function or method name")
    file_id: int = Field(..., description="Containing file ID")
    file_path: str = Field(..., description="Containing file path")
    start_line: int = Field(..., description="Start line number")
    end_line: int = Field(..., description="End line number")
    line_count: int = Field(..., description="Line span count")
    complexity: int = Field(..., description="Cyclomatic complexity score")
    severity: str = Field(..., description="Severity rating: high, medium, low")
    size_warning: str | None = Field(default=None, description="Size warning: very_large, large, or null")


class ComplexitySummary(BaseModel):
    """Breakdown of analyzed functions/methods by complexity and size."""

    total_items: int = Field(default=0, description="Total analyzed functions and methods")
    high_complexity: int = Field(default=0, description="Number of high complexity items (complexity > 10)")
    medium_complexity: int = Field(default=0, description="Number of medium complexity items (complexity 6-10)")
    low_complexity: int = Field(default=0, description="Number of low complexity items (complexity 1-5)")
    average_complexity: float = Field(default=0.0, description="Average complexity score across analyzed items")
    max_complexity: int = Field(default=0, description="Maximum complexity score observed")


class ComplexityResponse(BaseModel):
    """Complete project-scoped complexity analysis response."""

    project_id: int = Field(..., description="Analyzed project ID")
    summary: ComplexitySummary = Field(..., description="Complexity summary metrics")
    items: list[ComplexityItem] = Field(default_factory=list, description="List of analyzed function/method items")
