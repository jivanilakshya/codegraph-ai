"""Project-scoped Dead Code Detection service."""

import logging
import re
from pathlib import PurePosixPath

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.project import Project
from app.models.relationship import FileRelationship
from app.schemas.dead_code import (
    DeadCodeItem,
    DeadCodeResponse,
    DeadCodeSummary,
)

logger = logging.getLogger(__name__)


class DeadCodeProjectNotFoundError(Exception):
    """Raised when the specified project ID does not exist."""


class DeadCodeServiceError(Exception):
    """Base error raised during dead code analysis."""


class DeadCodeService:
    """Analyze a project to detect potential unused files, classes, functions, methods, and variables."""

    # Recognized entrypoint filenames that are not imported directly by other files
    _ENTRY_POINT_FILENAMES = frozenset({
        "main.py", "app.py", "wsgi.py", "asgi.py", "manage.py", "setup.py",
        "index.ts", "index.js", "index.tsx", "index.jsx", "server.ts", "server.js",
        "page.tsx", "page.jsx", "layout.tsx", "layout.jsx", "route.ts", "route.js",
        "next.config.js", "next.config.mjs", "next.config.ts", "vite.config.ts",
        "vite.config.js", "tailwind.config.js", "tailwind.config.ts",
        "tsconfig.json", "package.json", "__init__.py", "__main__.py",
        "cli.py", "dockerfile", "docker-compose.yml",
    })

    # Test file patterns
    _TEST_FILE_REGEX = re.compile(
        r"(?:^|/)(?:test_[^/]+\.py|[^/]+_test\.py|[^/]+\.test\.[jt]sx?|[^/]+\.spec\.[jt]sx?|conftest\.py)$",
        re.IGNORECASE,
    )

    # Magic / lifecycle / dunder methods that shouldn't be flagged as unused
    _IGNORED_METHOD_NAMES = frozenset({
        "__init__", "__str__", "__repr__", "__enter__", "__exit__", "__call__",
        "__eq__", "__ne__", "__lt__", "__le__", "__gt__", "__ge__", "__hash__",
        "__len__", "__getitem__", "__setitem__", "__delitem__", "__iter__", "__next__",
        "__contains__", "__getattr__", "__setattr__", "__delattr__", "__post_init__",
        "constructor", "toString", "valueOf", "toJSON", "componentDidMount",
        "componentWillUnmount", "render", "getInitialProps", "getServerSideProps",
        "getStaticProps", "generateMetadata", "default",
    })

    # Recognized entrypoint function names
    _IGNORED_FUNCTION_NAMES = frozenset({
        "main", "cli", "handler", "setup", "run", "start", "init",
        "get_db", "get_session", "lifespan",
    })

    # Recognized framework / base class names
    _IGNORED_CLASS_NAMES = frozenset({
        "App", "Config", "Settings", "Database", "BaseModel", "Base", "Migration",
    })

    def detect_dead_code(self, project_id: int) -> DeadCodeResponse:
        """Perform project-scoped dead code analysis."""
        try:
            with SessionLocal() as session:
                # 1. Ensure project exists (Project Isolation)
                project = session.get(Project, project_id)
                if project is None:
                    raise DeadCodeProjectNotFoundError(f"Project with ID {project_id} was not found.")

                # 2. Fetch all project files
                files = session.scalars(
                    select(File).where(File.project_id == project_id).order_by(File.id)
                ).all()

                if not files:
                    return DeadCodeResponse(
                        project_id=project_id,
                        total_candidates=0,
                        summary=DeadCodeSummary(),
                        items=[],
                    )

                file_map = {file.id: file for file in files}
                file_ids = set(file_map.keys())

                # 3. Fetch file-to-file relationships for project files
                file_rels = session.scalars(
                    select(FileRelationship)
                    .where(
                        FileRelationship.source_file_id.in_(file_ids),
                        FileRelationship.target_file_id.in_(file_ids),
                    )
                ).all()

                # Target files of IMPORTS relationship
                imported_file_ids = {rel.target_file_id for rel in file_rels if rel.relationship_type == "IMPORTS"}

                # 4. Fetch code entities for project files
                entities = session.scalars(
                    select(CodeEntity)
                    .join(File, CodeEntity.file_id == File.id)
                    .where(File.project_id == project_id)
                    .order_by(CodeEntity.id)
                ).all()

                entity_map = {entity.id: entity for entity in entities}
                entity_ids = set(entity_map.keys())

                # 5. Fetch entity-to-entity relationships for project entities
                entity_rels = session.scalars(
                    select(EntityRelationship)
                    .where(
                        EntityRelationship.source_entity_id.in_(entity_ids),
                        EntityRelationship.target_entity_id.in_(entity_ids),
                    )
                ).all() if entity_ids else []

                # Target entities of CALLS, EXTENDS, or HAS_METHOD relationships
                called_entity_ids = {
                    rel.target_entity_id
                    for rel in entity_rels
                    if rel.relationship_type in ("CALLS", "EXTENDS", "HAS_METHOD")
                }

                items: list[DeadCodeItem] = []
                summary = DeadCodeSummary()

                # 6. Analyze Potential Dead Files
                for file in files:
                    if self._is_potential_dead_file(file, imported_file_ids):
                        summary.files += 1
                        items.append(
                            DeadCodeItem(
                                id=f"file_{file.id}",
                                entity_type="file",
                                name=file.path,
                                file_id=file.id,
                                file_path=file.path,
                                confidence="medium",
                                reason="File has no incoming import references from other workspace files and is not a recognized entry point.",
                            )
                        )

                # 7. Analyze Potential Dead Symbols / Entities
                for entity in entities:
                    item = self._analyze_entity(entity, file_map, called_entity_ids)
                    if item is not None:
                        if item.entity_type == "class":
                            summary.classes += 1
                        elif item.entity_type == "function":
                            summary.functions += 1
                        elif item.entity_type == "method":
                            summary.methods += 1
                        elif item.entity_type == "variable":
                            summary.variables += 1
                        items.append(item)

                return DeadCodeResponse(
                    project_id=project_id,
                    total_candidates=len(items),
                    summary=summary,
                    items=items,
                )
        except DeadCodeProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception("Database error while analyzing dead code for project %s", project_id)
            raise DeadCodeServiceError("Could not retrieve code entities for dead code analysis.") from error
        except Exception as error:
            logger.exception("Unexpected error during dead code analysis for project %s", project_id)
            raise DeadCodeServiceError("Dead code analysis failed.") from error

    def _is_potential_dead_file(self, file: File, imported_file_ids: set[int]) -> bool:
        """Determine if a file is a candidate for dead code."""
        if file.id in imported_file_ids:
            return False

        path_obj = PurePosixPath(file.path)
        filename = path_obj.name.lower()

        # Skip entry points and tests
        if filename in self._ENTRY_POINT_FILENAMES:
            return False
        if self._TEST_FILE_REGEX.search(file.path):
            return False

        return True

    def _analyze_entity(
        self,
        entity: CodeEntity,
        file_map: dict[int, File],
        called_entity_ids: set[int],
    ) -> DeadCodeItem | None:
        """Evaluate a CodeEntity to check if it's potentially dead code."""
        if entity.id in called_entity_ids:
            return None

        file = file_map.get(entity.file_id)
        if file is None:
            return None

        entity_type = entity.entity_type.lower()
        name = entity.name

        # Method checks
        if entity_type == "method":
            if name in self._IGNORED_METHOD_NAMES or name.startswith("__"):
                return None
            return DeadCodeItem(
                id=f"entity_{entity.id}",
                entity_type="method",
                name=name,
                file_id=entity.file_id,
                file_path=file.path,
                start_line=entity.start_line,
                end_line=entity.end_line,
                confidence="high",
                reason="Method has no incoming CALLS or HAS_METHOD relationship edges in the knowledge graph.",
            )

        # Function checks
        if entity_type == "function":
            if name in self._IGNORED_FUNCTION_NAMES or name in self._IGNORED_METHOD_NAMES or name.startswith("__"):
                return None
            confidence = "high" if not name.startswith("test_") else "low"
            if self._TEST_FILE_REGEX.search(file.path):
                return None
            return DeadCodeItem(
                id=f"entity_{entity.id}",
                entity_type="function",
                name=name,
                file_id=entity.file_id,
                file_path=file.path,
                start_line=entity.start_line,
                end_line=entity.end_line,
                confidence=confidence,
                reason="Function has no incoming CALLS relationship edges in the knowledge graph.",
            )

        # Class checks
        if entity_type == "class":
            if name in self._IGNORED_CLASS_NAMES or name.startswith("Test"):
                return None
            return DeadCodeItem(
                id=f"entity_{entity.id}",
                entity_type="class",
                name=name,
                file_id=entity.file_id,
                file_path=file.path,
                start_line=entity.start_line,
                end_line=entity.end_line,
                confidence="medium",
                reason="Class is not instantiated, extended, or referenced by active call edges.",
            )

        # Variable checks
        if entity_type == "variable":
            if name.isupper() or name in {"__all__", "app", "router", "logger", "config"}:
                return None
            return DeadCodeItem(
                id=f"entity_{entity.id}",
                entity_type="variable",
                name=name,
                file_id=entity.file_id,
                file_path=file.path,
                start_line=entity.start_line,
                end_line=entity.end_line,
                confidence="low",
                reason="Variable has no detected incoming usage edges in the knowledge graph.",
            )

        return None
