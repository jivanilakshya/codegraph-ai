"""PostgreSQL engine and session configuration."""

import os
import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import sessionmaker

from app.database.base import Base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required.")

database_url = make_url(DATABASE_URL)
if not database_url.drivername.startswith("postgresql") or not database_url.database:
    raise RuntimeError("DATABASE_URL must identify a PostgreSQL database.")

engine: Engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_database_exists() -> None:
    """Create the configured PostgreSQL database when it is not already present."""
    database_name = database_url.database
    maintenance_url = database_url.set(database="postgres")
    maintenance_engine = create_engine(
        maintenance_url,
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
    )

    try:
        with maintenance_engine.connect() as connection:
            database_exists = connection.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :database_name"),
                {"database_name": database_name},
            )
            if database_exists:
                logger.info("PostgreSQL database '%s' is ready.", database_name)
                return

            quoted_database_name = connection.dialect.identifier_preparer.quote(
                database_name
            )
            connection.execute(text(f"CREATE DATABASE {quoted_database_name}"))
            logger.info("Created PostgreSQL database '%s'.", database_name)
    finally:
        maintenance_engine.dispose()


def connect_postgres() -> None:
    """Verify that PostgreSQL is reachable."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def initialize_postgres() -> None:
    """Create configured relational tables and verify PostgreSQL connectivity."""
    import app.models  # noqa: F401  # Registers model metadata before table creation.

    ensure_database_exists()
    Base.metadata.create_all(bind=engine)
    connect_postgres()


def is_postgres_available() -> bool:
    """Return whether PostgreSQL accepts a lightweight health query."""
    try:
        connect_postgres()
    except Exception:
        return False
    return True


def close_postgres() -> None:
    """Dispose pooled PostgreSQL connections."""
    engine.dispose()
