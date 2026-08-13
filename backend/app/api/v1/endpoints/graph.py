"""Project code graph endpoints."""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.graph import (
    GraphNodeSearchResponse,
    ProjectGraphResponse,
    ProjectGraphStatsResponse,
)
from app.services.graph_service import (
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
