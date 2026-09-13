"""Schemas for LLM generation service."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class LLMGenerateRequest(BaseModel):
    """Request payload for direct LLM generation."""

    prompt: str = Field(
        ...,
        min_length=1,
        description="Prompt text sent to the LLM.",
        examples=["Explain what a Python function is."],
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override name. If omitted, the default configured model will be used.",
        examples=["qwen2.5-coder:7b"],
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt_not_whitespace(cls, v: str) -> str:
        """Validate that prompt is non-empty and not whitespace-only."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Prompt string cannot be empty or contain only whitespace.")
        return stripped


class LLMGenerateResponse(BaseModel):
    """Response payload for direct LLM generation."""

    response: str = Field(
        ...,
        description="Clean text response returned by the LLM.",
    )
    model: str = Field(
        ...,
        description="Model name that produced the response.",
        examples=["qwen2.5-coder:7b"],
    )
