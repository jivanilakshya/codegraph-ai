"""Unit and API tests for Step 6.2.1: End-to-End RAG + LLM Generation Pipeline."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.llm import LLMGenerateResponse
from app.schemas.rag import (
    RAGChunkResult,
    RAGGenerationRequest,
    RAGGenerationResponse,
    RAGRetrievalResponse,
)
from app.services.llm_service import LLMService
from app.services.project_scope_service import ProjectScopeService
from app.services.project_scope_service import ProjectNotFoundError
from app.services.rag_generation_service import (
    DEFAULT_SYSTEM_PROMPT,
    NO_RESULT_PROMPT_INSTRUCTION,
    RAGGenerationService,
)
from app.services.rag_retrieval_service import RAGRetrievalService


class TestRAGGenerationSchemas(unittest.TestCase):
    """Test suite for RAG generation Pydantic schemas."""

    def test_valid_request(self):
        """Test valid RAGGenerationRequest with query."""
        req = RAGGenerationRequest(query="Where is user authentication handled?", project_id=93)
        self.assertEqual(req.query, "Where is user authentication handled?")
        self.assertEqual(req.project_id, 93)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)
        self.assertIsNone(req.model)
        self.assertIsNone(req.system_prompt)

    def test_custom_request_parameters(self):
        """Test RAGGenerationRequest with custom project_id, top_k, similarity_threshold, model, and system_prompt."""
        req = RAGGenerationRequest(
            query="Find database connection pool setup",
            project_id=93,
            top_k=10,
            similarity_threshold=0.75,
            model="custom-coder:7b",
            system_prompt="Analyze code for security risks.",
        )
        self.assertEqual(req.query, "Find database connection pool setup")
        self.assertEqual(req.project_id, 93)
        self.assertEqual(req.top_k, 10)
        self.assertEqual(req.similarity_threshold, 0.75)
        self.assertEqual(req.model, "custom-coder:7b")
        self.assertEqual(req.system_prompt, "Analyze code for security risks.")

    def test_empty_query_rejection(self):
        """Test empty query string rejection."""
        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="")

    def test_whitespace_query_rejection(self):
        """Test whitespace-only query string rejection."""
        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="   \t\n  ")

    def test_top_k_boundaries(self):
        """Test top_k validation limits (1 to 20)."""
        req_min = RAGGenerationRequest(query="query", project_id=93, top_k=1)
        self.assertEqual(req_min.top_k, 1)

        req_max = RAGGenerationRequest(query="query", project_id=93, top_k=20)
        self.assertEqual(req_max.top_k, 20)

        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="query", project_id=93, top_k=0)

        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="query", project_id=93, top_k=21)

    def test_similarity_threshold_boundaries(self):
        """Test similarity_threshold validation limits (0.0 to 1.0)."""
        req_min = RAGGenerationRequest(query="query", project_id=93, similarity_threshold=0.0)
        self.assertEqual(req_min.similarity_threshold, 0.0)

        req_max = RAGGenerationRequest(query="query", project_id=93, similarity_threshold=1.0)
        self.assertEqual(req_max.similarity_threshold, 1.0)

        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="query", project_id=93, similarity_threshold=-0.1)

        with self.assertRaises(ValidationError):
            RAGGenerationRequest(query="query", project_id=93, similarity_threshold=1.1)


class TestRAGGenerationService(unittest.TestCase):
    """Test suite for RAGGenerationService business logic."""

    def setUp(self):
        self.mock_retrieval_service = MagicMock(spec=RAGRetrievalService)
        self.mock_llm_service = MagicMock(spec=LLMService)
        self.mock_project_scope_service = MagicMock(spec=ProjectScopeService)
        self.service = RAGGenerationService(
            rag_retrieval_service=self.mock_retrieval_service,
            llm_service=self.mock_llm_service,
            project_scope_service=self.mock_project_scope_service,
        )

        self.sample_retrieval_response = RAGRetrievalResponse(
            query="Where is user authentication handled?",
            project_id=93,
            total_results=1,
            results=[
                RAGChunkResult(
                    score=0.89,
                    file_path="backend/auth.py",
                    start_line=20,
                    end_line=45,
                    language="Python",
                    entity_type="function",
                    name="authenticate_user",
                    project_id=93,
                    content="def authenticate_user(token): pass",
                )
            ],
            context="QUESTION:\nWhere is user authentication handled?\n\nRELEVANT CODE:\n\n[1]\nFile: backend/auth.py\nLines: 20-45\nLanguage: Python\nEntity: function\nScore: 0.89\n\ndef authenticate_user(token): pass",
        )

        self.sample_llm_response = LLMGenerateResponse(
            response="User authentication is handled in backend/auth.py by the authenticate_user function.",
            model="qwen2.5-coder:7b",
        )

    def test_successful_rag_generation_flow(self):
        """Test that retrieval and LLM services are called and response is assembled correctly."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.generate_answer(
            query="Where is user authentication handled?",
            project_id=93,
            top_k=5,
            similarity_threshold=0.5,
        )

        self.mock_retrieval_service.retrieve.assert_called_once_with(
            query="Where is user authentication handled?",
            top_k=5,
            project_id=93,
            similarity_threshold=0.5,
        )

        self.mock_llm_service.generate.assert_called_once()
        called_prompt = self.mock_llm_service.generate.call_args[1]["prompt"]

        self.assertIn(DEFAULT_SYSTEM_PROMPT, called_prompt)
        self.assertIn("Where is user authentication handled?", called_prompt)
        self.assertIn("backend/auth.py", called_prompt)

        self.assertEqual(res.query, "Where is user authentication handled?")
        self.assertEqual(res.project_id, 93)
        self.assertEqual(res.answer, "User authentication is handled in backend/auth.py by the authenticate_user function.")
        self.assertEqual(res.model, "qwen2.5-coder:7b")
        self.assertEqual(res.total_chunks, 1)
        self.assertEqual(len(res.sources), 1)
        self.assertEqual(res.sources[0].file_path, "backend/auth.py")

    def test_explicit_model_override(self):
        """Test passing explicit model override down to LLMService."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = LLMGenerateResponse(
            response="Answer from override model.",
            model="custom-coder:7b",
        )

        res = self.service.generate_answer(
            query="Where is user authentication handled?",
            project_id=93,
            model="custom-coder:7b",
        )

        self.assertEqual(
            self.mock_llm_service.generate.call_args[1]["model"],
            "custom-coder:7b",
        )
        self.assertEqual(res.model, "custom-coder:7b")


    def test_custom_system_prompt(self):
        """Test custom system prompt replaces default system prompt."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        self.service.generate_answer(
            query="Where is user authentication handled?",
            project_id=93,
            system_prompt="You are a strict security auditor.",
        )

        called_prompt = self.mock_llm_service.generate.call_args[1]["prompt"]
        self.assertIn("You are a strict security auditor.", called_prompt)
        self.assertNotIn(DEFAULT_SYSTEM_PROMPT, called_prompt)

    def test_empty_retrieval_result_fallback(self):
        """Test that zero retrieved chunks triggers the no-result fallback instruction."""
        empty_retrieval = RAGRetrievalResponse(
            query="Nonexistent feature",
            project_id=None,
            total_results=0,
            results=[],
            context="QUESTION:\nNonexistent feature\n\nRELEVANT CODE:\nNo relevant code chunks found.",
        )
        self.mock_retrieval_service.retrieve.return_value = empty_retrieval
        self.mock_llm_service.generate.return_value = LLMGenerateResponse(
            response="No relevant code was retrieved for this feature.",
            model="qwen2.5-coder:7b",
        )

        res = self.service.generate_answer(query="Nonexistent feature", project_id=93)

        called_prompt = self.mock_llm_service.generate.call_args[1]["prompt"]
        self.assertIn(NO_RESULT_PROMPT_INSTRUCTION, called_prompt)
        self.assertEqual(res.total_chunks, 0)
        self.assertEqual(res.sources, [])
        self.assertIn("No relevant code chunks found.", res.context)

    def test_empty_query_raises_value_error(self):
        """Test empty query string raises ValueError."""
        with self.assertRaises(ValueError):
            self.service.generate_answer(query="")

    def test_missing_project_stops_before_retrieval(self):
        """A nonexistent project is rejected before vector search or LLM generation."""
        self.mock_project_scope_service.require_project.side_effect = ProjectNotFoundError(
            "Project 999999 was not found."
        )

        with self.assertRaises(ProjectNotFoundError):
            self.service.generate_answer(query="Explain authentication", project_id=999999)

        self.mock_retrieval_service.retrieve.assert_not_called()
        self.mock_llm_service.generate.assert_not_called()

    def test_whitespace_query_raises_value_error(self):
        """Test whitespace query string raises ValueError."""
        with self.assertRaises(ValueError):
            self.service.generate_answer(query="   \n\t ")

    def test_retrieval_runtime_error_propagates(self):
        """Test that RuntimeError in RAGRetrievalService propagates upwards."""
        self.mock_retrieval_service.retrieve.side_effect = RuntimeError("Qdrant store unreachable")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate_answer(query="Test query", project_id=93)

        self.assertIn("Qdrant store unreachable", str(ctx.exception))

    def test_llm_runtime_error_propagates(self):
        """Test that RuntimeError in LLMService propagates upwards."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.side_effect = RuntimeError("Ollama connection refused")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate_answer(query="Test query", project_id=93)

        self.assertIn("Ollama connection refused", str(ctx.exception))


class TestRAGGenerationAPI(unittest.TestCase):
    """Integration test suite for POST /api/v1/rag/generate endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.RAGGenerationService")
    def test_generate_endpoint_success(self, mock_service_cls):
        """Test successful POST /api/v1/rag/generate request."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.generate_answer.return_value = RAGGenerationResponse(
            query="Where is user authentication handled?",
            project_id=93,
            answer="User authentication is in backend/auth.py.",
            model="qwen2.5-coder:7b",
            total_chunks=1,
            sources=[
                RAGChunkResult(
                    score=0.89,
                    file_path="backend/auth.py",
                    start_line=20,
                    end_line=45,
                    language="Python",
                    entity_type="function",
                    name="authenticate_user",
                    project_id=93,
                    content="def authenticate_user(): pass",
                )
            ],
            context="QUESTION:\nWhere is user authentication handled?\n\nRELEVANT CODE:\n...",
        )

        response = self.client.post(
            "/api/v1/rag/generate",
            json={
                "query": "Where is user authentication handled?",
                "project_id": 93,
                "top_k": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "Where is user authentication handled?")
        self.assertEqual(data["project_id"], 93)
        self.assertEqual(data["answer"], "User authentication is in backend/auth.py.")
        self.assertEqual(data["model"], "qwen2.5-coder:7b")
        self.assertEqual(data["total_chunks"], 1)
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(data["sources"][0]["file_path"], "backend/auth.py")

    def test_generate_endpoint_validation_error(self):
        """Test request payload validation errors (422)."""
        # Missing query
        r1 = self.client.post("/api/v1/rag/generate", json={"top_k": 5})
        self.assertEqual(r1.status_code, 422)

        # Empty query
        r2 = self.client.post("/api/v1/rag/generate", json={"query": ""})
        self.assertEqual(r2.status_code, 422)

        # Whitespace query
        r3 = self.client.post("/api/v1/rag/generate", json={"query": "   \n "})
        self.assertEqual(r3.status_code, 422)

        # top_k out of bounds (0 or 25)
        r4 = self.client.post("/api/v1/rag/generate", json={"query": "test", "top_k": 0})
        self.assertEqual(r4.status_code, 422)

        # project_id is mandatory for generated answers
        r5 = self.client.post("/api/v1/rag/generate", json={"query": "test"})
        self.assertEqual(r5.status_code, 422)

    @patch("app.api.v1.endpoints.rag.RAGGenerationService")
    def test_generate_endpoint_missing_project_returns_404(self, mock_service_cls):
        """A service-level project lookup failure is rendered as a client-safe 404."""
        mock_service_cls.return_value.generate_answer.side_effect = ProjectNotFoundError(
            "Project 999999 was not found."
        )

        response = self.client.post(
            "/api/v1/rag/generate",
            json={"query": "Explain authentication", "project_id": 999999},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Project 999999 was not found.")

    @patch("app.api.v1.endpoints.rag.RAGGenerationService")
    def test_generate_endpoint_service_error_500(self, mock_service_cls):
        """Test that internal service errors return 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.generate_answer.side_effect = RuntimeError("Ollama service unreachable")

        response = self.client.post(
            "/api/v1/rag/generate",
            json={"query": "Explain authentication", "project_id": 93},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Ollama service unreachable", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
