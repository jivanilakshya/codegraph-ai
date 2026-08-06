"""Schemas for project discovery."""

from datetime import datetime

from pydantic import BaseModel


class ProjectListItem(BaseModel):
    """Project metadata displayed in the dashboard."""

    id: int
    name: str
    github_url: str | None
    default_branch: str | None
    created_at: datetime


class ProjectListResponse(BaseModel):
    """Collection of registered projects."""

    projects: list[ProjectListItem]
