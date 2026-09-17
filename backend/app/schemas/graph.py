"""Response schemas for the persisted project code graph."""

from typing import Literal

from pydantic import BaseModel


GraphNodeType = Literal[
    "project", "module", "file", "api_route", "function", "class", "method", "variable"
]
GraphRelationshipType = Literal[
    "CONTAINS", "IMPORTS", "DECLARES", "CALLS", "EXTENDS", "HAS_METHOD", "HANDLES"
]


class GraphNode(BaseModel):
    """One file or persisted code declaration in a project graph."""

    id: str
    label: str
    type: GraphNodeType


class GraphEdge(BaseModel):
    """One directed, visualizable relationship in a project graph."""

    id: str
    source: str
    target: str
    type: GraphRelationshipType


class ProjectGraphResponse(BaseModel):
    """A bounded graph view for one scanned project."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    truncated: bool = False


class GraphNodeSearchResponse(BaseModel):
    """Lightweight node matches for graph search."""

    nodes: list[GraphNode]


class ProjectGraphStatsResponse(BaseModel):
    """Aggregate counts for one project's code graph."""

    nodes: int
    edges: int
    files: int
    functions: int
    classes: int
