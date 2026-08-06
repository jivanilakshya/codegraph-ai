"""Interactive entry point for the CodeGraph AI Developer Toolkit."""

from collections import defaultdict

from rich.prompt import Prompt

from .api import ApiClient
from .config import load_settings
from .database import DatabaseService
from .docker import DockerService
from .neo4j import Neo4jService
from .commands import build_commands
from .utils import console, failure, show_panel, warning


def render_menu(commands) -> None:
    grouped = defaultdict(list)
    for command in commands:
        grouped[command.section].append(command)
    lines = ["[bold white]CodeGraph AI Developer Toolkit[/bold white]"]
    for section, section_commands in grouped.items():
        lines.append(f"\n[bold cyan]{section}[/bold cyan]")
        lines.extend(f"[yellow]{command.number:>2}[/yellow]  {command.label}" for command in section_commands)
    lines.append("\n[yellow] 0[/yellow]  Exit")
    show_panel("Developer Console", "\n".join(lines), "blue")


def main() -> None:
    settings = load_settings()
    database = DatabaseService(settings.database_url)
    api = ApiClient(settings.api_url)
    docker = DockerService(settings.compose_file)
    try:
        neo4j = Neo4jService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)
    except Exception as error:
        neo4j = None
        warning(f"Neo4j unavailable until selected: {error}")

    def lazy_neo4j():
        nonlocal neo4j
        if neo4j is None:
            neo4j = Neo4jService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)
        return neo4j

    class Neo4jProxy:
        def __getattr__(self, name):
            return getattr(lazy_neo4j(), name)

    commands = build_commands(settings, database, api, Neo4jProxy(), docker)
    command_map = {command.number: command for command in commands}
    try:
        while True:
            render_menu(commands)
            choice = Prompt.ask("Select an option", default="0")
            if choice == "0":
                break
            try:
                command = command_map[int(choice)]
            except (KeyError, ValueError):
                failure("Unknown menu option.")
                continue
            try:
                command.action()
            except Exception as error:
                failure(str(error))
            Prompt.ask("Press Enter to return to the menu", default="", show_default=False)
    except (EOFError, KeyboardInterrupt):
        console.print()
    finally:
        if neo4j is not None:
            neo4j.close()


if __name__ == "__main__":
    main()
