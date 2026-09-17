"""Code Quality Dashboard endpoint."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.code_quality import CodeQualityResponse
from app.services.code_quality_service import (
    CodeQualityProjectNotFoundError,
    CodeQualityService,
    CodeQualityServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/quality", response_model=CodeQualityResponse)
def get_project_code_quality(project_id: int) -> CodeQualityResponse:
    """Return aggregated code quality health metrics, score, and grade for a scanned project."""
    try:
        return CodeQualityService().analyze_project(project_id)
    except CodeQualityProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except CodeQualityServiceError as error:
        logger.exception("Code quality analysis failed for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not perform code quality analysis.",
        ) from error
