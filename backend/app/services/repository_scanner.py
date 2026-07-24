"""Repository file inventory and language classification service."""

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from time import perf_counter

from sqlalchemy import delete, func, select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal, engine
from app.models.file import File
from app.models.project import Project

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

IGNORED_DIRECTORIES = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    ".venv",
    "venv",
    "__pycache__",
    ".next",
    ".cache",
}

LANGUAGE_BY_EXTENSION = {
    ".py": "Python",
    ".java": "Java",
    ".js": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".c": "C",
    ".h": "C",
    ".cc": "C++",
    ".cp": "C++",
    ".cpp": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".hxx": "C++",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".swift": "Swift",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".markdown": "Markdown",
}


class RepositoryScannerError(Exception):
    """Base exception for repository scanning failures."""


class ProjectNotFoundError(RepositoryScannerError):
    """Raised when a project ID has no persisted project record."""


class InvalidRepositoryPathError(RepositoryScannerError):
    """Raised when a project's local repository path cannot be scanned."""


class RepositoryScanError(RepositoryScannerError):
    """Raised when repository inventory persistence fails."""


@dataclass(frozen=True)
class ScannedFile:
    """File metadata collected during a repository scan."""

    name: str
    absolute_path: str
    relative_path: str
    extension: str
    size: int
    last_modified: datetime
    language: str | None

    @property
    def is_supported(self) -> bool:
        """Return whether the file extension belongs to a supported language."""
        return self.language is not None


@dataclass(frozen=True)
class RepositoryScanResult:
    """Summary returned after a project repository has been scanned."""

    total_files: int
    supported_files: int
    ignored_files: int
    scan_time_ms: int


class RepositoryScanner:
    """Recursively inventory project files without parsing their contents."""

    def scan_project(self, project_id: int) -> RepositoryScanResult:
        """Scan a persisted project's repository and replace its file inventory."""
        started_at = perf_counter()
        logger.debug("Loading project %s...", project_id)
        repository_path = self._project_repository_path(project_id)
        logger.debug("Repository found: %s", repository_path)
        logger.debug("Scanning repository...")
        scanned_files, ignored_files = self._scan_directory(repository_path)
        logger.debug("Found %s files.", len(scanned_files))
        self._save_file_inventory(project_id, scanned_files)

        result = RepositoryScanResult(
            total_files=len(scanned_files),
            supported_files=sum(file.is_supported for file in scanned_files),
            ignored_files=ignored_files,
            scan_time_ms=round((perf_counter() - started_at) * 1000),
        )
        logger.info(
            "Scanned project %s (%s files, %s supported, %s ignored) in %s ms",
            project_id,
            result.total_files,
            result.supported_files,
            result.ignored_files,
            result.scan_time_ms,
        )
        logger.info("Scan complete for project %s.", project_id)
        return result

    @staticmethod
    def _project_repository_path(project_id: int) -> Path:
        try:
            with SessionLocal() as session:
                project = session.get(Project, project_id)
                if project is None:
                    raise ProjectNotFoundError("Project was not found.")
                local_path = project.local_path
        except SQLAlchemyError as error:
            logger.exception("Failed to load project %s for scanning", project_id)
            raise RepositoryScanError("Could not load the requested project.") from error

        if not local_path:
            raise InvalidRepositoryPathError("Project does not have a local repository path.")

        repository_path = Path(local_path).expanduser()
        if not repository_path.exists() or not repository_path.is_dir():
            raise InvalidRepositoryPathError("Project repository path does not exist.")

        return repository_path.resolve()

    @staticmethod
    def _scan_directory(repository_path: Path) -> tuple[list[ScannedFile], int]:
        scanned_files: list[ScannedFile] = []
        ignored_files = 0

        try:
            for directory_path, directory_names, file_names in os.walk(
                repository_path, followlinks=False
            ):
                directory_names[:] = [
                    directory_name
                    for directory_name in directory_names
                    if directory_name not in IGNORED_DIRECTORIES
                ]

                for file_name in file_names:
                    file_path = Path(directory_path, file_name)
                    if file_path.is_symlink():
                        ignored_files += 1
                        continue

                    try:
                        file_stat = file_path.stat()
                    except OSError:
                        logger.warning("Skipping unreadable file: %s", file_path)
                        ignored_files += 1
                        continue

                    extension = file_path.suffix.lower()
                    language = LANGUAGE_BY_EXTENSION.get(extension)
                    scanned_files.append(
                        ScannedFile(
                            name=file_path.name,
                            absolute_path=str(file_path.resolve()),
                            relative_path=file_path.relative_to(repository_path).as_posix(),
                            extension=extension,
                            size=file_stat.st_size,
                            last_modified=datetime.fromtimestamp(file_stat.st_mtime),
                            language=language,
                        )
                    )
                    if language is None:
                        ignored_files += 1
        except OSError as error:
            logger.exception("Failed to scan repository path: %s", repository_path)
            raise RepositoryScanError("Could not scan the project repository.") from error

        return scanned_files, ignored_files

    @staticmethod
    def _save_file_inventory(project_id: int, scanned_files: list[ScannedFile]) -> None:
        """Atomically replace the project's persisted file inventory."""
        session = SessionLocal()

        try:
            bind = session.get_bind()
            database_url = getattr(bind, "url", engine.url).render_as_string(
                hide_password=True
            )
            logger.debug("Saving file inventory using database: %s", database_url)
            logger.debug("File model is mapped to table: %s", File.__tablename__)
            logger.debug("Saving file inventory...")

            deleted_rows = session.execute(
                delete(File).where(File.project_id == project_id)
            ).rowcount
            logger.debug("Removed %s previous file inventory rows.", deleted_rows)

            file_records = [
                File(
                    project_id=project_id,
                    path=scanned_file.relative_path,
                    language=scanned_file.language,
                    size=scanned_file.size,
                )
                for scanned_file in scanned_files
            ]
            logger.debug("Executing add_all() for %s file records.", len(file_records))
            session.add_all(file_records)
            session.flush()

            inserted_rows = session.scalar(
                select(func.count()).select_from(File).where(File.project_id == project_id)
            )
            logger.info("Inserted %s rows for project %s.", inserted_rows, project_id)

            session.commit()
            logger.info("Commit successful for project %s.", project_id)
            logger.debug(
                "Session transaction active after commit: %s", session.in_transaction()
            )

            files_table_count = session.scalar(select(func.count()).select_from(File))
            logger.info("Files table now contains %s rows.", files_table_count)
        except SQLAlchemyError as error:
            logger.exception("Commit failure while saving project %s file inventory", project_id)
            logger.warning("Rolling back file inventory transaction for project %s.", project_id)
            try:
                session.rollback()
                logger.info("Rollback complete for project %s.", project_id)
            except SQLAlchemyError:
                logger.exception("Rollback failure for project %s.", project_id)
            raise RepositoryScanError("Could not save the repository file inventory.") from error
        finally:
            session.close()
            logger.debug("Database session closed after scan persistence.")
