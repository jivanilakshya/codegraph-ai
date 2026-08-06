"""Read-only repository workspace endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.schemas.workspace import (
    FileContentResponse,
    RepositoryWorkspaceResponse,
    WorkspaceFile,
)

router = APIRouter(prefix="/projects", tags=["projects"])

MAX_FILE_CONTENT_BYTES = 1_000_000


@router.get("/{project_id}/repository", response_model=RepositoryWorkspaceResponse)
def get_repository_workspace(project_id: int) -> RepositoryWorkspaceResponse:
    """Return one project's scanned repository file inventory."""
    try:
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project was not found.",
                )
            files = session.scalars(
                select(File)
                .where(File.project_id == project_id)
                .order_by(File.path.asc())
            ).all()
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load the repository inventory.",
        ) from error

    return RepositoryWorkspaceResponse(
        id=project.id,
        name=project.name,
        files=[
            WorkspaceFile(
                id=file.id,
                path=file.path,
                language=file.language,
                size=file.size,
            )
            for file in files
        ],
    )


@router.get(
    "/{project_id}/files/{file_id}/content",
    response_model=FileContentResponse,
)
def get_repository_file_content(project_id: int, file_id: int) -> FileContentResponse:
    """Return UTF-8 text from a selected scanned repository file."""
    file_record, repository_root = _load_project_file(project_id, file_id)
    file_path = _resolve_file_path(repository_root, file_record.path)

    try:
        if not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository file was not found.",
            )
        if file_path.stat().st_size > MAX_FILE_CONTENT_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Repository file is too large to display.",
            )
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except HTTPException:
        raise
    except OSError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not read the repository file.",
        ) from error

    return FileContentResponse(
        id=file_record.id,
        path=file_record.path,
        language=file_record.language,
        content=content,
    )


def _load_project_file(project_id: int, file_id: int) -> tuple[File, Path]:
    try:
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            file_record = session.get(File, file_id)
            if project is None or file_record is None or file_record.project_id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Repository file was not found.",
                )
            if not project.local_path:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project repository was not found.",
                )
            repository_root = Path(project.local_path).expanduser().resolve()
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load the repository file.",
        ) from error

    if not repository_root.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project repository was not found.",
        )
    return file_record, repository_root


def _resolve_file_path(repository_root: Path, stored_path: str) -> Path:
    candidate = Path(stored_path)
    resolved_path = (
        candidate.resolve()
        if candidate.is_absolute()
        else (repository_root / candidate).resolve()
    )
    if not resolved_path.is_relative_to(repository_root):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored repository file path is invalid.",
        )
    return resolved_path
