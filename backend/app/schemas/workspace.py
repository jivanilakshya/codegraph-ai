"""Schemas for the repository workspace."""

from pydantic import BaseModel


class WorkspaceFile(BaseModel):
    """Stored repository file metadata."""

    id: int
    path: str
    language: str | None
    size: int


class RepositoryWorkspaceResponse(BaseModel):
    """Project and its scanned repository inventory."""

    id: int
    name: str
    files: list[WorkspaceFile]


class FileContentResponse(BaseModel):
    """Text content for a selected repository file."""

    id: int
    path: str
    language: str | None
    content: str
