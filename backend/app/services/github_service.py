"""GitHub repository cloning service."""

import logging
import os
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from git import GitCommandError, Repo
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.project import Project

logger = logging.getLogger(__name__)

GITHUB_REPOSITORY_URL_PATTERN = re.compile(
    r"^https://github\.com/"
    r"(?P<owner>[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)/"
    r"(?P<repository>[A-Za-z0-9_.-]+?)(?:\.git)?/?$"
)


class GitHubServiceError(Exception):
    """Base exception for GitHub clone failures."""


class InvalidGitHubUrlError(GitHubServiceError):
    """Raised when a URL is not a supported GitHub repository URL."""


class RepositoryAlreadyExistsError(GitHubServiceError):
    """Raised when the repository has already been cloned."""


class RepositoryPermissionError(GitHubServiceError):
    """Raised when the process cannot write to the repository directory."""


class RepositoryNetworkError(GitHubServiceError):
    """Raised when Git cannot reach the GitHub remote."""


class RepositoryCloneError(GitHubServiceError):
    """Raised when Git cannot clone a repository for another reason."""


@dataclass(frozen=True)
class ClonedRepository:
    """Metadata produced after successfully cloning a GitHub repository."""

    project_id: int
    project_name: str
    branch: str
    local_path: str


class GitHubService:
    """Clone GitHub repositories and persist their basic project records."""

    def __init__(self, repository_root: Path | None = None) -> None:
        default_root = Path(__file__).resolve().parents[3] / "repositories"
        configured_root = os.getenv("REPOSITORY_PATH")
        self.repository_root = (
            Path(configured_root).expanduser()
            if configured_root
            else repository_root or default_root
        )

    def clone_repository(self, github_url: str) -> ClonedRepository:
        """Validate, clone, and persist an accessible GitHub repository."""
        owner, repository_name, normalized_url = self._parse_github_url(github_url)
        target_path = self.repository_root / owner.lower() / repository_name.lower()

        self._ensure_project_is_not_registered(normalized_url)
        if target_path.exists():
            logger.warning("Orphaned repository detected at %s", target_path)
            self._delete_orphaned_repository(target_path)

        self._reserve_target_directory(target_path)
        logger.info("Clone started: %s", normalized_url)

        try:
            repository = Repo.clone_from(normalized_url, target_path)
            branch = repository.active_branch.name
        except PermissionError as error:
            self._remove_reserved_directory(target_path)
            logger.exception("Permission denied while cloning repository: %s", normalized_url)
            raise RepositoryPermissionError(
                "Permission denied while writing the repository."
            ) from error
        except GitCommandError as error:
            self._remove_reserved_directory(target_path)
            self._raise_clone_error(normalized_url, error)
        except (TypeError, ValueError) as error:
            self._remove_reserved_directory(target_path)
            logger.exception(
                "Could not determine the default branch for repository: %s",
                normalized_url,
            )
            raise RepositoryCloneError(
                "The repository does not have a readable default branch."
            ) from error
        except OSError as error:
            self._remove_reserved_directory(target_path)
            logger.exception("Filesystem error while cloning repository: %s", normalized_url)
            raise RepositoryCloneError("Repository cloning failed.") from error

        logger.info("Clone completed: %s", normalized_url)
        cloned_at = datetime.now(timezone.utc)
        local_path = str(target_path.resolve())

        try:
            project_id = self._save_project(
                name=repository_name,
                github_url=normalized_url,
                local_path=local_path,
                default_branch=branch,
                cloned_at=cloned_at,
            )
        except Exception:
            self._remove_reserved_directory(target_path)
            logger.info("Rollback performed: removed cloned repository at %s", target_path)
            raise

        logger.info("Project saved: id=%s, url=%s", project_id, normalized_url)
        return ClonedRepository(
            project_id=project_id,
            project_name=repository_name,
            branch=branch,
            local_path=local_path,
        )

    @staticmethod
    def _parse_github_url(github_url: str) -> tuple[str, str, str]:
        match = GITHUB_REPOSITORY_URL_PATTERN.fullmatch(github_url.strip())
        if match is None:
            raise InvalidGitHubUrlError(
                "github_url must be an HTTPS GitHub repository URL."
            )

        owner = match.group("owner")
        repository_name = match.group("repository")
        if repository_name.endswith(".git"):
            repository_name = repository_name[:-4]

        if not repository_name:
            raise InvalidGitHubUrlError("github_url must include a repository name.")

        normalized_url = f"https://github.com/{owner}/{repository_name}"
        return owner, repository_name, normalized_url

    def _ensure_project_is_not_registered(self, github_url: str) -> None:
        """Use the PostgreSQL project record as the duplicate source of truth."""
        try:
            with SessionLocal() as session:
                existing_project = session.scalar(
                    select(Project.id).where(Project.github_url == github_url)
                )
        except SQLAlchemyError as error:
            logger.exception("Failed to check existing project: %s", github_url)
            raise RepositoryCloneError("Could not verify the project repository.") from error

        if existing_project is not None:
            raise RepositoryAlreadyExistsError(
                "This repository has already been registered."
            )

    @staticmethod
    def _delete_orphaned_repository(target_path: Path) -> None:
        """Remove an unregistered repository folder before recreating it."""
        try:
            shutil.rmtree(target_path)
            logger.info("Removed orphaned repository directory: %s", target_path)
        except PermissionError as error:
            logger.exception("Permission denied while removing orphaned repository: %s", target_path)
            raise RepositoryPermissionError(
                "Permission denied while removing the orphaned repository."
            ) from error
        except OSError as error:
            logger.exception("Failed to remove orphaned repository: %s", target_path)
            raise RepositoryCloneError(
                "Could not remove the orphaned repository directory."
            ) from error

    @staticmethod
    def _reserve_target_directory(target_path: Path) -> None:
        try:
            target_path.mkdir(parents=True, exist_ok=False)
        except FileExistsError as error:
            raise RepositoryAlreadyExistsError(
                "This repository has already been cloned."
            ) from error
        except PermissionError as error:
            raise RepositoryPermissionError(
                "Permission denied while creating the repository directory."
            ) from error

    @staticmethod
    def _remove_reserved_directory(target_path: Path) -> None:
        if target_path.exists():
            shutil.rmtree(target_path, ignore_errors=True)

    @staticmethod
    def _raise_clone_error(github_url: str, error: GitCommandError) -> None:
        logger.error("Git clone failed for %s: %s", github_url, error.stderr)
        error_message = (error.stderr or error.stdout or str(error)).lower()
        if any(
            term in error_message
            for term in ("could not resolve host", "failed to connect", "network", "timed out")
        ):
            raise RepositoryNetworkError(
                "Network error while contacting GitHub."
            ) from error
        if any(term in error_message for term in ("permission denied", "authentication failed")):
            raise RepositoryPermissionError(
                "GitHub denied access to this repository."
            ) from error
        raise RepositoryCloneError("Git failed to clone the repository.") from error

    @staticmethod
    def _save_project(
        *,
        name: str,
        github_url: str,
        local_path: str,
        default_branch: str,
        cloned_at: datetime,
    ) -> int:
        project = Project(
            name=name,
            github_url=github_url,
            local_path=local_path,
            default_branch=default_branch,
            cloned_at=cloned_at,
        )

        session = SessionLocal()
        try:
            session.add(project)
            session.flush()
            project_id = project.id
            session.commit()
            return project_id
        except SQLAlchemyError as error:
            session.rollback()
            logger.exception("Failed to save cloned project: %s", github_url)
            raise RepositoryCloneError(
                "Repository cloned, but project information could not be saved."
            ) from error
        finally:
            session.close()
