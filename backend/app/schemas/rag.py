"""Schemas for RAG (Retrieval-Augmented Generation) retrieval layer."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class RAGRetrievalRequest(BaseModel):
    """Request payload for RAG retrieval."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Natural language question or query to retrieve relevant code chunks for RAG context.",
        examples=["Where is user authentication handled?"],
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Optional project ID to restrict retrieval to a specific project.",
        examples=[93],
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of most relevant code chunks to retrieve (1 to 20, default: 5).",
        examples=[5],
    )
    similarity_threshold: Optional[float] = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Optional minimum similarity score threshold (0.0 to 1.0, default: 0.0) to filter out weak matches.",
        examples=[0.5],
    )

    @field_validator("query")
    @classmethod
    def validate_query_not_whitespace(cls, v: str) -> str:
        """Validate that the query string is not empty or whitespace-only."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query string cannot be empty or contain only whitespace.")
        return stripped


class RAGChunkResult(BaseModel):
    """A single relevant code chunk with similarity score and preserved metadata."""

    score: float = Field(..., description="Cosine similarity score of the chunk to the query.")
    file_path: Optional[str] = Field(default=None, description="Repository-relative file path of the source file.")
    start_line: Optional[int] = Field(default=None, description="Starting line number (1-based) of the chunk.")
    end_line: Optional[int] = Field(default=None, description="Ending line number (1-based) of the chunk.")
    start_byte: Optional[int] = Field(default=None, description="Starting byte offset of the chunk.")
    end_byte: Optional[int] = Field(default=None, description="Ending byte offset of the chunk.")
    language: Optional[str] = Field(default=None, description="Programming language of the source file.")
    entity_type: Optional[str] = Field(default=None, description="Entity type (e.g., function, class, route).")
    name: Optional[str] = Field(default=None, description="Identifier name of the code entity.")
    project_id: Optional[int] = Field(default=None, description="Project ID owning the code chunk.")
    content: str = Field(..., description="Source code content of the chunk.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional raw metadata payload preserved from vector indexing.",
    )


class RAGRetrievalResponse(BaseModel):
    """Response payload for RAG retrieval containing structured results and formatted context."""

    query: str = Field(..., description="The original user query.")
    project_id: Optional[int] = Field(default=None, description="Project ID filter applied, if any.")
    total_results: int = Field(..., description="Total number of relevant chunks returned after filtering and deduplication.")
    results: List[RAGChunkResult] = Field(
        default_factory=list,
        description="Ordered list of relevant code chunks.",
    )
    context: str = Field(..., description="Formatted textual context prompt prepared for the LLM.")
