"""ZIP project upload endpoint."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.upload import ProjectUploadResponse
from app.services.upload_service import (
    DuplicateProjectError,
    EmptyUploadError,
    ExtractionError,
    InvalidZipError,
    UploadPermissionError,
    UploadService,
    UploadTooLargeError,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "/upload",
    response_model=ProjectUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_project(file: UploadFile = File(...)) -> ProjectUploadResponse:
    """Safely upload a ZIP archive and register the extracted project."""
    service = UploadService()

    try:
        uploaded_project = await service.upload_project(file)
    except (InvalidZipError, EmptyUploadError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except UploadTooLargeError as error:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(error),
        ) from error
    except DuplicateProjectError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except UploadPermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ExtractionError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error

    return ProjectUploadResponse(
        project_name=uploaded_project.project_name,
        location=uploaded_project.location,
        total_files=uploaded_project.total_files,
        total_directories=uploaded_project.total_directories,
    )
