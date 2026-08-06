"""Neo4j inspection commands."""

from typing import Any


class Neo4jService:
    def __init__(self, uri: str, user: str, password: str) -> None:
        try:
            from neo4j import GraphDatabase
        except ImportError as error:
            raise RuntimeError("Neo4j driver is not installed. Install toolkit requirements.") from error
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def query(self, cypher: str) -> list[dict[str, Any]]:
        with self.driver.session() as session:
            return [dict(record) for record in session.run(cypher)]

    def node_count(self) -> int:
        return self.query("MATCH (n) RETURN count(n) AS count")[0]["count"]

    def relationship_count(self) -> int:
        return self.query("MATCH ()-[r]->() RETURN count(r) AS count")[0]["count"]

    def summary(self) -> list[dict[str, Any]]:
        return self.query("MATCH (n) RETURN labels(n) AS labels, count(n) AS count ORDER BY count DESC")

    def clear(self) -> None:
        self.query("MATCH (n) DETACH DELETE n")

    def close(self) -> None:
        self.driver.close()
