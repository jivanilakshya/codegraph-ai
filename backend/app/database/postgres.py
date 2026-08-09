"""PostgreSQL engine and session configuration."""

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.core.config import get_database_url

logger = logging.getLogger(__name__)

DATABASE_URL = get_database_url()
database_url = make_url(DATABASE_URL)

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
    # ``create_all`` checks and creates tables in separate statements. Serialize
    # that sequence so reload workers cannot concurrently create the same
    # PostgreSQL sequence or index during a first boot.
    with engine.begin() as connection:
        connection.execute(text("SELECT pg_advisory_xact_lock(92642173)"))
        Base.metadata.create_all(bind=connection)
        _create_inventory_indexes(connection)
    connect_postgres()


def _create_inventory_indexes(connection) -> None:
    """Add idempotent integrity indexes for databases created before constraints.

    ``create_all`` does not alter tables that already exist. These indexes make
    scanner retries safe on both fresh Compose volumes and existing local data.
    """
    connection.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_files_project_path "
            "ON files (project_id, path)"
        )
    )
    connection.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_project_metadata_project_key "
            "ON project_metadata (project_id, key)"
        )
    )


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
