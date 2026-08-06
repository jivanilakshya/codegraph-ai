"""Shared presentation and input helpers."""

from collections.abc import Iterable
import json
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table


console = Console()


def success(message: str) -> None:
    console.print(f"[green]✓[/green] {message}")


def warning(message: str) -> None:
    console.print(f"[yellow]⚠[/yellow] {message}")


def failure(message: str) -> None:
    console.print(f"[red]✗[/red] {message}")


def show_json(value: Any) -> None:
    console.print_json(json.dumps(value, default=str))


def show_table(title: str, columns: Iterable[str], rows: Iterable[Iterable[Any]]) -> None:
    table = Table(title=title, header_style="bold cyan", expand=True)
    column_list = list(columns)
    for column in column_list:
        table.add_column(str(column))
    for row in rows:
        values = list(row)
        table.add_row(*("-" if value is None else str(value) for value in values))
    console.print(table)


def show_panel(title: str, body: str, style: str = "cyan") -> None:
    console.print(Panel(body, title=title, border_style=style))


def ask_int(prompt: str) -> int | None:
    raw = console.input(f"[bold]{prompt}[/bold] ").strip()
    try:
        return int(raw)
    except ValueError:
        failure("Please enter a numeric value.")
        return None
