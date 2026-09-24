"""Service for managing project-scoped settings and database persistence."""

import logging

from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.project import Project
from app.models.project_settings import ProjectSettings
from app.schemas.settings import ProjectSettingsRead, ProjectSettingsUpdate
from app.services.llm_service import LLMService
from app.services.repository_scanner import IGNORED_DIRECTORIES

logger = logging.getLogger(__name__)

PROTECTED_EXCLUSIONS: list[str] = sorted(list(IGNORED_DIRECTORIES))


class ProjectNotFoundError(Exception):
    """Raised when a specified project ID does not exist."""


class ProjectSettingsServiceError(Exception):
    """Base error raised for project settings operations."""


class ProjectSettingsService:
    """Service to load, persist, update, and reset settings for a project."""

    def get_settings(self, project_id: int) -> ProjectSettingsRead:
        """Get or create project settings for a project ID, including runtime options."""
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is None:
                raise ProjectNotFoundError(f"Project {project_id} was not found.")

            settings = session.get(ProjectSettings, project_id)
            if settings is None:
                settings = ProjectSettings(
                    project_id=project_id,
                    custom_exclusions=[],
                    max_file_size_mb=5.0,
                    enable_complexity=True,
                    enable_dead_code=True,
                    enable_circular_dependency=True,
                    ollama_model="qwen2.5-coder:7b",
                    use_graph_context=True,
                    use_search_context=True,
                )
                session.add(settings)
                session.commit()
                session.refresh(settings)

            available_models = LLMService().get_available_models()

            return ProjectSettingsRead(
                project_id=settings.project_id,
                protected_exclusions=PROTECTED_EXCLUSIONS,
                custom_exclusions=settings.custom_exclusions or [],
                max_file_size_mb=settings.max_file_size_mb,
                enable_complexity=settings.enable_complexity,
                enable_dead_code=settings.enable_dead_code,
                enable_circular_dependency=settings.enable_circular_dependency,
                ollama_model=settings.ollama_model,
                use_graph_context=settings.use_graph_context,
                use_search_context=settings.use_search_context,
                available_ollama_models=available_models,
            )

    def update_settings(
        self, project_id: int, payload: ProjectSettingsUpdate
    ) -> ProjectSettingsRead:
        """Update existing settings for a project ID."""
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is None:
                raise ProjectNotFoundError(f"Project {project_id} was not found.")

            settings = session.get(ProjectSettings, project_id)
            if settings is None:
                settings = ProjectSettings(project_id=project_id)
                session.add(settings)

            # Clean & sanitize custom exclusions (strip whitespace, exclude duplicates & protected defaults)
            protected_set = set(PROTECTED_EXCLUSIONS)
            clean_custom: list[str] = []
            for item in payload.custom_exclusions:
                cleaned = item.strip()
                if cleaned and cleaned not in protected_set and cleaned not in clean_custom:
                    clean_custom.append(cleaned)

            settings.custom_exclusions = clean_custom
            settings.max_file_size_mb = payload.max_file_size_mb
            settings.enable_complexity = payload.enable_complexity
            settings.enable_dead_code = payload.enable_dead_code
            settings.enable_circular_dependency = payload.enable_circular_dependency
            settings.ollama_model = payload.ollama_model.strip()
            settings.use_graph_context = payload.use_graph_context
            settings.use_search_context = payload.use_search_context

            try:
                session.commit()
                session.refresh(settings)
            except SQLAlchemyError as error:
                session.rollback()
                logger.exception("Could not update settings for project %s", project_id)
                raise ProjectSettingsServiceError(
                    "Could not persist settings changes."
                ) from error

        return self.get_settings(project_id)

    def reset_settings(self, project_id: int) -> ProjectSettingsRead:
        """Reset project settings to system defaults."""
        defaults = ProjectSettingsUpdate(
            custom_exclusions=[],
            max_file_size_mb=5.0,
            enable_complexity=True,
            enable_dead_code=True,
            enable_circular_dependency=True,
            ollama_model="qwen2.5-coder:7b",
            use_graph_context=True,
            use_search_context=True,
        )
        return self.update_settings(project_id, defaults)
