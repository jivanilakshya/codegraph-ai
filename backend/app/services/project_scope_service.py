"""Project-scope validation shared by project-bound AI generation services."""

from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.project import Project


class ProjectNotFoundError(Exception):
    """Raised when a requested project does not exist."""


class ProjectScopeService:
    """Validate that an AI request is scoped to an existing project.

    Retrieval APIs intentionally allow cross-project exploration.  Generation APIs
    do not: an answer must only be constructed from the project selected by the
    caller, so this validation occurs before embedding, vector retrieval, graph
    lookup, or LLM invocation.
    """

    def require_project(self, project_id: int) -> None:
        """Raise a descriptive error unless *project_id* identifies a project."""
        if isinstance(project_id, bool) or not isinstance(project_id, int) or project_id < 1:
            raise ValueError("project_id must be a positive integer.")

        try:
            with SessionLocal() as session:
                if session.get(Project, project_id) is None:
                    raise ProjectNotFoundError(f"Project {project_id} was not found.")
        except ProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            raise RuntimeError("Could not validate the requested project.") from error
