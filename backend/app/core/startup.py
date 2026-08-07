"""Startup readiness helpers for external services."""

import logging
import time
from collections.abc import Callable

from app.database.neo4j import connect_neo4j
from app.database.postgres import initialize_postgres

logger = logging.getLogger("codegraph")

MAX_CONNECTION_ATTEMPTS = 10
MAX_RETRY_DELAY_SECONDS = 5


def _retry_delay_seconds(attempt: int) -> int:
    """Return the capped exponential retry delay after an attempt."""
    return min(2 ** (attempt - 1), MAX_RETRY_DELAY_SECONDS)


def _wait_for_connection(service_name: str, connect: Callable[[], None]) -> None:
    """Run a connection action until it succeeds or all attempts are exhausted."""
    logger.info("Waiting for %s...", service_name)

    for attempt in range(1, MAX_CONNECTION_ATTEMPTS + 1):
        logger.info("Attempt %d/%d", attempt, MAX_CONNECTION_ATTEMPTS)
        try:
            connect()
        except Exception:
            if attempt == MAX_CONNECTION_ATTEMPTS:
                logger.exception(
                    "%s did not become available after %d attempts.",
                    service_name,
                    MAX_CONNECTION_ATTEMPTS,
                )
                raise

            delay_seconds = _retry_delay_seconds(attempt)
            logger.warning(
                "%s connection attempt %d/%d failed.",
                service_name,
                attempt,
                MAX_CONNECTION_ATTEMPTS,
                exc_info=True,
            )
            logger.info("Retrying in %d seconds...", delay_seconds)
            time.sleep(delay_seconds)
        else:
            logger.info("Connected to %s", service_name)
            return


def wait_for_postgres() -> None:
    """Initialize PostgreSQL after it accepts connections."""
    _wait_for_connection("PostgreSQL", initialize_postgres)


def wait_for_neo4j() -> None:
    """Verify Neo4j after it accepts Bolt connections."""
    _wait_for_connection("Neo4j", connect_neo4j)
