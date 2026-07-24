"""Schemas for repository scanning."""

from pydantic import BaseModel


class RepositoryScanResponse(BaseModel):
    """Successful repository scan response."""

    success: bool = True
    total_files: int
    supported_files: int
    ignored_files: int
    scan_time_ms: int
    message: str = "Repository scanned successfully"
