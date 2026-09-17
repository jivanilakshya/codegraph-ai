"""Unit and API tests for Step 6.2.3: Code Entity Explanation & Targeted RAG Pipeline."""

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
    GraphContextDetail,
    RAGChunkResult,
    RAGExplanationRequest,
    RAGExplanationResponse,
    RAGRetrievalResponse,
)
from app.services.code_explanation_service import CodeExplanationRAGService
from app.services.graph_rag_service import GraphRAGGenerationService
from app.services.llm_service import LLMService
from app.services.rag_retrieval_service import RAGRetrievalService


class TestExplanationSchemas(unittest.TestCase):
    """Test suite for RAG Explanation Pydantic schemas."""

    def test_valid_request_with_entity_name(self):
        """Test valid request with entity_name."""
        req = RAGExplanationRequest(entity_name="authenticate_user")
        self.assertEqual(req.entity_name, "authenticate_user")
        self.assertIsNone(req.file_path)
        self.assertIsNone(req.query)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)

    def test_valid_request_with_file_path(self):
        """Test valid request with file_path."""
        req = RAGExplanationRequest(file_path="backend/auth.py")
        self.assertEqual(req.file_path, "backend/auth.py")
        self.assertIsNone(req.entity_name)

    def test_valid_request_with_query(self):
        """Test valid request with query string."""
        req = RAGExplanationRequest(query="Explain how authentication works")
        self.assertEqual(req.query, "Explain how authentication works")

    def test_missing_all_target_identifiers_fails_validation(self):
        """Test that omitting entity_name, file_path, and query raises ValidationError."""
        with self.assertRaises(ValidationError):
            RAGExplanationRequest()

    def test_empty_target_identifiers_fails_validation(self):
        """Test that whitespace-only target identifiers raise ValidationError."""
        with self.assertRaises(ValidationError):
            RAGExplanationRequest(entity_name="   ", file_path=" \t ", query="\n ")

    def test_top_k_and_similarity_threshold_validation(self):
        """Test top_k and similarity_threshold boundary limits."""
        req_valid = RAGExplanationRequest(entity_name="auth", top_k=20, similarity_threshold=1.0)
        self.assertEqual(req_valid.top_k, 20)

        with self.assertRaises(ValidationError):
            RAGExplanationRequest(entity_name="auth", top_k=0)

        with self.assertRaises(ValidationError):
            RAGExplanationRequest(entity_name="auth", top_k=21)

        with self.assertRaises(ValidationError):
            RAGExplanationRequest(entity_name="auth", similarity_threshold=-0.1)


