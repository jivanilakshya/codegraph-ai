"""Schemas for read-only Tree-sitter code exploration."""

from pydantic import BaseModel

from app.schemas.symbols import SymbolResponse
from app.schemas.relationships import Relationship


class AstPoint(BaseModel):
    """A zero-based Tree-sitter source position."""

    row: int
    column: int


class RawAstNode(BaseModel):
    """A JSON-serializable raw Tree-sitter syntax node."""

    type: str
    is_named: bool
    start_byte: int
    end_byte: int
    start_point: AstPoint
    end_point: AstPoint
    children: list["RawAstNode"]


class AstNode(BaseModel):
    """A named syntax node extracted from a source file."""

    name: str
    type: str
    start_line: int
    end_line: int


class FileAstResponse(BaseModel):
    """Raw Tree-sitter AST and extracted symbols for a stored source file."""

    file: str
    language: str
    ast: RawAstNode
    symbols: SymbolResponse
    relationships: list[Relationship]
