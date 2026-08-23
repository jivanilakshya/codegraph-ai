"""Schemas for code chunking."""

from pydantic import BaseModel


class CodeChunk(BaseModel):
    """A semantic chunk of code extracted from a source file."""

    content: str
    start_line: int
    end_line: int
    start_byte: int
    end_byte: int
    name: str | None = None
    entity_type: str | None = None
