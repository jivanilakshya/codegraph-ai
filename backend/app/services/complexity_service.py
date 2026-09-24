"""Project-scoped Complexity Analysis service."""

import logging
import os
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.code_entity import CodeEntity
from app.models.file import File
from app.models.project import Project
from app.schemas.complexity import (
    ComplexityItem,
    ComplexityResponse,
    ComplexitySummary,
)

logger = logging.getLogger(__name__)


class ComplexityProjectNotFoundError(Exception):
    """Raised when the specified project ID does not exist."""


class ComplexityServiceError(Exception):
    """Base error raised during complexity analysis."""


class ComplexityService:
    """Calculate cyclomatic complexity and line metrics for project functions and methods."""

    # Python control-flow decision patterns
    _PY_DECISION_PATTERNS = [
        re.compile(r"\bif\b"),
        re.compile(r"\belif\b"),
        re.compile(r"\bfor\b"),
        re.compile(r"\bwhile\b"),
        re.compile(r"\bexcept\b"),
        re.compile(r"\band\b"),
        re.compile(r"\bor\b"),
    ]

    # JavaScript / TypeScript control-flow decision patterns
    _JS_DECISION_PATTERNS = [
        re.compile(r"\bif\b"),
        re.compile(r"\bfor\b"),
        re.compile(r"\bwhile\b"),
        re.compile(r"\bcatch\b"),
        re.compile(r"\bcase\b"),
        re.compile(r"\?"),  # Ternary
        re.compile(r"&&"),
        re.compile(r"\|\|"),
    ]

    def analyze_project(self, project_id: int) -> ComplexityResponse:
        """Perform project-scoped complexity analysis."""
        try:
            with SessionLocal() as session:
                # 1. Verify project existence (Project Isolation)
                project = session.get(Project, project_id)
                if project is None:
                    raise ComplexityProjectNotFoundError(
                        f"Project with ID {project_id} was not found."
                    )

                from app.services.project_settings_service import ProjectSettingsService
                settings = ProjectSettingsService().get_settings(project_id)
                if not settings.enable_complexity:
                    return ComplexityResponse(
                        project_id=project_id,
                        summary=ComplexitySummary(),
                        items=[],
                    )

                # 2. Fetch function and method entities scoped to project_id
                entities = session.scalars(
                    select(CodeEntity)
                    .join(File, CodeEntity.file_id == File.id)
                    .where(
                        File.project_id == project_id,
                        CodeEntity.entity_type.in_(["function", "method"]),
                    )
                    .order_by(CodeEntity.id)
                ).all()

                if not entities:
                    return ComplexityResponse(
                        project_id=project_id,
                        summary=ComplexitySummary(),
                        items=[],
                    )

                # Collect files map
                file_ids = {entity.file_id for entity in entities}
                files = session.scalars(
                    select(File).where(File.id.in_(file_ids))
                ).all()
                file_map = {file.id: file for file in files}

                # Load file content cache to avoid redundant reads
                file_content_cache: dict[int, list[str] | None] = {}
                for file_id, file in file_map.items():
                    file_content_cache[file_id] = self._read_file_lines(file, project.local_path)

                items: list[ComplexityItem] = []
                high_count = 0
                medium_count = 0
                low_count = 0
                max_complexity = 0
                total_complexity = 0

                for entity in entities:
                    file = file_map.get(entity.file_id)
                    if file is None:
                        continue

                    lines = file_content_cache.get(entity.file_id)
                    complexity = self.calculate_complexity(
                        entity_type=entity.entity_type,
                        language=file.language or "",
                        start_line=entity.start_line,
                        end_line=entity.end_line,
                        lines=lines,
                    )

                    line_count = entity.end_line - entity.start_line + 1

                    # Size warning rules
                    if line_count > 100:
                        size_warning = "very_large"
                    elif line_count > 50:
                        size_warning = "large"
                    else:
                        size_warning = None

                    # Severity rules
                    if complexity > 10:
                        severity = "high"
                        high_count += 1
                    elif complexity >= 6:
                        severity = "medium"
                        medium_count += 1
                    else:
                        severity = "low"
                        low_count += 1

                    max_complexity = max(max_complexity, complexity)
                    total_complexity += complexity

                    items.append(
                        ComplexityItem(
                            entity_id=entity.id,
                            entity_type=entity.entity_type,
                            name=entity.name,
                            file_id=entity.file_id,
                            file_path=file.path,
                            start_line=entity.start_line,
                            end_line=entity.end_line,
                            line_count=line_count,
                            complexity=complexity,
                            severity=severity,
                            size_warning=size_warning,
                        )
                    )

                # Sort deterministically:
                # 1. complexity descending
                # 2. severity
                # 3. file_path
                # 4. start_line
                # 5. entity name
                # 6. entity_id
                severity_rank = {"high": 0, "medium": 1, "low": 2}
                items.sort(
                    key=lambda item: (
                        -item.complexity,
                        severity_rank.get(item.severity, 3),
                        item.file_path,
                        item.start_line,
                        item.name,
                        item.entity_id,
                    )
                )

                total_items = len(items)
                avg_complexity = (
                    round(total_complexity / total_items, 2) if total_items > 0 else 0.0
                )

                summary = ComplexitySummary(
                    total_items=total_items,
                    high_complexity=high_count,
                    medium_complexity=medium_count,
                    low_complexity=low_count,
                    average_complexity=avg_complexity,
                    max_complexity=max_complexity,
                )

                return ComplexityResponse(
                    project_id=project_id,
                    summary=summary,
                    items=items,
                )
        except ComplexityProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception(
                "Database error during complexity analysis for project %s", project_id
            )
            raise ComplexityServiceError(
                "Could not retrieve code entities for complexity analysis."
            ) from error
        except Exception as error:
            logger.exception(
                "Unexpected error during complexity analysis for project %s", project_id
            )
            raise ComplexityServiceError("Complexity analysis failed.") from error

    def calculate_complexity(
        self,
        entity_type: str,
        language: str,
        start_line: int,
        end_line: int,
        lines: list[str] | None = None,
        source_code: str | None = None,
    ) -> int:
        """Calculate cyclomatic complexity score starting at 1."""
        complexity = 1

        if source_code is not None:
            entity_lines = source_code.splitlines()
        elif lines is not None:
            # Lines are 1-indexed
            s_idx = max(0, start_line - 1)
            e_idx = min(len(lines), end_line)
            entity_lines = lines[s_idx:e_idx]
        else:
            return complexity

        lang_lower = (language or "").lower()
        is_python = "python" in lang_lower or any(l.strip().startswith("def ") or l.strip().startswith("class ") for l in entity_lines)
        is_js_ts = any(kw in lang_lower for kw in ["javascript", "typescript", "js", "ts"]) or not is_python

        patterns = self._PY_DECISION_PATTERNS if is_python else self._JS_DECISION_PATTERNS

        for line in entity_lines:
            # Strip string literals and single-line comments to avoid false positives
            clean_line = self._strip_comments_and_strings(line, is_python)
            if not clean_line:
                continue

            for pattern in patterns:
                matches = pattern.findall(clean_line)
                complexity += len(matches)

        return complexity

    @staticmethod
    def _read_file_lines(file: File, local_path: str | None) -> list[str] | None:
        """Attempt to read lines of a source file from local disk."""
        possible_paths = []
        if local_path:
            possible_paths.append(Path(local_path) / file.path)
            possible_paths.append(Path(local_path) / Path(file.path).name)

        possible_paths.append(Path(file.path))

        for path in possible_paths:
            if path.exists() and path.is_file():
                try:
                    return path.read_text(encoding="utf-8", errors="replace").splitlines()
                except Exception:
                    pass
        return None

    @staticmethod
    def _strip_comments_and_strings(line: str, is_python: bool) -> str:
        """Remove string literals and line comments from a source line."""
        # Remove comments
        if is_python:
            comment_idx = line.find("#")
            if comment_idx != -1:
                line = line[:comment_idx]
        else:
            comment_idx = line.find("//")
            if comment_idx != -1:
                line = line[:comment_idx]

        # Simple string literal removal (quotes)
        line = re.sub(r'".*?"|\'.*?\'|`.*?`', '""', line)
        return line.strip()
