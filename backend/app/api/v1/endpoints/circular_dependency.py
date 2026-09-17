"""Circular Dependency Detection endpoint."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.circular_dependency import CircularDependencyResponse
from app.services.circular_dependency_service import (
    CircularDependencyProjectNotFoundError,
    CircularDependencyService,
    CircularDependencyServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/circular-dependencies", response_model=CircularDependencyResponse)
def get_project_circular_dependencies(project_id: int) -> CircularDependencyResponse:
    """Return potential circular dependency cycles for a scanned project."""
    try:
        return CircularDependencyService().detect_cycles(project_id)
    except CircularDependencyProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except CircularDependencyServiceError as error:
        logger.exception("Circular dependency detection failed for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not perform circular dependency analysis.",
        ) from error
