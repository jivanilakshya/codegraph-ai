"""Schemas for source-code relationships."""

from pydantic import BaseModel


class Relationship(BaseModel):
    """A directed relationship between two source-code symbols."""

    source: str
    target: str
    relationship: str
