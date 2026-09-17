"""Contract coverage for the canonical POST /api/v1/rag/ask endpoint."""

import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.rag import (
    GraphRAGGenerationResponse,
    RAGAskRequest,
)
from app.services.project_scope_service import ProjectNotFoundError


class RAGAskSchemaTests(unittest.TestCase):
    def test_question_and_project_are_required(self) -> None:
        request = RAGAskRequest(project_id=7, question="Where is authentication handled?")
        self.assertEqual(request.project_id, 7)
        self.assertEqual(request.question, "Where is authentication handled?")

        with self.assertRaises(ValidationError):
            RAGAskRequest(project_id=7, question="  \t\n")
        with self.assertRaises(ValidationError):
            RAGAskRequest(project_id=0, question="Question")


class RAGAskEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_valid_question_returns_graph_rag_response(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service
        service.generate_graph_answer.return_value = _response(project_id=7)

        response = self.client.post(
            "/api/v1/rag/ask",
            json={"project_id": 7, "question": "Where is authentication handled?"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "Authentication is handled in backend/auth.py.")
        self.assertEqual(response.json()["project_id"], 7)
        self.assertIn("graph_context", response.json())
        service.generate_graph_answer.assert_called_once_with(
            query="Where is authentication handled?", project_id=7
        )

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_request_project_id_controls_orchestration(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service
        service.generate_graph_answer.return_value = _response(project_id=19)

        response = self.client.post(
            "/api/v1/rag/ask",
            json={"project_id": 19, "question": "What calls login?"},
        )

        self.assertEqual(response.status_code, 200)
        service.generate_graph_answer.assert_called_once_with(query="What calls login?", project_id=19)

    def test_missing_or_empty_question_is_rejected_by_schema(self) -> None:
        missing = self.client.post("/api/v1/rag/ask", json={"project_id": 7})
        empty = self.client.post("/api/v1/rag/ask", json={"project_id": 7, "question": "  "})

        self.assertEqual(missing.status_code, 422)
        self.assertEqual(empty.status_code, 422)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_missing_project_returns_not_found(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service
        service.generate_graph_answer.side_effect = ProjectNotFoundError("Project 999 was not found.")

        response = self.client.post(
            "/api/v1/rag/ask", json={"project_id": 999, "question": "Question"}
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Project 999 was not found.")

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_pipeline_failures_are_sanitized(self, service_cls) -> None:
        for failure in ("Qdrant unavailable", "Neo4j unavailable", "Ollama unavailable"):
            with self.subTest(failure=failure):
                service = MagicMock()
                service_cls.return_value = service
                service.generate_graph_answer.side_effect = RuntimeError(failure)

                response = self.client.post(
                    "/api/v1/rag/ask", json={"project_id": 7, "question": "Question"}
                )

                self.assertEqual(response.status_code, 500)
                self.assertEqual(response.json()["detail"], "Could not answer the question.")
                self.assertNotIn(failure, response.json()["detail"])

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_empty_retrieval_and_graph_context_are_valid_response(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service
        service.generate_graph_answer.return_value = _response(project_id=7, answer="Insufficient context.")

        response = self.client.post(
            "/api/v1/rag/ask", json={"project_id": 7, "question": "Unknown question"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], [])
        self.assertEqual(response.json()["graph_context"], [])


def _response(project_id: int, answer: str = "Authentication is handled in backend/auth.py."):
    return GraphRAGGenerationResponse(
        query="Where is authentication handled?",
        project_id=project_id,
        answer=answer,
        model="qwen2.5-coder:7b",
        total_chunks=0,
        sources=[],
        graph_context=[],
        context="FULL PROMPT CONTEXT",
    )
