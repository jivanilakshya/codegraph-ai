"""Schemas for RAG (Retrieval-Augmented Generation) retrieval layer."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


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
    file_path: Optional[str] = Field(
        default=None,
        description="Optional repository-relative file path to restrict retrieval.",
        examples=["backend/auth.py"],
    )
    entity_name: Optional[str] = Field(
        default=None,
        description="Optional code entity/symbol name to restrict retrieval.",
        examples=["authenticate_user"],
    )
    language: Optional[str] = Field(
        default=None,
        description="Optional programming language filter.",
        examples=["python"],
    )
    entity_type: Optional[str] = Field(
        default=None,
        description="Optional entity type filter (e.g., function, class).",
        examples=["function"],
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


class RAGSearchRequest(RAGRetrievalRequest):
    """Request payload for dedicated RAG semantic search."""

    pass


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
    entity_name: Optional[str] = Field(default=None, description="Identifier name of the code entity (alias to name).")
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
    applied_filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Metadata filters applied during retrieval.",
    )
    retrieval_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Configuration parameters used during retrieval.",
    )
    context: str = Field(..., description="Formatted textual context prompt prepared for the LLM.")


class RAGGenerationRequest(BaseModel):
    """Request payload for RAG-driven LLM answer generation."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Natural language question to retrieve context and generate answer for.",
        examples=["Where is user authentication handled?"],
    )
    project_id: int = Field(
        ...,
        ge=1,
        description="Required project ID. Generation is always restricted to this project.",
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
        description="Optional minimum similarity score threshold (0.0 to 1.0, default: 0.0).",
        examples=[0.5],
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override name. If omitted, default configured model will be used.",
        examples=["qwen2.5-coder:7b"],
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Optional custom system prompt instruction for the LLM.",
        examples=["You are an expert Python security reviewer."],
    )

    @field_validator("query")
    @classmethod
    def validate_query_not_whitespace(cls, v: str) -> str:
        """Validate that query is non-empty and not whitespace-only."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query string cannot be empty or contain only whitespace.")
        return stripped


class RAGGenerationResponse(BaseModel):
    """Response payload for RAG-driven LLM answer generation."""

    query: str = Field(..., description="The original user query.")
    project_id: Optional[int] = Field(default=None, description="Project ID filter applied, if any.")
    answer: str = Field(..., description="Generated answer from the Qwen LLM based on retrieved context.")
    model: str = Field(..., description="Model name that produced the answer.")
    total_chunks: int = Field(..., description="Total number of relevant chunks retrieved and used for generation.")
    sources: List[RAGChunkResult] = Field(
        default_factory=list,
        description="Ordered list of source code chunks retrieved for context attribution.",
    )
    context: str = Field(..., description="Full formatted context prompt supplied to the LLM.")


class GraphContextDetail(BaseModel):
    """Structured graph relationship metadata for a file or code entity."""

    file_path: str = Field(..., description="Repository-relative file path.")
    entity_name: Optional[str] = Field(default=None, description="Identifier name of the code entity, if applicable.")
    entity_type: Optional[str] = Field(default=None, description="Entity type (e.g., function, class, variable).")
    calls: List[str] = Field(default_factory=list, description="Entities called by this entity.")
    called_by: List[str] = Field(default_factory=list, description="Entities calling this entity.")
    imports: List[str] = Field(default_factory=list, description="Files imported by this entity's file.")
    imported_by: List[str] = Field(default_factory=list, description="Files importing this entity's file.")


class RAGAskRequest(BaseModel):
    """Canonical request payload for a project-scoped codebase question."""

    project_id: int = Field(
        ...,
        ge=1,
        description="Required project ID. Retrieval and graph context are restricted to this project.",
        examples=[93],
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Natural language question about the selected codebase.",
        examples=["What files are responsible for user authentication?"],
    )

    @field_validator("question")
    @classmethod
    def validate_question_not_whitespace(cls, value: str) -> str:
        """Reject whitespace-only questions before orchestration begins."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Question cannot be empty or contain only whitespace.")
        return stripped


