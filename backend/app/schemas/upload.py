"""Schemas for ZIP project uploads."""

from pydantic import BaseModel


class ProjectUploadResponse(BaseModel):
    """Successful ZIP project upload response."""

    success: bool = True
    project_name: str
    location: str
    total_files: int
    total_directories: int
    message: str = "Project uploaded successfully"
