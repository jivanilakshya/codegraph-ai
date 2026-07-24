"""Read-only Tree-sitter code exploration endpoint."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.schemas.parser import AstPoint, FileAstResponse, RawAstNode
from app.services.parser_service import (
    ParserDependencyError,
    ParserService,
    ParserServiceError,
    SourceFileNotFoundError,
    SourceFileTooLargeError,
    SourceReadError,
    SourceSyntaxError,
    UnsupportedLanguageError,
)

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{file_id}/ast", response_model=FileAstResponse)
def get_file_ast(file_id: int) -> FileAstResponse:
    """Load a stored file and return its raw Tree-sitter AST as JSON."""
    return _parse_stored_file(file_id)


@router.post("/{file_id}/parse", response_model=FileAstResponse)
def parse_file(file_id: int) -> FileAstResponse:
    """Parse a stored file and return its raw Tree-sitter AST as JSON."""
    return _parse_stored_file(file_id)


def _parse_stored_file(file_id: int) -> FileAstResponse:
    """Execute the shared read-only parsing workflow for one stored file."""
    source_path = _stored_file_path(file_id)
    parser_service = ParserService()

    try:
        parsed_file = parser_service.parse_file(source_path)
    except SourceFileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except UnsupportedLanguageError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except SourceSyntaxError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
    except SourceFileTooLargeError as error:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(error)
        ) from error
    except ParserDependencyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)
        ) from error
    except (SourceReadError, ParserServiceError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error)
        ) from error

    return FileAstResponse(
        file=parsed_file.file,
        language=parsed_file.language,
        ast=_raw_ast_node_response(parsed_file.ast),
        symbols=parsed_file.symbols,
        relationships=parsed_file.relationships,
    )


def _raw_ast_node_response(node) -> RawAstNode:
    """Convert parser-service AST data to the API response schema."""
    return RawAstNode(
        type=node.type,
        is_named=node.is_named,
        start_byte=node.start_byte,
        end_byte=node.end_byte,
        start_point=AstPoint(
            row=node.start_point.row,
            column=node.start_point.column,
        ),
        end_point=AstPoint(
            row=node.end_point.row,
            column=node.end_point.column,
        ),
        children=[_raw_ast_node_response(child) for child in node.children],
    )


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
