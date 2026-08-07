"""Project code graph endpoints."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.graph import ProjectGraphResponse, ProjectGraphStatsResponse
from app.services.graph_service import (
    GraphProjectNotFoundError,
    GraphService,
    GraphServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


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
