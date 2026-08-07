"""FastAPI application entry point."""

import logging
import os
from http import HTTPStatus
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.logging import configure_logging
from app.core.startup import wait_for_neo4j, wait_for_postgres
from app.database.neo4j import close_driver, is_neo4j_available
from app.database.postgres import (
    close_postgres,
    is_postgres_available,
)

configure_logging()
logger = logging.getLogger("codegraph")

app = FastAPI(title="CodeGraph AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _runtime_directory(environment_variable: str, default_name: str) -> Path:
    """Resolve an application runtime directory from configuration."""
    configured_path = os.getenv(environment_variable)
    if configured_path:
        return Path(configured_path).expanduser()

    return Path(__file__).resolve().parents[2] / default_name


def _ollama_is_available() -> bool:
    """Check whether the local Ollama service accepts HTTP connections."""
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    try:
        with urlopen(f"{ollama_url}/api/tags", timeout=2):
            return True
    except (OSError, URLError):
        return False


def _log_startup_banner(
    *,
    postgres_connected: bool,
    neo4j_connected: bool,
    ollama_available: bool,
) -> None:
    """Write the concise startup summary shown in Docker logs."""
    separator = "=" * 52
    ollama_status = "✅ Available" if ollama_available else "⚠ Unavailable"

    logger.info(
        "\n%s\n"
        "🚀 CodeGraph AI Backend Starting\n"
        "%s\n\n"
        "✅ PostgreSQL Connected\n"
        "✅ Neo4j Connected\n"
        "✅ Upload Directory Ready\n"
        "✅ Repository Directory Ready\n"
        "🌐 API: http://localhost:8000\n"
        "📖 Swagger: http://localhost:8000/docs\n\n"
        "%s\n"
        "System Status\n"
        "%s\n\n"
        "Backend      : ✅ Running\n"
        "PostgreSQL   : %s\n"
        "Neo4j        : %s\n"
        "Ollama       : %s\n\n"
        "%s",
        separator,
        separator,
        separator,
        separator,
        "✅ Connected" if postgres_connected else "❌ Unavailable",
        "✅ Connected" if neo4j_connected else "❌ Unavailable",
        ollama_status,
        separator,
    )


@app.middleware("http")
async def log_request(request: Request, call_next):
    """Log each API request once in a concise access-log format."""
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("[%s]  %s 500 Internal Server Error", request.method, request.url.path)
        raise

    try:
        phrase = HTTPStatus(response.status_code).phrase
    except ValueError:
        phrase = "Unknown Status"

    logger.info(
        "[%s]  %-22s %s %s",
        request.method,
        request.url.path,
        response.status_code,
        phrase,
    )
    return response


@app.on_event("startup")
def connect_databases() -> None:
    """Prepare runtime directories and report service connectivity."""
    logger.info("Starting backend...")
    upload_directory = _runtime_directory("UPLOAD_PATH", "uploads")
    repository_directory = _runtime_directory("REPOSITORY_PATH", "repositories")

    try:
        upload_directory.mkdir(parents=True, exist_ok=True)
        repository_directory.mkdir(parents=True, exist_ok=True)
    except OSError:
        logger.exception("Could not prepare runtime directories.")
        raise

    wait_for_postgres()
    wait_for_neo4j()
    _log_startup_banner(
        postgres_connected=True,
        neo4j_connected=True,
        ollama_available=_ollama_is_available(),
    )
    logger.info("Application startup complete")


@app.on_event("shutdown")
def disconnect_databases() -> None:
    """Release database resources when the API process stops."""
    close_driver()
    close_postgres()
    logger.info("CodeGraph AI Backend stopped.")


@app.get("/", tags=["health"])
async def health_check() -> dict[str, str]:
    """Return the API service health status."""
    return {
        "status": "ok",
        "service": "CodeGraph AI API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["health"])
async def database_health_check() -> dict[str, bool | str]:
    """Report PostgreSQL and Neo4j connectivity."""
    postgres_available = is_postgres_available()
    neo4j_available = is_neo4j_available()

    return {
        "postgres": postgres_available,
        "neo4j": neo4j_available,
        "status": "healthy"
        if postgres_available and neo4j_available
        else "unhealthy",
    }


app.include_router(api_router)
