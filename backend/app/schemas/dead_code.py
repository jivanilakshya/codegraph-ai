"""Pydantic schemas for project-scoped Dead Code Detection."""

from pydantic import BaseModel, Field


class DeadCodeItem(BaseModel):
    """Potential dead code candidate entity or file."""

    id: str = Field(..., description="Unique candidate ID e.g. entity_42 or file_12")
    entity_type: str = Field(..., description="Entity category: file, class, function, method, variable")
    name: str = Field(..., description="Symbol name or file path")
    file_id: int = Field(..., description="Containing file ID")
    file_path: str = Field(..., description="Containing file path")
    start_line: int | None = Field(default=None, description="Start line number")
    end_line: int | None = Field(default=None, description="End line number")
    confidence: str = Field(..., description="Confidence rating: high, medium, low")
    reason: str = Field(..., description="Explanation for potential dead code classification")


class DeadCodeSummary(BaseModel):
    """Breakdown of candidates by entity type."""

    files: int = Field(default=0, description="Number of candidate files")
    classes: int = Field(default=0, description="Number of candidate classes")
    functions: int = Field(default=0, description="Number of candidate functions")
    methods: int = Field(default=0, description="Number of candidate methods")
    variables: int = Field(default=0, description="Number of candidate variables")


class DeadCodeResponse(BaseModel):
    """Complete project-scoped dead code analysis response."""

    project_id: int = Field(..., description="Analyzed project ID")
    total_candidates: int = Field(..., description="Total candidate count")
    summary: DeadCodeSummary = Field(..., description="Breakdown summary by entity type")
    items: list[DeadCodeItem] = Field(default_factory=list, description="List of detected candidates")
