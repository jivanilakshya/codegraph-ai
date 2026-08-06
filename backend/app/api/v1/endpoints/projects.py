"""Project discovery endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.project import Project
from app.schemas.project import ProjectListItem, ProjectListResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
def list_projects() -> ProjectListResponse:
    """Return registered projects ordered by most recently created."""
    try:
        with SessionLocal() as session:
            projects = session.scalars(
                select(Project).order_by(Project.created_at.desc())
            ).all()
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load projects.",
        ) from error

    return ProjectListResponse(
        projects=[
            ProjectListItem(
                id=project.id,
                name=project.name,
                github_url=project.github_url,
                default_branch=project.default_branch,
                created_at=project.created_at,
            )
            for project in projects
        ]
    )
