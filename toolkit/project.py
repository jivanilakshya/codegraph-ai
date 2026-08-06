"""Database-backed project commands."""

from .utils import ask_int, console, show_json, show_table, success


class ProjectCommands:
    def __init__(self, database) -> None:
        self.database = database

    def all_projects(self) -> None:
        rows = self.database.projects()
        show_table("Projects", ["ID", "Name", "Language", "Path", "Branch", "Created"], ((r["id"], r["name"], r["language"], r["local_path"], r["default_branch"], r["created_at"]) for r in rows))

    def details(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is not None:
            rows = self.database.project(project_id)
            show_json(rows[0] if rows else {"error": "Project not found"})

    def files(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is not None:
            rows = self.database.files(project_id)
            show_table("Files", ["ID", "Path", "Language", "Size"], ((r["id"], r["path"], r["language"], r["size"]) for r in rows))

    def search(self) -> None:
        pattern = console.input("Filename search: ").strip()
        rows = self.database.search_files(pattern)
        show_table("Matching Files", ["ID", "Project", "Path", "Language", "Size"], ((r["id"], r["project_id"], r["path"], r["language"], r["size"]) for r in rows))

    def file_count(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is not None:
            count = len(self.database.files(project_id))
            success(f"Project {project_id} contains {count} file(s).")

    def metadata(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is not None:
            rows = self.database.metadata(project_id)
            show_table("Project Metadata", ["Key", "Value"], ((r["key"], r["value"]) for r in rows))

    def statistics(self) -> None:
        show_json(self.database.statistics())
