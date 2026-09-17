"""Unit coverage for semantic Neo4j entity-relationship projection."""

import unittest

from app.services.neo4j_graph_persistence import (
    Neo4jGraphPersistenceService,
    _GraphProjection,
)


class _Result:
    def consume(self):
        return None


class _RecordingTransaction:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def run(self, query: str, **parameters: object) -> _Result:
        self.calls.append((query, parameters))
        return _Result()


class Neo4jGraphPersistenceTests(unittest.TestCase):
    def test_entity_relationship_types_are_preserved_in_neo4j(self) -> None:
        projection = _GraphProjection(
            project_id=7,
            project_name="semantic-relationships",
            modules=[],
            api_routes=[],
            files=[],
            relationships=[],
            entities=[],
            entity_relationships=[
                {"source_entity_id": 1, "target_entity_id": 2, "relationship_type": "CALLS"},
                {"source_entity_id": 3, "target_entity_id": 4, "relationship_type": "EXTENDS"},
                {"source_entity_id": 3, "target_entity_id": 5, "relationship_type": "HAS_METHOD"},
            ],
        )
        transaction = _RecordingTransaction()

        Neo4jGraphPersistenceService._replace_project_graph(transaction, projection)

        semantic_calls = [
            (query, parameters)
            for query, parameters in transaction.calls
            if "CREATE (source)-[:" in query
        ]
        self.assertEqual(len(semantic_calls), 3)
        self.assertEqual(
            {
                next(
                    relationship["relationship_type"]
                    for relationship in parameters["relationships"]
                )
                for _, parameters in semantic_calls
            },
            {"CALLS", "EXTENDS", "HAS_METHOD"},
        )
        for query, parameters in semantic_calls:
            relationship_type = parameters["relationships"][0]["relationship_type"]
            self.assertIn(f"[:{relationship_type}]", query)
            self.assertEqual(parameters["project_id"], 7)

    def test_modules_are_deterministic_and_hierarchy_uses_contains(self) -> None:
        files = [
            type("FileRecord", (), {"path": "backend/app/services/graph.py"})(),
            type("FileRecord", (), {"path": "backend/app/main.py"})(),
            type("FileRecord", (), {"path": "README.md"})(),
        ]
        modules = Neo4jGraphPersistenceService._modules_for_files(files)

        self.assertEqual(
            [module["path"] for module in modules],
            ["backend", "backend/app", "backend/app/services"],
        )
        projection = _GraphProjection(
            project_id=7,
            project_name="hierarchy",
            modules=modules,
            api_routes=[],
            files=[{"id": 1, "path": "backend/app/main.py", "language": "Python", "size": 1}],
            relationships=[],
            entities=[],
            entity_relationships=[],
        )
        transaction = _RecordingTransaction()
        Neo4jGraphPersistenceService._replace_project_graph(transaction, projection)

        hierarchy_queries = [query for query, _ in transaction.calls if "[:CONTAINS]" in query]
        self.assertEqual(len(hierarchy_queries), 4)
        self.assertTrue(all("CALLS" not in query for query in hierarchy_queries))
