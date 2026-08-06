"""Command registry and command implementations."""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable
import subprocess

from .utils import console, failure, show_json, show_panel, success


@dataclass(frozen=True)
class MenuCommand:
    number: int
    label: str
    section: str
    action: Callable[[], None]


def build_commands(settings, database, api, neo4j, docker) -> list[MenuCommand]:
    from .parser import ParserCommands
    from .project import ProjectCommands

    projects = ProjectCommands(database)
    parser = ParserCommands(database, api)

    def neo_action(action):
        def run():
            action()
        return run

    def show_nodes():
        success(f"Nodes: {neo4j.node_count()}")

    def show_relationships():
        success(f"Relationships: {neo4j.relationship_count()}")

    def graph_summary():
        from .utils import show_table
        rows = neo4j.summary()
        show_table("Graph Summary", ["Labels", "Count"], ((", ".join(r["labels"]), r["count"]) for r in rows))

    def clear_graph():
        neo4j.clear()
        success("Neo4j graph cleared.")

    def health():
        payload, elapsed, status = api.health()
        show_json({"status_code": status, "response_time_ms": round(elapsed, 2), "response": payload})

    def all_api_tests():
        endpoints = [("GET", "/"), ("GET", "/health"), ("GET", "/docs")]
        from .utils import show_table
        rows = []
        for method, path in endpoints:
            try:
                _, elapsed, status = api.request(method, path)
                rows.append((path, "PASS", status, f"{elapsed:.2f} ms"))
            except Exception as error:
                rows.append((path, "FAIL", "-", str(error)))
        show_table("API Tests", ["Endpoint", "Result", "Status", "Response Time"], rows)

    def complete_test():
        health()
        all_api_tests()
        database.statistics()
        docker.status()

    def clear_database():
        database.clear()
        success("PostgreSQL project, file, and metadata tables cleared.")

    def seed_repository():
        toolkit_root = Path(__file__).resolve().parent
        fixture_files = []
        for path in sorted(toolkit_root.glob("*.py")):
            fixture_files.append({"path": path.name, "language": "Python", "size": path.stat().st_size})
        if database.seed_project("developer-toolkit-fixture", str(toolkit_root), fixture_files):
            success(f"Seeded developer-toolkit-fixture with {len(fixture_files)} file(s).")
        else:
            console.print("[yellow]developer-toolkit-fixture already exists.[/yellow]")

    def backup_database():
        output = console.input("Backup file path [codegraph_backup.sql]: ").strip() or "codegraph_backup.sql"
        result = subprocess.run(["pg_dump", settings.database_url, "-f", output], capture_output=True, text=True, check=False)
        if result.returncode:
            raise RuntimeError(result.stderr.strip() or "pg_dump failed")
        success(f"Database backup written to {output}.")

    return [
        MenuCommand(1, "Show All Projects", "DATABASE", projects.all_projects),
        MenuCommand(2, "Show Project Details", "DATABASE", projects.details),
        MenuCommand(3, "Show Files in Project", "DATABASE", projects.files),
        MenuCommand(4, "Search File", "DATABASE", projects.search),
        MenuCommand(5, "Show File Count", "DATABASE", projects.file_count),
        MenuCommand(6, "Show Project Metadata", "DATABASE", projects.metadata),
        MenuCommand(7, "Show Database Statistics", "DATABASE", projects.statistics),
        MenuCommand(8, "Scan Project", "PARSER", parser.scan),
        MenuCommand(9, "Parse File", "PARSER", parser.parse_file),
        MenuCommand(10, "Parse Entire Project", "PARSER", parser.parse_entire_project),
        MenuCommand(11, "View AST", "PARSER", parser.view_ast),
        MenuCommand(12, "View Symbols", "PARSER", parser.view_symbols),
        MenuCommand(13, "View Relationships", "PARSER", parser.view_relationships),
        MenuCommand(14, "Node Count", "NEO4J", neo_action(show_nodes)),
        MenuCommand(15, "Relationship Count", "NEO4J", neo_action(show_relationships)),
        MenuCommand(16, "View Graph Summary", "NEO4J", neo_action(graph_summary)),
        MenuCommand(17, "Clear Graph", "NEO4J", neo_action(clear_graph)),
        MenuCommand(18, "Container Status", "DOCKER", lambda: console.print(docker.status())),
        MenuCommand(19, "Restart Containers", "DOCKER", lambda: console.print(docker.restart())),
        MenuCommand(20, "Backend Logs", "DOCKER", lambda: console.print(docker.logs("backend"))),
        MenuCommand(21, "Database Logs", "DOCKER", lambda: console.print(docker.logs("postgres"))),
        MenuCommand(22, "Health Check", "TESTING", health),
        MenuCommand(23, "Test All APIs", "TESTING", all_api_tests),
        MenuCommand(24, "Run Complete Project Test", "TESTING", complete_test),
        MenuCommand(25, "Clear Database", "UTILITY", clear_database),
        MenuCommand(26, "Seed Test Repository", "UTILITY", seed_repository),
        MenuCommand(27, "Backup Database", "UTILITY", backup_database),
    ]
