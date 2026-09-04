"""Project discovery and management endpoints."""

import logging
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from neo4j.exceptions import Neo4jError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.neo4j import get_driver, is_neo4j_available
from app.database.postgres import SessionLocal
from app.models.project import Project
from app.schemas.project import ProjectDeleteResponse, ProjectListItem, ProjectListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# Repository root used to validate filesystem deletion paths.
_REPO_ROOT: Path = Path(
    os.getenv("REPOSITORY_PATH", "/repositories")
).resolve()


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


@router.delete("/{project_id}", response_model=ProjectDeleteResponse)
def delete_project(project_id: int) -> ProjectDeleteResponse:
    """Delete a project and all associated data.

    Deletion order:
    1. Validate project exists.
    2. Delete Neo4j graph nodes/relationships scoped to the project.
    3. Delete the PostgreSQL project row (cascades files, metadata, entities, relationships).
    4. Remove the local repository directory from the filesystem.
    """
    # ------------------------------------------------------------------ #
    # 1. Validate project exists and capture local_path before deletion   #
    # ------------------------------------------------------------------ #
    try:
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Project {project_id} was not found.",
                )
            project_name = project.name
            local_path = project.local_path
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        logger.exception("Could not load project %s for deletion", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load the project for deletion.",
        ) from error

    # ------------------------------------------------------------------ #
    # 2. Neo4j — delete all nodes scoped to this project                 #
    # ------------------------------------------------------------------ #
    if is_neo4j_available():
        try:
            _delete_neo4j_project_graph(project_id)
            logger.info("Deleted Neo4j graph data for project %s", project_id)
        except Neo4jError as error:
            logger.exception("Could not delete Neo4j data for project %s", project_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not delete the project graph from Neo4j. No data was modified.",
            ) from error
    else:
        logger.warning(
            "Neo4j unavailable — skipping graph deletion for project %s", project_id
        )

    # ------------------------------------------------------------------ #
    # 2b. Qdrant — delete all vectors scoped to this project             #
    # ------------------------------------------------------------------ #
    try:
        from app.ai.vector_store import VectorStoreService
        VectorStoreService().delete_project_vectors(project_id)
        logger.info("Deleted Qdrant vectors for project %s", project_id)
    except Exception as error:
        logger.warning("Could not delete Qdrant vectors for project %s: %s", project_id, str(error))

    # ------------------------------------------------------------------ #
    # 3. PostgreSQL — delete project row (cascades everything else)       #
    # ------------------------------------------------------------------ #
    try:
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is not None:
                session.delete(project)
                session.commit()
                logger.info("Deleted PostgreSQL project %s (%s)", project_id, project_name)
    except SQLAlchemyError as error:
        logger.exception("Could not delete project %s from PostgreSQL", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete the project from the database.",
        ) from error

    # ------------------------------------------------------------------ #
    # 4. Filesystem — remove the local repository directory               #
    # ------------------------------------------------------------------ #
    if local_path:
        _delete_repository_directory(project_id, local_path)

    return ProjectDeleteResponse(
        success=True,
        message=f'Project "{project_name}" was deleted successfully.',
        project_id=project_id,
    )


# --------------------------------------------------------------------------- #
# Internal helpers                                                             #
# --------------------------------------------------------------------------- #


def _delete_neo4j_project_graph(project_id: int) -> None:
    """Delete all Neo4j nodes and relationships that belong to *project_id*.

    Deletion order ensures no dangling relationships:
    - CodeEntity nodes (and their DECLARES / CALLS edges)
    - CodeFile nodes (and their CONTAINS / IMPORTS edges)
    - Project node
    """
    with get_driver().session() as neo4j_session:
        neo4j_session.execute_write(_run_neo4j_delete_transaction, project_id)


def _run_neo4j_delete_transaction(tx, project_id: int) -> None:
    parameters = {"project_id": project_id}

    # Delete CodeEntity nodes (DECLARES / CALLS relationships are dropped by DETACH)
    tx.run(
        "MATCH (e:CodeEntity {project_id: $project_id}) DETACH DELETE e",
        **parameters,
    ).consume()

    # Delete CodeFile nodes (CONTAINS / IMPORTS relationships are dropped by DETACH)
    tx.run(
        "MATCH (f:CodeFile {project_id: $project_id}) DETACH DELETE f",
        **parameters,
    ).consume()

    # Delete Project node
    tx.run(
        "MATCH (p:Project {project_id: $project_id}) DETACH DELETE p",
        **parameters,
    ).consume()


def _delete_repository_directory(project_id: int, local_path: str) -> None:
    """Remove the project repository directory from the filesystem.

    Safety checks:
    - Resolve to absolute path.
    - Confirm path is inside the known repository root (prevents path traversal).
    - Confirm it is a directory (never delete a plain file).
    - Never delete the repository root itself.
    """
    try:
        target = Path(local_path).expanduser().resolve()
    except Exception:
        logger.warning(
            "Could not resolve local_path for project %s: %r — skipping filesystem deletion",
            project_id,
            local_path,
        )
        return

    # Refuse to delete the repository root or anything outside it.
    try:
        target.relative_to(_REPO_ROOT)
    except ValueError:
        logger.warning(
            "Project %s local_path %r is outside the repository root %r — "
            "skipping filesystem deletion",
            project_id,
            str(target),
            str(_REPO_ROOT),
        )
        return

    if target == _REPO_ROOT:
        logger.warning(
            "Project %s local_path resolves to the repository root — "
            "skipping filesystem deletion",
            project_id,
        )
        return

    if not target.exists():
        logger.info(
            "Project %s local_path %r does not exist — nothing to remove",
            project_id,
            str(target),
        )
        return

    if not target.is_dir():
        logger.warning(
            "Project %s local_path %r is not a directory — skipping filesystem deletion",
            project_id,
            str(target),
        )
        return

    try:
        shutil.rmtree(target)
        logger.info("Removed repository directory for project %s: %r", project_id, str(target))
    except OSError:
        # Non-fatal — PostgreSQL/Neo4j data is already removed.
        logger.exception(
            "Could not remove repository directory for project %s: %r",
            project_id,
            str(target),
        )
