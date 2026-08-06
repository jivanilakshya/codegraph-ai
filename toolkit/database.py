"""Read-only and maintenance operations against PostgreSQL."""

from typing import Any

from sqlalchemy import create_engine, text


class DatabaseService:
    """Small SQL gateway used by toolkit commands."""

    def __init__(self, database_url: str) -> None:
        self.engine = create_engine(database_url, pool_pre_ping=True)

    def query(self, sql: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), parameters or {})
            return [dict(row._mapping) for row in result]

    def execute(self, sql: str, parameters: dict[str, Any] | None = None) -> None:
        with self.engine.begin() as connection:
            connection.execute(text(sql), parameters or {})

    def projects(self) -> list[dict[str, Any]]:
        return self.query("SELECT id, name, language, local_path, github_url, default_branch, created_at FROM projects ORDER BY id")

    def project(self, project_id: int) -> list[dict[str, Any]]:
        return self.query("SELECT * FROM projects WHERE id = :project_id", {"project_id": project_id})

    def files(self, project_id: int) -> list[dict[str, Any]]:
        return self.query("SELECT id, path, language, size FROM files WHERE project_id = :project_id ORDER BY path", {"project_id": project_id})

    def search_files(self, pattern: str) -> list[dict[str, Any]]:
        return self.query("SELECT id, project_id, path, language, size FROM files WHERE path ILIKE :pattern ORDER BY path", {"pattern": f"%{pattern}%"})

    def metadata(self, project_id: int) -> list[dict[str, Any]]:
        return self.query("SELECT key, value FROM project_metadata WHERE project_id = :project_id ORDER BY key", {"project_id": project_id})

    def statistics(self) -> dict[str, Any]:
        projects = self.query("SELECT COUNT(*) AS count FROM projects")[0]["count"]
        files = self.query("SELECT COUNT(*) AS count FROM files")[0]["count"]
        languages = self.query("SELECT COUNT(DISTINCT language) AS count FROM files WHERE language IS NOT NULL")[0]["count"]
        average = self.query("SELECT COALESCE(AVG(file_count), 0) AS average FROM (SELECT COUNT(f.id) AS file_count FROM projects p LEFT JOIN files f ON f.project_id = p.id GROUP BY p.id) counts")[0]["average"]
        largest = self.query("SELECT p.name, COUNT(f.id) AS file_count FROM projects p LEFT JOIN files f ON f.project_id = p.id GROUP BY p.id, p.name ORDER BY file_count DESC LIMIT 1")
        return {"projects": projects, "files": files, "languages": languages, "average_files": round(float(average), 2), "largest_project": largest[0] if largest else {}}

    def clear(self) -> None:
        self.execute("TRUNCATE TABLE project_metadata, files, projects RESTART IDENTITY CASCADE")

    def seed_project(self, name: str, local_path: str, files: list[dict[str, Any]]) -> bool:
        """Insert a small local project fixture once, returning whether it was added."""
        with self.engine.begin() as connection:
            existing = connection.execute(
                text("SELECT id FROM projects WHERE name = :name"), {"name": name}
            ).scalar_one_or_none()
            if existing is not None:
                return False
            project_id = connection.execute(
                text("""
                    INSERT INTO projects (name, language, local_path, default_branch)
                    VALUES (:name, 'Python', :local_path, 'main')
                    RETURNING id
                """),
                {"name": name, "local_path": local_path},
            ).scalar_one()
            for file_record in files:
                connection.execute(
                    text("""
                        INSERT INTO files (project_id, path, language, size)
                        VALUES (:project_id, :path, :language, :size)
                    """),
                    {"project_id": project_id, **file_record},
                )
            connection.execute(
                text("""
                    INSERT INTO project_metadata (project_id, key, value)
                    VALUES (:project_id, 'seeded_by', 'CodeGraph AI Developer Toolkit')
                """),
                {"project_id": project_id},
            )
        return True
