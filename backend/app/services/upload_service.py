"""Safe ZIP project upload and extraction service."""

import logging
import os
import re
import shutil
import stat
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath

from fastapi import UploadFile
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.project import Project

logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024
CHUNK_SIZE_BYTES = 1024 * 1024


class UploadServiceError(Exception):
    """Base exception for project upload failures."""


class InvalidZipError(UploadServiceError):
    """Raised when an uploaded file is not a safe ZIP archive."""


class EmptyUploadError(UploadServiceError):
    """Raised when an uploaded archive has no project files."""


class UploadTooLargeError(UploadServiceError):
    """Raised when an uploaded file exceeds the supported size."""


class DuplicateProjectError(UploadServiceError):
    """Raised when an uploaded project already exists."""


class UploadPermissionError(UploadServiceError):
    """Raised when filesystem permissions prevent upload processing."""


class ExtractionError(UploadServiceError):
    """Raised when a valid archive cannot be extracted or persisted."""


@dataclass(frozen=True)
class UploadedProject:
    """Metadata returned after a project archive is successfully imported."""

    project_name: str
    location: str
    total_files: int
    total_directories: int


class UploadService:
    """Validate, safely extract, and register uploaded ZIP projects."""

    def __init__(
        self,
        upload_root: Path | None = None,
        repository_root: Path | None = None,
    ) -> None:
        project_root = Path(__file__).resolve().parents[3]
        self.upload_root = self._configured_path(
            "UPLOAD_PATH", upload_root, project_root / "uploads"
        )
        self.repository_root = self._configured_path(
            "REPOSITORY_PATH", repository_root, project_root / "repositories"
        )

    async def upload_project(self, uploaded_file: UploadFile) -> UploadedProject:
        """Store, validate, extract, and persist an uploaded ZIP project."""
        self._validate_filename(uploaded_file.filename)
        archive_path = await self._store_upload(uploaded_file)

        try:
            with zipfile.ZipFile(archive_path) as archive:
                members = self._validated_members(archive)
                project_name, wrapper_directory = self._project_details(
                    uploaded_file.filename, members
                )
                target_path = self.repository_root / project_name
                self._ensure_project_does_not_exist(project_name, target_path)
                self._reserve_target_directory(target_path)

                try:
                    self._extract_archive(archive, members, target_path, wrapper_directory)
                    total_files, total_directories, total_size = self._project_statistics(
                        target_path
                    )
                    if total_files == 0:
                        raise EmptyUploadError("ZIP file does not contain any files.")
                    self._save_project(
                        name=project_name,
                        local_path=str(target_path.resolve()),
                    )
                except Exception:
                    self._remove_directory(target_path)
                    raise
        except zipfile.BadZipFile as error:
            logger.warning("Rejected corrupted ZIP upload: %s", uploaded_file.filename)
            raise InvalidZipError("The uploaded file is not a valid ZIP archive.") from error
        finally:
            archive_path.unlink(missing_ok=True)

        logger.info(
            "Uploaded project %s to %s (%s files, %s directories, %s bytes)",
            project_name,
            target_path,
            total_files,
            total_directories,
            total_size,
        )
        return UploadedProject(
            project_name=project_name,
            location=str(target_path.resolve()),
            total_files=total_files,
            total_directories=total_directories,
        )

    @staticmethod
    def _configured_path(
        environment_variable: str, configured_path: Path | None, default_path: Path
    ) -> Path:
        environment_path = os.getenv(environment_variable)
        if environment_path:
            return Path(environment_path).expanduser()
        return configured_path or default_path

    @staticmethod
    def _validate_filename(filename: str | None) -> None:
        if not filename or not filename.lower().endswith(".zip"):
            raise InvalidZipError("Only .zip files can be uploaded.")

    async def _store_upload(self, uploaded_file: UploadFile) -> Path:
        """Stream the request file to temporary storage with a strict size limit."""
        archive_path: Path | None = None
        try:
            self.upload_root.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="wb", suffix=".zip", prefix="upload-", dir=self.upload_root, delete=False
            ) as temporary_file:
                archive_path = Path(temporary_file.name)
                total_bytes = 0
                exceeds_size_limit = False

                while chunk := await uploaded_file.read(CHUNK_SIZE_BYTES):
                    total_bytes += len(chunk)
                    if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                        exceeds_size_limit = True
                        break
                    temporary_file.write(chunk)

            if exceeds_size_limit:
                archive_path.unlink(missing_ok=True)
                raise UploadTooLargeError("Upload exceeds the 200 MB size limit.")
        except PermissionError as error:
            if archive_path is not None:
                archive_path.unlink(missing_ok=True)
            logger.exception("Permission denied while storing upload: %s", uploaded_file.filename)
            raise UploadPermissionError("Permission denied while storing the upload.") from error
        except OSError as error:
            if archive_path is not None:
                archive_path.unlink(missing_ok=True)
            logger.exception("Failed to store upload: %s", uploaded_file.filename)
            raise ExtractionError("Could not store the uploaded ZIP file.") from error
        finally:
            await uploaded_file.close()

        if total_bytes == 0:
            archive_path.unlink(missing_ok=True)
            raise EmptyUploadError("Empty uploads are not allowed.")

        return archive_path

    @staticmethod
    def _validated_members(archive: zipfile.ZipFile) -> list[zipfile.ZipInfo]:
        members = archive.infolist()
        if not members:
            raise EmptyUploadError("ZIP file does not contain any files.")

        for member in members:
            UploadService._safe_member_path(member)
            if stat.S_ISLNK(member.external_attr >> 16):
                raise InvalidZipError("ZIP files containing symbolic links are not allowed.")

        return members

    @staticmethod
    def _safe_member_path(member: zipfile.ZipInfo) -> PurePosixPath:
        filename = member.filename.replace("\\", "/")
        member_path = PurePosixPath(filename)
        windows_path = PureWindowsPath(member.filename)

        if (
            not filename
            or "\x00" in filename
            or member_path.is_absolute()
            or windows_path.is_absolute()
            or windows_path.drive
            or ".." in member_path.parts
        ):
            raise InvalidZipError("ZIP file contains an unsafe file path.")

        return member_path

    @staticmethod
    def _project_details(
        filename: str | None, members: list[zipfile.ZipInfo]
    ) -> tuple[str, str | None]:
        file_paths = [
            UploadService._safe_member_path(member)
            for member in members
            if not member.is_dir()
        ]
        if not file_paths:
            raise EmptyUploadError("ZIP file does not contain any files.")

        top_level_parts = {path.parts[0] for path in file_paths}
        has_single_wrapper = len(top_level_parts) == 1 and all(
            len(path.parts) > 1 for path in file_paths
        )
        raw_project_name = (
            next(iter(top_level_parts))
            if has_single_wrapper
            else Path(filename or "project.zip").stem
        )
        project_name = re.sub(r"[^A-Za-z0-9._-]+", "-", raw_project_name).strip(".-_")

        if not project_name:
            raise InvalidZipError("Could not determine a valid project name from the ZIP file.")

        return project_name[:100], next(iter(top_level_parts)) if has_single_wrapper else None

    def _ensure_project_does_not_exist(self, project_name: str, target_path: Path) -> None:
        if target_path.exists():
            raise DuplicateProjectError("A project with this name already exists.")

        try:
            with SessionLocal() as session:
                project_exists = session.scalar(
                    select(Project.id).where(
                        or_(Project.name == project_name, Project.local_path == str(target_path.resolve()))
                    )
                )
        except SQLAlchemyError as error:
            logger.exception("Failed to check uploaded project: %s", project_name)
            raise ExtractionError("Could not verify whether the project already exists.") from error

        if project_exists is not None:
            raise DuplicateProjectError("A project with this name already exists.")

    @staticmethod
    def _reserve_target_directory(target_path: Path) -> None:
        try:
            target_path.mkdir(parents=True, exist_ok=False)
        except FileExistsError as error:
            raise DuplicateProjectError("A project with this name already exists.") from error
        except PermissionError as error:
            raise UploadPermissionError(
                "Permission denied while creating the project directory."
            ) from error

    @staticmethod
    def _extract_archive(
        archive: zipfile.ZipFile,
        members: list[zipfile.ZipInfo],
        target_path: Path,
        wrapper_directory: str | None,
    ) -> None:
        """Extract validated ZIP members without using extractall()."""
        resolved_target = target_path.resolve()

        try:
            for member in members:
                member_path = UploadService._safe_member_path(member)
                relative_parts = member_path.parts
                if wrapper_directory is not None:
                    if relative_parts[0] != wrapper_directory:
                        raise InvalidZipError("ZIP file has inconsistent project paths.")
                    relative_parts = relative_parts[1:]

                if not relative_parts:
                    continue

                destination = target_path.joinpath(*relative_parts)
                resolved_destination = destination.resolve()
                if not resolved_destination.is_relative_to(resolved_target):
                    raise InvalidZipError("ZIP file contains an unsafe file path.")

                if member.is_dir():
                    resolved_destination.mkdir(parents=True, exist_ok=True)
                    continue

                resolved_destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member, "r") as source, resolved_destination.open("wb") as output:
                    shutil.copyfileobj(source, output, length=CHUNK_SIZE_BYTES)
        except zipfile.BadZipFile as error:
            logger.warning("ZIP archive became unreadable during extraction: %s", target_path)
            raise InvalidZipError("The uploaded ZIP archive is corrupted.") from error
        except OSError as error:
            logger.exception("Failed to extract ZIP archive into %s", target_path)
            raise ExtractionError("Failed to extract the ZIP archive.") from error

    @staticmethod
    def _project_statistics(target_path: Path) -> tuple[int, int, int]:
        total_files = 0
        total_directories = 0
        total_size = 0

        for directory_path, directory_names, file_names in os.walk(target_path):
            total_directories += len(directory_names)
            for file_name in file_names:
                file_path = Path(directory_path, file_name)
                if file_path.is_file():
                    total_files += 1
                    total_size += file_path.stat().st_size

        return total_files, total_directories, total_size

    @staticmethod
    def _save_project(*, name: str, local_path: str) -> None:
        project = Project(
            name=name,
            local_path=local_path,
            cloned_at=datetime.now(timezone.utc),
        )

        try:
            with SessionLocal() as session:
                session.add(project)
                session.commit()
        except SQLAlchemyError as error:
            logger.exception("Failed to save uploaded project: %s", name)
            raise ExtractionError("Project was extracted, but could not be saved.") from error

    @staticmethod
    def _remove_directory(target_path: Path) -> None:
        if target_path.exists():
            shutil.rmtree(target_path, ignore_errors=True)
