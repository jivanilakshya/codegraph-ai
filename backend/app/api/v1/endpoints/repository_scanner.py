"""Repository scan endpoint."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.repository_scanner import RepositoryScanResponse
from app.services.repository_scanner import (
    InvalidRepositoryPathError,
    ProjectNotFoundError,
    RepositoryScanError,
    RepositoryScanner,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/{project_id}/scan", response_model=RepositoryScanResponse)
def scan_project_repository(project_id: int) -> RepositoryScanResponse:
    """Scan a project's local repository and persist its file inventory."""
    scanner = RepositoryScanner()

    try:
        result = scanner.scan_project(project_id)
    except ProjectNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except InvalidRepositoryPathError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except RepositoryScanError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

    return RepositoryScanResponse(
        total_files=result.total_files,
        supported_files=result.supported_files,
        ignored_files=result.ignored_files,
        scan_time_ms=result.scan_time_ms,
    )
