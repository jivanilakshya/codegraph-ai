"""Pydantic schemas for Project Settings management."""

from pydantic import BaseModel, Field


class ProjectSettingsRead(BaseModel):
    """Full project settings payload returned to the frontend."""

    project_id: int = Field(..., description="Project ID")
    protected_exclusions: list[str] = Field(
        ...,
        description="Immutable backend default exclusion patterns",
    )
    custom_exclusions: list[str] = Field(
        default_factory=list,
        description="User-configured project-specific exclusion patterns",
    )
    max_file_size_mb: float = Field(
        default=5.0,
        ge=0.1,
        le=100.0,
        description="Maximum scan file size threshold in megabytes",
    )
    enable_complexity: bool = Field(
        default=True,
        description="Enable cyclomatic complexity analysis",
    )
    enable_dead_code: bool = Field(
        default=True,
        description="Enable dead code detection",
    )
    enable_circular_dependency: bool = Field(
        default=True,
        description="Enable circular dependency detection",
    )
    ollama_model: str = Field(
        default="qwen2.5-coder:7b",
        description="Selected Ollama LLM model name",
    )
    use_graph_context: bool = Field(
        default=True,
        description="Enable Neo4j graph context during chat/RAG reasoning",
    )
    use_search_context: bool = Field(
        default=True,
        description="Enable vector/code search context during chat/RAG reasoning",
    )
    available_ollama_models: list[str] = Field(
        default_factory=list,
        description="Dynamically fetched available Ollama models",
    )


class ProjectSettingsUpdate(BaseModel):
    """Payload for updating project settings."""

    custom_exclusions: list[str] = Field(
        default_factory=list,
        description="User-configured project-specific exclusion patterns",
    )
    max_file_size_mb: float = Field(
        default=5.0,
        ge=0.1,
        le=100.0,
        description="Maximum scan file size threshold in megabytes",
    )
    enable_complexity: bool = Field(
        default=True,
        description="Enable cyclomatic complexity analysis",
    )
    enable_dead_code: bool = Field(
        default=True,
        description="Enable dead code detection",
    )
    enable_circular_dependency: bool = Field(
        default=True,
        description="Enable circular dependency detection",
    )
    ollama_model: str = Field(
        default="qwen2.5-coder:7b",
        description="Selected Ollama LLM model name",
    )
    use_graph_context: bool = Field(
        default=True,
        description="Enable Neo4j graph context during chat/RAG reasoning",
    )
    use_search_context: bool = Field(
        default=True,
        description="Enable vector/code search context during chat/RAG reasoning",
    )
