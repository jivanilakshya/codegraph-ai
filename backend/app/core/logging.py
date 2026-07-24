"""Console logging configuration for the CodeGraph AI backend."""

import logging
import os
import sys


class ConsoleFormatter(logging.Formatter):
    """Render concise, color-aware console log messages."""

    _RESET = "\033[0m"
    _CYAN = "\033[36m"
    _YELLOW = "\033[33m"
    _RED = "\033[31m"

    def __init__(self) -> None:
        super().__init__()
        self._use_color = sys.stderr.isatty() or os.getenv("FORCE_COLOR") == "1"

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()

        if record.levelno >= logging.ERROR:
            message = f"❌ ERROR: {message}"
            color = self._RED
        elif record.levelno >= logging.WARNING:
            message = f"⚠ WARNING: {message}"
            color = self._YELLOW
        else:
            color = self._CYAN

        if record.exc_info:
            message = f"{message}\n{self.formatException(record.exc_info)}"

        if self._use_color and color:
            return f"{color}{message}{self._RESET}"
        return message


def configure_logging() -> None:
    """Configure compact application logging and quiet noisy dependencies."""
    handler = logging.StreamHandler()
    handler.setFormatter(ConsoleFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    for logger_name in (
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "watchfiles",
        "watchfiles.main",
        "sqlalchemy.engine",
        "neo4j",
    ):
        library_logger = logging.getLogger(logger_name)
        library_logger.handlers.clear()
        library_logger.propagate = True
        library_logger.setLevel(logging.WARNING)
