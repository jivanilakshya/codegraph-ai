"""Schemas for GitHub repository cloning."""

from pydantic import BaseModel, Field


class GitHubProjectCloneRequest(BaseModel):
    """Request to clone a public or accessible GitHub repository."""

    github_url: str = Field(
        ...,
        examples=["https://github.com/owner/repository"],
        description="HTTPS URL of a GitHub repository.",
    )


class GitHubProjectCloneResponse(BaseModel):
    """Successful GitHub clone response."""

    success: bool = True
    project_id: int
    project_name: str
    branch: str
    local_path: str
    message: str = "Repository cloned successfully"
