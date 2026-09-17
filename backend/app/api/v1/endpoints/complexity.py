"""Complexity Analysis endpoint."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.complexity import ComplexityResponse
from app.services.complexity_service import (
    ComplexityProjectNotFoundError,
    ComplexityService,
    ComplexityServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/complexity", response_model=ComplexityResponse)
def get_project_complexity(project_id: int) -> ComplexityResponse:
    """Return function and method complexity analysis for a scanned project."""
    try:
        return ComplexityService().analyze_project(project_id)
    except ComplexityProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ComplexityServiceError as error:
        logger.exception("Complexity analysis failed for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not perform complexity analysis.",
        ) from error