class GraphRAGGenerationRequest(BaseModel):
    """Request payload for Graph-Enriched RAG LLM answer generation."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Natural language question to retrieve context and generate answer for.",
        examples=["Where is user authentication handled and what functions does it call?"],
    )
    project_id: int = Field(
        ...,
        ge=1,
        description="Required project ID. Vector retrieval and graph lookup are restricted to this project.",
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
        description="Optional minimum similarity score threshold (0.0 to 1.0, default: 0.0).",
        examples=[0.5],
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override name. If omitted, default configured model will be used.",
        examples=["qwen2.5-coder:7b"],
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Optional custom system prompt instruction for the LLM.",
        examples=["You are an expert Python codebase architect."],
    )
    include_calls: bool = Field(
        default=True,
        description="Whether to include function/method CALLS relationships in graph context.",
    )
    include_imports: bool = Field(
        default=True,
        description="Whether to include module/file IMPORTS relationships in graph context.",
    )

    @field_validator("query")
    @classmethod
    def validate_query_not_whitespace(cls, v: str) -> str:
        """Validate that query is non-empty and not whitespace-only."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query string cannot be empty or contain only whitespace.")
        return stripped


class GraphRAGGenerationResponse(BaseModel):
    """Response payload for Graph-Enriched RAG LLM answer generation."""

    query: str = Field(..., description="The original user query.")
    project_id: Optional[int] = Field(default=None, description="Project ID filter applied, if any.")
    answer: str = Field(..., description="Generated answer from the Qwen LLM based on vector and graph context.")
    model: str = Field(..., description="Model name that produced the answer.")
    total_chunks: int = Field(..., description="Total number of relevant chunks retrieved and used for generation.")
    sources: List[RAGChunkResult] = Field(
        default_factory=list,
        description="Ordered list of source code chunks retrieved for context attribution.",
    )
    graph_context: List[GraphContextDetail] = Field(
        default_factory=list,
        description="Structured knowledge graph relationship details for retrieved entities and files.",
    )
    context: str = Field(..., description="Full formatted context prompt supplied to the LLM.")


class RAGExplanationRequest(BaseModel):
    """Request payload for Code Entity Explanation & Targeted RAG Pipeline."""

    entity_name: Optional[str] = Field(
        default=None,
        description="Identifier name of the symbol, function, or class to explain.",
        examples=["authenticate_user"],
    )
    file_path: Optional[str] = Field(
        default=None,
        description="Optional relative file path to scope the symbol lookup.",
        examples=["backend/auth.py"],
    )
    query: Optional[str] = Field(
        default=None,
        description="Optional custom natural language question about the entity.",
        examples=["Explain how authentication error handling works"],
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Optional project ID to restrict symbol lookup and retrieval.",
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
        description="Optional minimum similarity score threshold (0.0 to 1.0, default: 0.0).",
        examples=[0.5],
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override name.",
        examples=["qwen2.5-coder:7b"],
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Optional custom system prompt instruction for the LLM.",
    )
    include_graph_context: bool = Field(
        default=True,
        description="Whether to include graph callers, callees, and file imports context.",
    )

    @model_validator(mode="after")
    def check_at_least_one_target(self) -> "RAGExplanationRequest":
        """Ensure at least one target identifier (entity_name, file_path, or query) is provided."""
        has_entity = bool(self.entity_name and self.entity_name.strip())
        has_file = bool(self.file_path and self.file_path.strip())
        has_query = bool(self.query and self.query.strip())
        if not (has_entity or has_file or has_query):
            raise ValueError("At least one of 'entity_name', 'file_path', or 'query' must be provided.")
        return self


class RAGExplanationResponse(BaseModel):
    """Response payload for Code Entity Explanation & Targeted RAG Pipeline."""

    entity_name: Optional[str] = Field(default=None, description="Identifier name of the target entity explained.")
    file_path: Optional[str] = Field(default=None, description="File path of the target entity explained.")
    query: str = Field(..., description="The effective query or explanation prompt processed.")
    project_id: Optional[int] = Field(default=None, description="Project ID filter applied, if any.")
    explanation: str = Field(..., description="Generated explanation from the Qwen LLM.")
    model: str = Field(..., description="Model name that produced the explanation.")
    total_chunks: int = Field(..., description="Total number of relevant chunks retrieved and used.")
    sources: List[RAGChunkResult] = Field(
        default_factory=list,
        description="Ordered list of source code chunks retrieved for context attribution.",
    )
    graph_context: List[GraphContextDetail] = Field(
        default_factory=list,
        description="Structured knowledge graph relationship details for the entity.",
    )
    context: str = Field(..., description="Full formatted context prompt supplied to the LLM.")


