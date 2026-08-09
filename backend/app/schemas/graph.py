"""Response schemas for the persisted project code graph."""

from typing import Literal

from pydantic import BaseModel


GraphNodeType = Literal["file", "function", "class", "variable"]
GraphRelationshipType = Literal["IMPORTS", "DECLARES", "CALLS"]


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
    """The complete bounded graph for one scanned project."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


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
