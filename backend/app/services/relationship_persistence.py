"""Extract and persist project-local Python and JavaScript-family imports."""

import logging
import posixpath
import re
from pathlib import Path

from sqlalchemy import bindparam, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File

logger = logging.getLogger(__name__)

_SOURCE_LANGUAGES = {"Python", "JavaScript", "TypeScript"}
_JAVASCRIPT_EXTENSIONS = (".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx")
_PYTHON_EXTENSIONS = (".py",)
_ES_IMPORT_PATTERN = re.compile(
    r"(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?)[\"']([^\"']+)[\"']",
    re.MULTILINE,
)
_REQUIRE_PATTERN = re.compile(r"\brequire\s*\(\s*[\"']([^\"']+)[\"']\s*\)")
_PYTHON_IMPORT_PATTERN = re.compile(
    r"^\s*import\s+(.+?)\s*(?:#.*)?$", re.MULTILINE
)
_PYTHON_FROM_PATTERN = re.compile(
    r"^\s*from\s+(?P<module>\.*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\.+)\s+"
    r"import\s+(?P<members>.+?)\s*(?:#.*)?$",
    re.MULTILINE,
)


class RelationshipPersistenceError(Exception):
    """Raised when import relationships cannot be persisted."""


class RelationshipPersistenceService:
    """Rebuild one project's import edges after its file inventory is synchronized."""

    def extract_and_store(self, project_id: int, repository_root: Path) -> None:
        """Read source files, resolve local imports, and replace stored import edges."""
        project_files = self._load_project_files(project_id)
        source_files = [file for file in project_files if file.language in _SOURCE_LANGUAGES]
        files_by_path = {file.path: file for file in project_files}
        relationships: set[tuple[int, int, str]] = set()

        for source_file in source_files:
            source_path = (repository_root / source_file.path).resolve()
            if not source_path.is_relative_to(repository_root) or not source_path.is_file():
                continue

            dependencies = self._extract_dependencies(source_path, source_file.language)
            for dependency_path in dependencies:
                target_file = self._resolve_import(
                    source_file.path, source_file.language, dependency_path, files_by_path
                )
                if target_file is None:
                    continue
                relationships.add((source_file.id, target_file.id, "IMPORTS"))

        self._replace_import_relationships(
            project_id, relationships, [file.id for file in project_files]
        )

    @staticmethod
    def _load_project_files(project_id: int) -> list[File]:
        try:
            with SessionLocal() as session:
                return list(
                    session.scalars(
                        select(File).where(File.project_id == project_id)
                    )
                )
        except SQLAlchemyError as error:
            raise RelationshipPersistenceError(
                "Could not load project files for relationship extraction."
            ) from error

    @staticmethod
    def _extract_dependencies(source_path: Path, language: str | None) -> list[str]:
        try:
            source = source_path.read_text(encoding="utf-8", errors="replace")
        except OSError as error:
            logger.debug("Could not read %s for dependency extraction: %s", source_path, error)
            return []

        if language == "Python":
            imports = []
            for matched_import in _PYTHON_IMPORT_PATTERN.findall(source):
                imports.extend(
                    part.strip().split(" as ", 1)[0].strip()
                    for part in matched_import.split(",")
                )
            for match in _PYTHON_FROM_PATTERN.finditer(source):
                module = match.group("module")
                imports.append(module)
                if module.rstrip(".") == "":
                    imports.extend(
                        module + part.strip().split(" as ", 1)[0].strip()
                        for part in match.group("members").split(",")
                    )
            return list(dict.fromkeys(filter(None, imports)))

        imports = _ES_IMPORT_PATTERN.findall(source)
        requires = _REQUIRE_PATTERN.findall(source)
        return list(dict.fromkeys([*imports, *requires]))

    @staticmethod
    def _resolve_import(
        source_path: str,
        language: str | None,
        dependency_path: str,
        files_by_path: dict[str, File],
    ) -> File | None:
        if language == "Python":
            return RelationshipPersistenceService._resolve_python_import(
                source_path, dependency_path, files_by_path
            )
        return RelationshipPersistenceService._resolve_javascript_import(
            source_path, dependency_path, files_by_path
        )

    @staticmethod
    def _resolve_javascript_import(
        source_path: str, dependency_path: str, files_by_path: dict[str, File]
    ) -> File | None:
        """Resolve a JavaScript/TypeScript relative specifier to a scanned file."""
        if not dependency_path.startswith("."):
            return None

        candidate = posixpath.normpath(
            (Path(source_path).parent / dependency_path).as_posix()
        )
        candidates = [candidate]
        if not Path(candidate).suffix:
            candidates.extend(f"{candidate}{extension}" for extension in _JAVASCRIPT_EXTENSIONS)
        candidates.extend(f"{candidate}/index{extension}" for extension in _JAVASCRIPT_EXTENSIONS)
        return next((files_by_path[path] for path in candidates if path in files_by_path), None)

    @staticmethod
    def _resolve_python_import(
        source_path: str, module: str, files_by_path: dict[str, File]
    ) -> File | None:
        """Resolve absolute and relative Python module names inside one project."""
        if module.startswith("."):
            level = len(module) - len(module.lstrip("."))
            base = Path(source_path).parent
            for _ in range(max(level - 1, 0)):
                base = base.parent
            module_path = module[level:].replace(".", "/")
            candidate = (base / module_path).as_posix() if module_path else base.as_posix()
        else:
            candidate = module.replace(".", "/")

        candidates = [f"{candidate}{extension}" for extension in _PYTHON_EXTENSIONS]
        candidates.extend(f"{candidate}/__init__{extension}" for extension in _PYTHON_EXTENSIONS)
        return next((files_by_path[path] for path in candidates if path in files_by_path), None)

    @staticmethod
    def _replace_import_relationships(
        project_id: int,
        relationships: set[tuple[int, int, str]],
        source_ids: list[int],
    ) -> None:
        """Atomically replace only this project's import relationships."""
        try:
            with SessionLocal() as session:
                if source_ids:
                    session.execute(
                        text(
                            "DELETE FROM file_relationships "
                            "WHERE relationship_type = :relationship_type "
                            "AND source_file_id IN :source_ids"
                        ).bindparams(bindparam("source_ids", expanding=True)),
                        {
                            "relationship_type": "IMPORTS",
                            "source_ids": source_ids,
                        },
                    )

                rows = [
                    {
                        "source_file_id": source_id,
                        "target_file_id": target_id,
                        "relationship_type": relationship_type,
                    }
                    for source_id, target_id, relationship_type in sorted(relationships)
                ]
                if rows:
                    session.execute(
                        text(
                            "INSERT INTO file_relationships "
                            "(source_file_id, target_file_id, relationship_type) "
                            "VALUES (:source_file_id, :target_file_id, :relationship_type)"
                        ),
                        rows,
                    )
                session.commit()
                logger.debug(
                    "Inserted %s import relationships for project %s: %s",
                    len(rows),
                    project_id,
                    [(row["source_file_id"], row["target_file_id"]) for row in rows],
                )
        except SQLAlchemyError as error:
            raise RelationshipPersistenceError(
                "Could not store extracted import relationships."
            ) from error