class ImpactAnalysisRequest(BaseModel):
    """Request payload for Change Impact Analysis RAG Pipeline."""

    entity_name: Optional[str] = Field(
        default=None,
        description="Identifier name of the target symbol, function, or class to analyze impact for.",
        examples=["authenticate_user"],
    )
    file_path: Optional[str] = Field(
        default=None,
        description="Optional relative file path of the target to analyze impact for.",
        examples=["backend/auth.py"],
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Optional project ID to restrict impact analysis scope.",
        examples=[93],
    )
    depth: int = Field(
        default=1,
        ge=1,
        le=3,
        description="Reverse dependency traversal depth (1 to 3, default: 1). Depth 1 returns direct dependents only.",
        examples=[1],
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
        description="Optional minimum similarity score threshold (0.0 to 1.0, default: 0.0).",
        examples=[0.5],
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override name.",
        examples=["qwen2.5-coder:7b"],
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Optional custom system prompt instruction for the LLM.",
    )
    include_calls: bool = Field(
        default=True,
        description="Whether to include reverse CALLS relationships (entities calling the target).",
    )
    include_imports: bool = Field(
        default=True,
        description="Whether to include reverse IMPORTS relationships (files importing the target file).",
    )

    @model_validator(mode="after")
    def check_at_least_one_target(self) -> "ImpactAnalysisRequest":
        """Ensure target fields are valid and at least one non-whitespace target is provided."""
        if self.entity_name is not None and not self.entity_name.strip():
            raise ValueError("entity_name cannot be empty or contain only whitespace.")
        if self.file_path is not None and not self.file_path.strip():
            raise ValueError("file_path cannot be empty or contain only whitespace.")

        clean_entity = self.entity_name.strip() if self.entity_name else None
        clean_file = self.file_path.strip() if self.file_path else None
        if not clean_entity and not clean_file:
            raise ValueError("At least one of 'entity_name' or 'file_path' must be provided.")
        return self


class AffectedEntity(BaseModel):
    """A single entity or file affected by changes to the analysis target."""

    entity_name: Optional[str] = Field(default=None, description="Name of the affected entity, if applicable.")
    entity_type: Optional[str] = Field(default=None, description="Type of the affected entity (e.g., function, class).")
    file_path: str = Field(..., description="Repository-relative file path containing the affected entity.")
    relationship: str = Field(..., description="How this entity is affected (e.g., 'CALLS target', 'IMPORTS target file').")
    depth: int = Field(..., description="Dependency depth at which the affected entity was discovered (1 = direct).")


class ImpactAnalysisResponse(BaseModel):
    """Response payload for Change Impact Analysis RAG Pipeline."""

    entity_name: Optional[str] = Field(default=None, description="Identifier name of the target entity analyzed.")
    file_path: Optional[str] = Field(default=None, description="File path of the target analyzed.")
    query: str = Field(..., description="The effective query used for impact analysis.")
    project_id: Optional[int] = Field(default=None, description="Project ID filter applied, if any.")
    analysis: str = Field(..., description="Generated impact analysis from the Qwen LLM.")
    model: str = Field(..., description="Model name that produced the analysis.")
    affected_entities: List[AffectedEntity] = Field(
        default_factory=list,
        description="Structured list of entities and files affected by changes to the target.",
    )
    total_affected: int = Field(..., description="Total number of affected entities and files discovered.")
    depth: int = Field(..., description="Traversal depth used for the analysis.")
    total_chunks: int = Field(..., description="Total number of relevant code chunks retrieved.")
    sources: List[RAGChunkResult] = Field(
        default_factory=list,
        description="Ordered list of source code chunks retrieved for context attribution.",
    )
    context: str = Field(..., description="Full formatted context prompt supplied to the LLM.")
