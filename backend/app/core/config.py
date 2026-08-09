"""Configuration loading and validation for the backend process."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url


# Local ``uvicorn app.main:app`` runs from ``backend/`` and Docker injects the
# same values through Compose. ``override=False`` keeps container and shell
# environment variables authoritative.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env", override=False)


def get_database_url() -> str:
    """Return a valid PostgreSQL URL and reject conflicting DB settings."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is required. Copy backend/.env.example to backend/.env "
            "for local development, or set it in the deployment environment."
        )

    url = make_url(database_url)
    if not url.drivername.startswith("postgresql") or not url.database:
        raise RuntimeError("DATABASE_URL must identify a PostgreSQL database.")

    configured_database = os.getenv("POSTGRES_DB")
    if configured_database and configured_database != url.database:
        raise RuntimeError(
            "DATABASE_URL and POSTGRES_DB refer to different databases "
            f"({url.database!r} and {configured_database!r})."
        )
    return database_url
