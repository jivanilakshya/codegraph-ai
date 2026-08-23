"""Code chunking endpoint."""

from pathlib import Path
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.schemas.chunk import CodeChunk
from app.ai.chunker import CodeChunker

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{file_id}/chunks", response_model=list[CodeChunk])
def get_file_chunks(
    file_id: int,
    max_chars: int = Query(default=1000, ge=50, le=10000),
) -> list[CodeChunk]:
    """Chunk a stored file into semantic units using Tree-sitter AST or line-based splits."""
    source_path = _stored_file_path(file_id)
    chunker = CodeChunker()

    try:
        chunks = chunker.chunk_file(source_path, max_chars=max_chars)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to chunk file: {str(error)}",
        ) from error

    return chunks


def _stored_file_path(file_id: int) -> Path:
    """Resolve a persisted file record to a safe absolute project path."""
    try:
        with SessionLocal() as session:
            file_record = session.get(File, file_id)
            if file_record is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="File was not found."
                )

            project = session.get(Project, file_record.project_id)
            if project is None or not project.local_path:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project repository was not found.",
                )

            repository_root = Path(project.local_path).resolve()
            persisted_path = Path(file_record.path)
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load the requested file.",
        ) from error

    source_path = (
        persisted_path.resolve()
        if persisted_path.is_absolute()
        else (repository_root / persisted_path).resolve()
    )
    if not source_path.is_relative_to(repository_root):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Stored file path is invalid."
        )
    return source_path
