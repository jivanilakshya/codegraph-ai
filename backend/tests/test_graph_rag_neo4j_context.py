"""Focused unit coverage for Graph-RAG's Neo4j structural context reads."""

from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.services.graph_rag_service import GraphRAGGenerationService


class GraphRAGNeo4jContextTests(unittest.TestCase):
    def test_valid_project_returns_existing_context_shape(self) -> None:
        driver = _FakeDriver(_graph_data())
        with patch("app.services.graph_rag_service.get_driver", return_value=driver):
            details = _service()._extract_graph_context(
                [_chunk("backend/auth.py", "authenticate_user")],
                request_project_id=7,
                include_calls=True,
                include_imports=True,
            )

        self.assertEqual(len(details), 1)
        self.assertEqual(details[0].model_dump(), {
            "file_path": "backend/auth.py",
            "entity_name": "authenticate_user",
            "entity_type": "function",
            "calls": ["verify_password"],
            "called_by": ["login_route"],
            "imports": ["app/core/security.py"],
            "imported_by": ["app/api/v1/auth.py"],
        })
        self.assertIn("  * Calls: ['verify_password']", _service()._format_graph_context_text(details))

    def test_empty_project_context_is_safe(self) -> None:
        with patch("app.services.graph_rag_service.get_driver", return_value=_FakeDriver({7: {}})):
            details = _service()._extract_graph_context(
                [_chunk("backend/missing.py", "missing")],
                request_project_id=7,
                include_calls=True,
                include_imports=True,
            )

        self.assertEqual(details, [])

    def test_request_project_scope_blocks_chunk_project_data(self) -> None:
        data = _graph_data()
        data[8] = {
            "backend/auth.py": {
                "imports": ["secret.py"],
                "imported_by": [],
                "calls": ["private_call"],
                "called_by": [],
            }
        }
        driver = _FakeDriver(data)
        foreign_chunk = _chunk("backend/auth.py", "authenticate_user", project_id=8)
        with patch("app.services.graph_rag_service.get_driver", return_value=driver):
            details = _service()._extract_graph_context(
                [foreign_chunk], request_project_id=7, include_calls=True, include_imports=True
            )

        self.assertEqual(details[0].calls, ["verify_password"])
        self.assertNotIn("private_call", details[0].calls)
        for query, parameters in driver.transaction.calls:
            self.assertEqual(parameters["project_id"], 7)
            self.assertIn("project_id: $project_id", query)

    def test_neo4j_failure_is_reported(self) -> None:
        with patch("app.services.graph_rag_service.get_driver", return_value=_BrokenDriver()):
            with self.assertRaisesRegex(RuntimeError, "Neo4j graph context retrieval failed"):
                _service()._extract_graph_context(
                    [_chunk("backend/auth.py", "authenticate_user")],
                    request_project_id=7,
                    include_calls=True,
                    include_imports=True,
                )


class _Result:
    def __init__(self, record):
        self.record = record

    def single(self):
        return self.record


class _FakeTransaction:
    def __init__(self, projects):
        self.projects = projects
        self.calls: list[tuple[str, dict[str, object]]] = []

    def run(self, query, **parameters):
        self.calls.append((query, parameters))
        file_data = self.projects.get(parameters["project_id"], {}).get(parameters["file_path"])
        if query == GraphRAGGenerationService._FILE_QUERY:
            return _Result({"file_path": parameters["file_path"]} if file_data else None)
        if query == GraphRAGGenerationService._IMPORTS_QUERY:
            return _Result({
                "imports": file_data["imports"],
                "imported_by": file_data["imported_by"],
            })
        if query == GraphRAGGenerationService._CALLS_QUERY:
            return _Result({"calls": file_data["calls"], "called_by": file_data["called_by"]})
        raise AssertionError("Unexpected Cypher query")


class _FakeSession:
    def __init__(self, transaction):
        self.transaction = transaction

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute_read(self, work, *arguments):
        return work(self.transaction, *arguments)


class _FakeDriver:
    def __init__(self, projects):
        self.transaction = _FakeTransaction(projects)

    def session(self):
        return _FakeSession(self.transaction)


class _BrokenDriver:
    def session(self):
        raise RuntimeError("Neo4j is unavailable")


def _service():
    return GraphRAGGenerationService(
        rag_retrieval_service=object(),
        llm_service=object(),
        project_scope_service=object(),
    )


def _chunk(file_path, name, project_id=7):
    return SimpleNamespace(
        file_path=file_path,
        name=name,
        entity_type="function",
        project_id=project_id,
    )


def _graph_data():
    return {
        7: {
            "backend/auth.py": {
                "imports": ["app/core/security.py"],
                "imported_by": ["app/api/v1/auth.py"],
                "calls": ["verify_password"],
                "called_by": ["login_route"],
            }
        }
    }
