"""Project Settings API endpoints."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.settings import ProjectSettingsRead, ProjectSettingsUpdate
from app.services.project_settings_service import (
    ProjectNotFoundError,
    ProjectSettingsService,
    ProjectSettingsServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/{project_id}/settings", response_model=ProjectSettingsRead)
def get_project_settings(project_id: int) -> ProjectSettingsRead:
    """Retrieve settings configuration for a project."""
    service = ProjectSettingsService()
    try:
        return service.get_settings(project_id)
    except ProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ProjectSettingsServiceError as error:
        logger.exception("Could not retrieve settings for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load project settings.",
        ) from error


@router.put("/{project_id}/settings", response_model=ProjectSettingsRead)
def update_project_settings(
    project_id: int, payload: ProjectSettingsUpdate
) -> ProjectSettingsRead:
    """Update settings configuration for a project."""
    service = ProjectSettingsService()
    try:
        return service.update_settings(project_id, payload)
    except ProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ProjectSettingsServiceError as error:
        logger.exception("Could not update settings for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save project settings.",
        ) from error


@router.post("/{project_id}/settings/reset", response_model=ProjectSettingsRead)
def reset_project_settings(project_id: int) -> ProjectSettingsRead:
    """Reset settings for a project to default configuration."""
    service = ProjectSettingsService()
    try:
        return service.reset_settings(project_id)
    except ProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ProjectSettingsServiceError as error:
        logger.exception("Could not reset settings for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not reset project settings.",
        ) from error