class TestCodeExplanationService(unittest.TestCase):
    """Test suite for CodeExplanationRAGService business logic."""

    def setUp(self):
        self.mock_retrieval_service = MagicMock(spec=RAGRetrievalService)
        self.mock_graph_rag_service = MagicMock(spec=GraphRAGGenerationService)
        self.mock_llm_service = MagicMock(spec=LLMService)

        self.service = CodeExplanationRAGService(
            rag_retrieval_service=self.mock_retrieval_service,
            graph_rag_service=self.mock_graph_rag_service,
            llm_service=self.mock_llm_service,
        )

        self.sample_chunk = RAGChunkResult(
            score=0.92,
            file_path="backend/auth.py",
            start_line=15,
            end_line=40,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        self.sample_retrieval_response = RAGRetrievalResponse(
            query="Implementation and usage of entity authenticate_user",
            project_id=93,
            total_results=1,
            results=[self.sample_chunk],
            context="QUESTION:\n...\nRELEVANT CODE:\ndef authenticate_user(): pass",
        )

        self.sample_graph_detail = GraphContextDetail(
            file_path="backend/auth.py",
            entity_name="authenticate_user",
            entity_type="function",
            calls=["verify_password"],
            called_by=["login"],
            imports=["app/core/security.py"],
            imported_by=["backend/api/v1/auth.py"],
        )

        self.sample_llm_response = LLMGenerateResponse(
            response="authenticate_user is a function defined in backend/auth.py that verifies user credentials.",
            model="qwen2.5-coder:7b",
        )

    def test_explain_entity_name_only(self):
        """Test targeted explanation flow with entity_name."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_graph_rag_service._extract_graph_context.return_value = [self.sample_graph_detail]
        self.mock_graph_rag_service._format_graph_context_text.return_value = "- Entity 'authenticate_user' in 'backend/auth.py'"
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.explain_entity(
            entity_name="authenticate_user",
            project_id=93,
            top_k=5,
        )

        self.mock_retrieval_service.retrieve.assert_called_once_with(
            query="Implementation and usage of entity authenticate_user",
            top_k=5,
            project_id=93,
            similarity_threshold=None,
        )

        self.mock_llm_service.generate.assert_called_once()
        called_prompt = self.mock_llm_service.generate.call_args[1]["prompt"]
        self.assertIn("TARGET SYMBOL: 'authenticate_user'", called_prompt)

        self.assertEqual(res.entity_name, "authenticate_user")
        self.assertEqual(res.project_id, 93)
        self.assertEqual(res.explanation, self.sample_llm_response.response)
        self.assertEqual(res.model, "qwen2.5-coder:7b")
        self.assertEqual(len(res.graph_context), 1)

    def test_explain_file_path_only(self):
        """Test explanation flow with file_path only."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_graph_rag_service._extract_graph_context.return_value = [self.sample_graph_detail]
        self.mock_graph_rag_service._format_graph_context_text.return_value = "- File 'backend/auth.py'"
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.explain_entity(file_path="backend/auth.py")

        self.assertEqual(res.file_path, "backend/auth.py")
        self.assertIn("Overview and functionality of file backend/auth.py", res.query)

    def test_explain_query_override(self):
        """Test explanation flow with custom query override."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_graph_rag_service._extract_graph_context.return_value = []
        self.mock_graph_rag_service._format_graph_context_text.return_value = "No graph relationships"
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.explain_entity(
            entity_name="authenticate_user",
            query="How does security error handling work?",
        )

        self.assertEqual(res.query, "How does security error handling work?")

    def test_include_graph_context_flag(self):
        """Test include_graph_context=False skips graph extraction."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_graph_rag_service._format_graph_context_text.return_value = "No graph context"
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.explain_entity(
            entity_name="authenticate_user",
            include_graph_context=False,
        )

        self.mock_graph_rag_service._extract_graph_context.assert_not_called()
        self.assertEqual(res.graph_context, [])

    def test_retrieval_failure_propagates_error(self):
        """Test RuntimeError from RAGRetrievalService propagates upwards."""
        self.mock_retrieval_service.retrieve.side_effect = RuntimeError("Qdrant unreachable")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.explain_entity(entity_name="authenticate_user")

        self.assertIn("Qdrant unreachable", str(ctx.exception))

    def test_llm_failure_propagates_error(self):
        """Test RuntimeError from LLMService propagates upwards."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_graph_rag_service._extract_graph_context.return_value = []
        self.mock_llm_service.generate.side_effect = RuntimeError("Ollama service error")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.explain_entity(entity_name="authenticate_user")

        self.assertIn("Ollama service error", str(ctx.exception))


class TestCodeExplanationAPI(unittest.TestCase):
    """Integration test suite for POST /api/v1/rag/explain endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.CodeExplanationRAGService")
    def test_explain_endpoint_success_200(self, mock_service_cls):
        """Test successful POST /api/v1/rag/explain request (HTTP 200)."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service

        mock_detail = GraphContextDetail(
            file_path="backend/auth.py",
            entity_name="authenticate_user",
            entity_type="function",
            calls=["verify_password"],
            called_by=["login"],
            imports=["app/core/security.py"],
            imported_by=["backend/api/v1/auth.py"],
        )

        mock_chunk = RAGChunkResult(
            score=0.92,
            file_path="backend/auth.py",
            start_line=15,
            end_line=40,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        mock_service.explain_entity.return_value = RAGExplanationResponse(
            entity_name="authenticate_user",
            file_path="backend/auth.py",
            query="Implementation and usage of entity authenticate_user in file backend/auth.py",
            project_id=93,
            explanation="authenticate_user verifies user security credentials.",
            model="qwen2.5-coder:7b",
            total_chunks=1,
            sources=[mock_chunk],
            graph_context=[mock_detail],
            context="FULL PROMPT CONTEXT",
        )

        response = self.client.post(
            "/api/v1/rag/explain",
            json={
                "entity_name": "authenticate_user",
                "file_path": "backend/auth.py",
                "project_id": 93,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["entity_name"], "authenticate_user")
        self.assertEqual(data["file_path"], "backend/auth.py")
        self.assertEqual(data["project_id"], 93)
        self.assertEqual(data["explanation"], "authenticate_user verifies user security credentials.")
        self.assertEqual(data["model"], "qwen2.5-coder:7b")
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(len(data["graph_context"]), 1)

    def test_explain_endpoint_validation_error_422(self):
        """Test request payload validation errors (HTTP 422)."""
        # Missing all target identifiers
        r1 = self.client.post("/api/v1/rag/explain", json={})
        self.assertEqual(r1.status_code, 422)

        # Empty target identifiers
        r2 = self.client.post("/api/v1/rag/explain", json={"entity_name": "   ", "query": ""})
        self.assertEqual(r2.status_code, 422)

        # Invalid top_k
        r3 = self.client.post("/api/v1/rag/explain", json={"entity_name": "auth", "top_k": 0})
        self.assertEqual(r3.status_code, 422)

    @patch("app.api.v1.endpoints.rag.CodeExplanationRAGService")
    def test_explain_endpoint_service_error_500(self, mock_service_cls):
        """Test that internal service errors return HTTP 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.explain_entity.side_effect = RuntimeError("Ollama service unreachable")

        response = self.client.post(
            "/api/v1/rag/explain",
            json={"entity_name": "authenticate_user"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Ollama service unreachable", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
