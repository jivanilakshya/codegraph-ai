"""Schemas for high-level source-code symbols."""

from pydantic import BaseModel, Field


class SymbolResponse(BaseModel):
    """Symbols extracted from a source file without persisting analysis output."""

    imports: list[str] = Field(default_factory=list)
    exports: list[str] = Field(default_factory=list)
    functions: list[str] = Field(default_factory=list)
    classes: list[str] = Field(default_factory=list)
    methods: list[str] = Field(default_factory=list)
    variables: list[str] = Field(default_factory=list)
