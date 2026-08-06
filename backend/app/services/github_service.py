"""GitHub repository cloning service."""

import logging
import os
import re
import shutil
import stat
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
        self._prepare_clone_target(target_path)
        logger.info("Clone started: url=%s target=%s", normalized_url, target_path)

        try:
            repository = self._clone_with_retry(normalized_url, target_path)
            branch = repository.active_branch.name
        except PermissionError as error:
            self._remove_partial_clone(target_path)
            logger.exception("Permission denied while cloning repository: %s", normalized_url)
            raise RepositoryPermissionError(
                "Permission denied while writing the repository."
            ) from error
        except GitCommandError as error:
            self._remove_partial_clone(target_path)
            self._raise_clone_error(normalized_url, error)
        except (TypeError, ValueError) as error:
            self._remove_partial_clone(target_path)
            logger.exception(
                "Could not determine the default branch for repository: %s",
                normalized_url,
            )
            raise RepositoryCloneError(
                "The repository does not have a readable default branch."
            ) from error
        except OSError as error:
            self._remove_partial_clone(target_path)
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
            self._remove_partial_clone(target_path)
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

    def _prepare_clone_target(self, target_path: Path) -> None:
        """Prepare only the clone parent and remove incomplete clone remnants."""
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
        except PermissionError as error:
            logger.exception("Permission denied while creating clone parent: %s", target_path.parent)
            raise RepositoryPermissionError(
                "Permission denied while creating the repository directory."
            ) from error
        except OSError as error:
            logger.exception("Failed to create clone parent: %s", target_path.parent)
            raise RepositoryCloneError(
                "Could not prepare the repository directory."
            ) from error

        if not (target_path.exists() or target_path.is_symlink()):
            return

        if self._is_git_repository(target_path):
            logger.warning("Existing Git repository found at clone target: %s", target_path)
            raise RepositoryAlreadyExistsError(
                "This repository has already been cloned."
            )

        logger.warning("Removing incomplete clone target before retry: %s", target_path)
        self._remove_partial_clone(target_path)

    @staticmethod
    def _is_git_repository(target_path: Path) -> bool:
        """Treat a directory with a .git folder as an existing repository."""
        return target_path.is_dir() and (target_path / ".git").is_dir()

    def _clone_with_retry(self, github_url: str, target_path: Path) -> Repo:
        """Clone once more after cleaning a partial target left by Git."""
        for attempt in range(1, 3):
            try:
                logger.info("Git clone attempt %s/2: url=%s", attempt, github_url)
                return Repo.clone_from(github_url, target_path)
            except GitCommandError:
                self._remove_partial_clone(target_path)
                if attempt == 2:
                    raise
                logger.warning(
                    "Git clone left a partial target; retrying: url=%s target=%s",
                    github_url,
                    target_path,
                )

        raise RepositoryCloneError("Git failed to clone the repository.")

    @staticmethod
    def _remove_partial_clone(target_path: Path) -> None:
        """Remove a known incomplete clone target, including Windows read-only files."""
        if not (target_path.exists() or target_path.is_symlink()):
            return

        def make_writable(function, path, exception_info) -> None:
            del exception_info
            os.chmod(path, stat.S_IWRITE)
            function(path)

        try:
            if target_path.is_symlink() or target_path.is_file():
                target_path.unlink()
            else:
                shutil.rmtree(target_path, onerror=make_writable)
            logger.info("Removed partial clone target: %s", target_path)
        except PermissionError as error:
            logger.exception("Permission denied while removing clone target: %s", target_path)
            raise RepositoryPermissionError(
                "Permission denied while removing the incomplete repository."
            ) from error
        except OSError as error:
            logger.exception("Failed to remove incomplete clone target: %s", target_path)
            raise RepositoryCloneError(
                "Could not remove the incomplete repository directory."
            ) from error

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
