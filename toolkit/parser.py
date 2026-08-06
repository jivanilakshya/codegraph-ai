"""Parser and backend API commands."""

from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn

from .utils import ask_int, console, show_json, success


class ParserCommands:
    def __init__(self, database, api) -> None:
        self.database = database
        self.api = api

    def scan(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is not None:
            payload, elapsed, _ = self.api.scan(project_id)
            show_json({"response": payload, "response_time_ms": round(elapsed, 2)})

    def parse_file(self) -> None:
        file_id = ask_int("File ID:")
        if file_id is not None:
            payload, elapsed, _ = self.api.parse(file_id)
            show_json({"response": payload, "response_time_ms": round(elapsed, 2)})

    def parse_entire_project(self) -> None:
        project_id = ask_int("Project ID:")
        if project_id is None:
            return
        files = self.database.files(project_id)
        with Progress(SpinnerColumn(), TextColumn("{task.description}"), BarColumn(), "{task.completed}/{task.total}") as progress:
            task = progress.add_task("Parsing files", total=len(files))
            failures = 0
            for file_record in files:
                try:
                    self.api.parse(file_record["id"])
                except Exception as error:
                    failures += 1
                    progress.console.print(f"[red]{file_record['path']}: {error}[/red]")
                progress.advance(task)
        success(f"Parsed {len(files) - failures}/{len(files)} file(s).")

    def _view(self, field: str) -> None:
        file_id = ask_int("File ID:")
        if file_id is None:
            return
        payload, _, _ = self.api.ast(file_id)
        show_json(payload.get(field, payload) if isinstance(payload, dict) else payload)

    def view_ast(self) -> None:
        self._view("ast")

    def view_symbols(self) -> None:
        self._view("symbols")

    def view_relationships(self) -> None:
        self._view("relationships")
