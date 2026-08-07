"""Response schemas for project code graphs."""

from typing import Literal

from pydantic import BaseModel


GraphNodeType = Literal["file", "class", "function", "method", "variable", "module"]
GraphRelationshipType = Literal[
    "IMPORTS", "EXPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "CONTAINS"
]


class GraphNode(BaseModel):
    """One visualizable source-code entity in a project graph."""

    id: str
    label: str
    type: GraphNodeType
    file_id: int | None
    project_id: int


class GraphEdge(BaseModel):
    """A directed relationship between two graph nodes."""

    source: str
    target: str
    relationship: GraphRelationshipType


class ProjectGraphResponse(BaseModel):
    """The complete code graph for one project."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ProjectGraphStatsResponse(BaseModel):
    """Aggregate counts for one project code graph."""

    nodes: int
    edges: int
    files: int
    functions: int
    classes: int
