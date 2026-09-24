"""Project-scoped Circular Dependency Detection service."""

import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.models.relationship import FileRelationship
from app.schemas.circular_dependency import (
    CircularDependencyItem,
    CircularDependencyResponse,
    CircularDependencySummary,
)

logger = logging.getLogger(__name__)


class CircularDependencyProjectNotFoundError(Exception):
    """Raised when the specified project ID does not exist."""


class CircularDependencyServiceError(Exception):
    """Base error raised during circular dependency analysis."""


class CircularDependencyService:
    """Analyze a project's IMPORTS relationships to detect directed dependency cycles."""

    MAX_CYCLE_LENGTH = 10

    def detect_cycles(self, project_id: int) -> CircularDependencyResponse:
        """Perform project-scoped circular dependency analysis."""
        try:
            with SessionLocal() as session:
                # 1. Verify project existence (Project Isolation)
                project = session.get(Project, project_id)
                if project is None:
                    raise CircularDependencyProjectNotFoundError(
                        f"Project with ID {project_id} was not found."
                    )

                from app.services.project_settings_service import ProjectSettingsService
                settings = ProjectSettingsService().get_settings(project_id)
                if not settings.enable_circular_dependency:
                    return CircularDependencyResponse(
                        project_id=project_id,
                        summary=CircularDependencySummary(),
                        cycles=[],
                    )

                # 2. Fetch all project files
                files = session.scalars(
                    select(File).where(File.project_id == project_id).order_by(File.id)
                ).all()

                if not files:
                    return CircularDependencyResponse(
                        project_id=project_id,
                        summary=CircularDependencySummary(),
                        cycles=[],
                    )

                file_map = {file.id: file for file in files}
                file_ids = set(file_map.keys())

                # 3. Fetch IMPORTS file relationships bounded by project files
                import_rels = session.scalars(
                    select(FileRelationship)
                    .where(
                        FileRelationship.source_file_id.in_(file_ids),
                        FileRelationship.target_file_id.in_(file_ids),
                        FileRelationship.relationship_type == "IMPORTS",
                    )
                ).all()

                # Build adjacency list: source -> set of targets (excluding self-loops)
                adj: dict[int, set[int]] = defaultdict(set)
                for rel in import_rels:
                    if rel.source_file_id != rel.target_file_id and rel.source_file_id in file_map and rel.target_file_id in file_map:
                        adj[rel.source_file_id].add(rel.target_file_id)

                # 4. Bounded DFS cycle detection with rotation normalization
                raw_cycles: list[list[int]] = []
                sorted_file_ids = sorted(file_ids)

                for start_node in sorted_file_ids:
                    self._dfs_find_cycles(
                        start_node=start_node,
                        current_node=start_node,
                        path=[start_node],
                        visited_in_path={start_node},
                        adj=adj,
                        raw_cycles=raw_cycles,
                    )

                # 5. Build response items and summary
                items: list[CircularDependencyItem] = []
                high_count = 0
                medium_count = 0
                low_count = 0
                max_length = 0

                for cycle_nodes in raw_cycles:
                    length = len(cycle_nodes)
                    max_length = max(max_length, length)

                    if length == 2:
                        severity = "low"
                        low_count += 1
                        explanation = "Two files import each other directly."
                    elif length == 3:
                        severity = "medium"
                        medium_count += 1
                        explanation = "Three files form a circular import chain."
                    else:
                        severity = "high"
                        high_count += 1
                        explanation = f"A larger dependency cycle of {length} files was detected across multiple files."

                    node_paths = [file_map[nid].path for nid in cycle_nodes]
                    cycle_flow = node_paths + [file_map[cycle_nodes[0]].path]
                    cycle_id = f"cycle_{'_'.join(str(nid) for nid in cycle_nodes)}"

                    items.append(
                        CircularDependencyItem(
                            id=cycle_id,
                            project_id=project_id,
                            cycle=cycle_flow,
                            cycle_length=length,
                            severity=severity,
                            explanation=explanation,
                            file_ids=cycle_nodes,
                            file_paths=node_paths,
                        )
                    )

                # Deterministic sorting: high severity first, then length descending, then path ascending
                severity_rank = {"high": 0, "medium": 1, "low": 2}
                items.sort(key=lambda item: (severity_rank.get(item.severity, 3), -item.cycle_length, item.file_paths[0]))

                summary = CircularDependencySummary(
                    total_cycles=len(items),
                    high_severity=high_count,
                    medium_severity=medium_count,
                    low_severity=low_count,
                    max_cycle_length=max_length,
                )

                return CircularDependencyResponse(
                    project_id=project_id,
                    summary=summary,
                    cycles=items,
                )
        except CircularDependencyProjectNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception("Database error while analyzing circular dependencies for project %s", project_id)
            raise CircularDependencyServiceError("Could not retrieve file relationships for dependency analysis.") from error
        except Exception as error:
            logger.exception("Unexpected error during circular dependency analysis for project %s", project_id)
            raise CircularDependencyServiceError("Circular dependency analysis failed.") from error

    def _dfs_find_cycles(
        self,
        start_node: int,
        current_node: int,
        path: list[int],
        visited_in_path: set[int],
        adj: dict[int, set[int]],
        raw_cycles: list[list[int]],
    ) -> None:
        """DFS traversal starting from start_node to find simple cycles where start_node is the minimum ID."""
        if len(path) > self.MAX_CYCLE_LENGTH:
            return

        for neighbor in sorted(adj.get(current_node, ())):
            # Only consider neighbors >= start_node to enforce unique rotation (canonical start_node = min in cycle)
            if neighbor < start_node:
                continue

            if neighbor == start_node:
                # Cycle closed back to start_node!
                if len(path) >= 2:
                    raw_cycles.append(list(path))
            elif neighbor not in visited_in_path:
                visited_in_path.add(neighbor)
                path.append(neighbor)
                self._dfs_find_cycles(
                    start_node=start_node,
                    current_node=neighbor,
                    path=path,
                    visited_in_path=visited_in_path,
                    adj=adj,
                    raw_cycles=raw_cycles,
                )
                path.pop()
                visited_in_path.remove(neighbor)
