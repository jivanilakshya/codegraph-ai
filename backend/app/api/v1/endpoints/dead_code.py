"""Dead Code Detection endpoint."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.dead_code import DeadCodeResponse
from app.services.dead_code_service import (
    DeadCodeProjectNotFoundError,
    DeadCodeService,
    DeadCodeServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/dead-code", response_model=DeadCodeResponse)
def get_project_dead_code(project_id: int) -> DeadCodeResponse:
    """Return potential dead code candidates for a scanned project."""
    try:
        return DeadCodeService().detect_dead_code(project_id)
    except DeadCodeProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except DeadCodeServiceError as error:
        logger.exception("Dead code detection failed for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not perform dead code analysis.",
        ) from error
