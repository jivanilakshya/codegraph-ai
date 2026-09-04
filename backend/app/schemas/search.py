"""Schemas for semantic code search."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SemanticSearchRequest(BaseModel):
    """Request payload for semantic code search."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Natural language search query to find relevant code chunks.",
        examples=["Where is the database connection created?"],
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Maximum number of semantically relevant chunks to return.",
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Optional project ID to filter results to a specific project.",
    )

    @field_validator("query")
    @classmethod
    def validate_query_not_whitespace(cls, v: str) -> str:
        """Validate that the query string is not empty or whitespace-only."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query string cannot be empty or contain only whitespace.")
        return stripped


class SemanticSearchResult(BaseModel):
    """A single semantically matching code chunk result with similarity score."""

    score: float = Field(..., description="Cosine similarity score of the chunk to the search query.")
    content: str = Field(..., description="Source code content of the matching chunk.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata associated with the chunk (file_path, language, start_line, end_line, entity_type, etc.).",
    )


class SemanticSearchResponse(BaseModel):
    """Response payload for semantic search results."""

    query: str = Field(..., description="The search query that was executed.")
    total_results: int = Field(..., description="Total number of results returned.")
    results: List[SemanticSearchResult] = Field(
        default_factory=list,
        description="List of semantically similar code chunk matches.",
    )
