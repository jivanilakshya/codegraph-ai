"""Neo4j driver lifecycle management."""

import os

from neo4j import Driver, GraphDatabase

_driver: Driver | None = None


def get_driver() -> Driver:
    """Return the singleton Neo4j driver, creating it on first use."""
    global _driver

    if _driver is None:
        uri = os.getenv("NEO4J_URI")
        username = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")

        if not all((uri, username, password)):
            raise RuntimeError(
                "NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD are required."
            )

        _driver = GraphDatabase.driver(uri, auth=(username, password))

    return _driver


def connect_neo4j() -> None:
    """Verify that the configured Neo4j instance is reachable."""
    get_driver().verify_connectivity()


def is_neo4j_available() -> bool:
    """Return whether Neo4j is reachable using the shared driver."""
    try:
        connect_neo4j()
    except Exception:
        return False
    return True


def close_driver() -> None:
    """Close and clear the shared Neo4j driver."""
    global _driver

    if _driver is not None:
        _driver.close()
        _driver = None
