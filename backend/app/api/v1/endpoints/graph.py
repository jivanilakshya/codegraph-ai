"""Project code graph endpoints."""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.graph import (
    GraphNodeSearchResponse,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)
from app.services.graph_service import (
    GraphNodeNotFoundError,
    GraphProjectNotFoundError,
    GraphService,
    GraphServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/graph/search", response_model=GraphNodeSearchResponse)
def search_project_graph_nodes(
    project_id: int,
    query: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=25),
) -> GraphNodeSearchResponse:
    """Find selectable file and callable nodes without returning a graph."""
    try:
        return GraphNodeSearchResponse(
            nodes=GraphService().search_project_graph_nodes(project_id, query, limit)
        )
    except GraphProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except GraphServiceError as error:
        logger.exception("Could not search graph nodes for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not search the requested project graph.",
        ) from error


@router.get("/{project_id}/graph/focus", response_model=ProjectGraphResponse)
def get_project_graph_focus(
    project_id: int,
    file_id: int | None = Query(default=None, ge=1),
    entity_id: int | None = Query(default=None, ge=1),
    module_path: str | None = Query(default=None, min_length=1),
    route_id: str | None = Query(default=None, min_length=1),
    project_root: bool = Query(default=False),
    depth: int = Query(default=1, ge=1, le=3),
) -> ProjectGraphResponse:
    """Return a Neo4j-backed, depth-controlled neighborhood for one node."""
    # Direct service-level callers (including contract tests) receive FastAPI's
    # default Query objects when optional arguments are omitted. HTTP requests
    # are already resolved to primitive values by FastAPI.
    if not isinstance(module_path, str):
        module_path = None
    if not isinstance(route_id, str):
        route_id = None
    if not isinstance(project_root, bool):
        project_root = False
    target_count = sum(value is not None for value in (file_id, entity_id, module_path, route_id)) + int(project_root)
    if target_count > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Specify only one graph focus target.",
        )

    try:
        graph_service = GraphService()
        if target_count == 0:
            return graph_service.build_project_graph(project_id)
        return graph_service.build_focus_graph(
            project_id,
            file_id=file_id,
            entity_id=entity_id,
            module_path=module_path,
            route_id=route_id,
            project_root=project_root,
            depth=depth,
        )
    except (GraphProjectNotFoundError, GraphNodeNotFoundError) as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except GraphServiceError as error:
        logger.exception("Could not build focus graph for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not build the requested focus graph.",
        ) from error


@router.get("/{project_id}/graph", response_model=ProjectGraphResponse)
def get_project_graph(project_id: int) -> ProjectGraphResponse:
    """Return a read-only code graph for a scanned project."""
    try:
        return GraphService().build_project_graph(project_id)
    except GraphProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except GraphServiceError as error:
        logger.exception("Could not build graph for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not build the requested project graph.",
        ) from error
    except Exception as error:
        logger.exception("Unexpected graph failure for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not build the requested project graph.",
        ) from error


@router.get("/{project_id}/graph/stats", response_model=ProjectGraphStatsResponse)
def get_project_graph_stats(project_id: int) -> ProjectGraphStatsResponse:
    """Return aggregate counts for a project's code graph."""
    try:
        return GraphService().get_project_graph_stats(project_id)
    except GraphProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except GraphServiceError as error:
        logger.exception("Could not build graph stats for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not build the requested project graph statistics.",
        ) from error
    except Exception as error:
        logger.exception("Unexpected graph stats failure for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not build the requested project graph statistics.",
        ) from error
