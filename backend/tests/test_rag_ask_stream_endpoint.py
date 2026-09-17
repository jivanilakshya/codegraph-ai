"""Contract and unit tests for the streaming POST /api/v1/rag/ask-stream endpoint."""

import json
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.project_scope_service import ProjectNotFoundError


class RAGAskStreamEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_valid_question_streams_sse_events(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service

        def mock_events(query, project_id):
            yield {
                "type": "metadata",
                "query": query,
                "project_id": project_id,
                "model": "qwen2.5-coder:7b",
                "total_chunks": 1,
                "sources": [],
                "graph_context": [],
            }
            yield {"type": "token", "content": "Auth"}
            yield {"type": "token", "content": " is handled in auth.py."}
            yield {"type": "done"}

        service.stream_graph_events.side_effect = mock_events

        with patch("app.api.v1.endpoints.rag.ProjectScopeService.require_project"):
            response = self.client.post(
                "/api/v1/rag/ask-stream",
                json={"project_id": 7, "question": "Where is auth handled?"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])

        # Parse SSE lines
        lines = [line.strip() for line in response.text.split("\n") if line.startswith("data: ")]
        events = [json.loads(line[6:]) for line in lines]

        self.assertEqual(len(events), 4)
        self.assertEqual(events[0]["type"], "metadata")
        self.assertEqual(events[0]["project_id"], 7)
        self.assertEqual(events[1]["type"], "token")
        self.assertEqual(events[1]["content"], "Auth")
        self.assertEqual(events[2]["type"], "token")
        self.assertEqual(events[2]["content"], " is handled in auth.py.")
        self.assertEqual(events[3]["type"], "done")

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_stream_error_emits_error_event(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service

        def mock_events_with_error(query, project_id):
            yield {"type": "metadata", "query": query, "project_id": project_id}
            raise RuntimeError("Ollama connection dropped")

        service.stream_graph_events.side_effect = mock_events_with_error

        with patch("app.api.v1.endpoints.rag.ProjectScopeService.require_project"):
            response = self.client.post(
                "/api/v1/rag/ask-stream",
                json={"project_id": 7, "question": "Where is auth handled?"},
            )

        self.assertEqual(response.status_code, 200)
        lines = [line.strip() for line in response.text.split("\n") if line.startswith("data: ")]
        events = [json.loads(line[6:]) for line in lines]

        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["type"], "metadata")
        self.assertEqual(events[1]["type"], "error")
        self.assertEqual(events[1]["message"], "Could not answer the question.")

    @patch("app.api.v1.endpoints.rag.ProjectScopeService.require_project")
    def test_unknown_project_returns_404_before_stream(self, mock_require) -> None:
        mock_require.side_effect = ProjectNotFoundError("Project 999 was not found.")

        response = self.client.post(
            "/api/v1/rag/ask-stream",
            json={"project_id": 999, "question": "Where is auth?"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Project 999 was not found.")

    def test_missing_or_empty_question_returns_422(self) -> None:
        missing = self.client.post("/api/v1/rag/ask-stream", json={"project_id": 7})
        empty = self.client.post("/api/v1/rag/ask-stream", json={"project_id": 7, "question": "  "})

        self.assertEqual(missing.status_code, 422)
        self.assertEqual(empty.status_code, 422)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_existing_ask_endpoint_still_works(self, service_cls) -> None:
        service = MagicMock()
        service_cls.return_value = service
        from app.schemas.rag import GraphRAGGenerationResponse
        service.generate_graph_answer.return_value = GraphRAGGenerationResponse(
            query="Where is auth?",
            project_id=7,
            answer="In auth.py",
            model="qwen2.5-coder:7b",
            total_chunks=0,
            sources=[],
            graph_context=[],
            context="",
        )

        response = self.client.post(
            "/api/v1/rag/ask",
            json={"project_id": 7, "question": "Where is auth?"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "In auth.py")


if __name__ == "__main__":
    unittest.main()
