"""Unit and API tests for Step 6.2.2: Graph-Enriched RAG Generation Pipeline."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch
from sqlalchemy.exc import SQLAlchemyError

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.code_entity import CodeEntity
from app.models.file import File
from app.schemas.llm import LLMGenerateResponse
from app.schemas.rag import (
    GraphContextDetail,
    GraphRAGGenerationRequest,
    GraphRAGGenerationResponse,
    RAGChunkResult,
    RAGRetrievalResponse,
)
from app.services.graph_rag_service import (
    DEFAULT_GRAPH_SYSTEM_PROMPT,
    GraphRAGGenerationService,
)
from app.services.llm_service import LLMService
from app.services.project_scope_service import ProjectScopeService
from app.services.rag_retrieval_service import RAGRetrievalService


class TestGraphRAGSchemas(unittest.TestCase):
    """Test suite for Graph-Enriched RAG Pydantic schemas."""

    def test_valid_request_and_defaults(self):
        """Test GraphRAGGenerationRequest with default parameters."""
        req = GraphRAGGenerationRequest(query="Where is user authentication handled?", project_id=93)
        self.assertEqual(req.query, "Where is user authentication handled?")
        self.assertEqual(req.project_id, 93)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)
        self.assertIsNone(req.model)
        self.assertIsNone(req.system_prompt)
        self.assertTrue(req.include_calls)
        self.assertTrue(req.include_imports)

    def test_custom_values(self):
        """Test GraphRAGGenerationRequest with custom values."""
        req = GraphRAGGenerationRequest(
            query="Find database pool",
            project_id=93,
            top_k=10,
            similarity_threshold=0.75,
            model="custom-coder:7b",
            system_prompt="Custom prompt instructions",
            include_calls=False,
            include_imports=False,
        )
        self.assertEqual(req.query, "Find database pool")
        self.assertEqual(req.project_id, 93)
        self.assertEqual(req.top_k, 10)
        self.assertEqual(req.similarity_threshold, 0.75)
        self.assertEqual(req.model, "custom-coder:7b")
        self.assertEqual(req.system_prompt, "Custom prompt instructions")
        self.assertFalse(req.include_calls)
        self.assertFalse(req.include_imports)

    def test_empty_query_validation(self):
        """Test empty query string validation failure."""
        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="")

    def test_whitespace_only_query_validation(self):
        """Test whitespace-only query string validation failure."""
        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="   \t\n  ")

    def test_top_k_boundaries_1_and_20(self):
        """Test top_k validation boundaries (1 and 20)."""
        req_1 = GraphRAGGenerationRequest(query="test query", project_id=93, top_k=1)
        self.assertEqual(req_1.top_k, 1)

        req_20 = GraphRAGGenerationRequest(query="test query", project_id=93, top_k=20)
        self.assertEqual(req_20.top_k, 20)

    def test_invalid_top_k(self):
        """Test top_k outside range 1..20 raises ValidationError."""
        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="test query", project_id=93, top_k=0)

        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="test query", project_id=93, top_k=21)

    def test_similarity_threshold_boundaries_0_and_1(self):
        """Test similarity_threshold boundaries (0.0 and 1.0)."""
        req_0 = GraphRAGGenerationRequest(query="test query", project_id=93, similarity_threshold=0.0)
        self.assertEqual(req_0.similarity_threshold, 0.0)

        req_1 = GraphRAGGenerationRequest(query="test query", project_id=93, similarity_threshold=1.0)
        self.assertEqual(req_1.similarity_threshold, 1.0)

    def test_invalid_similarity_threshold(self):
        """Test similarity_threshold outside range 0.0..1.0 raises ValidationError."""
        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="test query", project_id=93, similarity_threshold=-0.1)

        with self.assertRaises(ValidationError):
            GraphRAGGenerationRequest(query="test query", project_id=93, similarity_threshold=1.1)


class TestGraphRAGService(unittest.TestCase):
    """Test suite for GraphRAGGenerationService business logic."""

    def setUp(self):
        self.mock_retrieval_service = MagicMock(spec=RAGRetrievalService)
        self.mock_llm_service = MagicMock(spec=LLMService)
        self.mock_llm_service.default_model = "qwen2.5-coder:7b"
        self.mock_project_scope_service = MagicMock(spec=ProjectScopeService)
        self.service = GraphRAGGenerationService(
            rag_retrieval_service=self.mock_retrieval_service,
            llm_service=self.mock_llm_service,
            project_scope_service=self.mock_project_scope_service,
        )

        self.sample_chunk = RAGChunkResult(
            score=0.88,
            file_path="backend/auth.py",
            start_line=10,
            end_line=30,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        self.sample_retrieval_response = RAGRetrievalResponse(
            query="Where is user authentication handled?",
            project_id=93,
            total_results=1,
            results=[self.sample_chunk],
            context="QUESTION:\nWhere is user authentication handled?\n\nRELEVANT CODE:\n[1]\nFile: backend/auth.py\ndef authenticate_user(): pass",
        )

        self.sample_llm_response = LLMGenerateResponse(
            response="User authentication is in backend/auth.py.",
            model="qwen2.5-coder:7b",
        )

    def test_retrieval_service_invocation(self):
        """Test that RAGRetrievalService.retrieve is invoked with correct arguments."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            res = self.service.generate_graph_answer(
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
        self.assertEqual(res.query, "Where is user authentication handled?")

    @patch("app.services.graph_rag_service.get_driver")
    def test_graph_context_extraction(self, mock_get_driver):
        """Test Neo4j CALLS, CALLED_BY, IMPORTS, and IMPORTED_BY extraction."""
        mock_transaction = MagicMock()
        mock_session = MagicMock()
        mock_get_driver.return_value.session.return_value.__enter__.return_value = mock_session
        mock_session.execute_read.side_effect = lambda work, *args: work(mock_transaction, *args)
        mock_transaction.run.side_effect = [
            _single({"file_path": "backend/auth.py"}),
            _single(
                {
                    "imports": ["app/core/security.py"],
                    "imported_by": ["app/api/v1/auth.py"],
                }
            ),
            _single({"calls": ["verify_password"], "called_by": ["login_route"]}),
        ]

        details = self.service._extract_graph_context(
            retrieved_chunks=[self.sample_chunk],
            request_project_id=93,
            include_calls=True,
            include_imports=True,
        )

        self.assertEqual(len(details), 1)
        detail = details[0]
        self.assertEqual(detail.file_path, "backend/auth.py")
        self.assertEqual(detail.entity_name, "authenticate_user")
        self.assertEqual(detail.calls, ["verify_password"])
        self.assertEqual(detail.called_by, ["login_route"])
        self.assertEqual(detail.imports, ["app/core/security.py"])
        self.assertEqual(detail.imported_by, ["app/api/v1/auth.py"])
        for call in mock_transaction.run.call_args_list:
            self.assertEqual(call.kwargs["project_id"], 93)

    def test_include_calls_false(self):
        """Test include_calls=False disables call relationships retrieval."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        with patch.object(self.service, "_extract_graph_context") as mock_extract:
            mock_extract.return_value = []
            self.service.generate_graph_answer(
                query="test query",
                project_id=93,
                include_calls=False,
                include_imports=True,
            )

        mock_extract.assert_called_once_with(
            retrieved_chunks=[self.sample_chunk],
            request_project_id=93,
            include_calls=False,
            include_imports=True,
        )

    def test_include_imports_false(self):
        """Test include_imports=False disables import relationships retrieval."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        with patch.object(self.service, "_extract_graph_context") as mock_extract:
            mock_extract.return_value = []
            self.service.generate_graph_answer(
                query="test query",
                project_id=93,
                include_calls=True,
                include_imports=False,
            )

        mock_extract.assert_called_once_with(
            retrieved_chunks=[self.sample_chunk],
            request_project_id=93,
            include_calls=True,
            include_imports=False,
        )

    def test_no_graph_relationships_fallback(self):
        """Test graceful fallback when no graph relationships are found."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            res = self.service.generate_graph_answer(query="test query", project_id=93)

        self.assertEqual(res.graph_context, [])
        called_prompt = self.mock_llm_service.generate.call_args[1]["prompt"]
        self.assertIn("No structural graph relationships were available", called_prompt)

    def test_llm_invocation_and_default_model(self):
        """Test LLMService generation call with default configured model."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            res = self.service.generate_graph_answer(query="Where is user authentication handled?", project_id=93)

        self.mock_llm_service.generate.assert_called_once()
        self.assertEqual(res.model, "qwen2.5-coder:7b")
        self.assertEqual(res.answer, "User authentication is in backend/auth.py.")

    def test_model_override(self):
        """Test passing explicit model override down to LLMService."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = LLMGenerateResponse(
            response="Override answer", model="custom-coder:7b"
        )

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            res = self.service.generate_graph_answer(
                query="test query", project_id=93, model="custom-coder:7b"
            )

        self.assertEqual(
            self.mock_llm_service.generate.call_args[1]["model"], "custom-coder:7b"
        )
        self.assertEqual(res.model, "custom-coder:7b")

    def test_retrieval_runtime_error(self):
        """Test RuntimeError from RAGRetrievalService propagates upwards."""
        self.mock_retrieval_service.retrieve.side_effect = RuntimeError("Qdrant store unreachable")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate_graph_answer(query="test query", project_id=93)

        self.assertIn("Qdrant store unreachable", str(ctx.exception))

    def test_neo4j_runtime_error(self):
        """Test Neo4j exception during graph context lookup raises RuntimeError."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response

        with patch("app.services.graph_rag_service.get_driver") as mock_get_driver:
            mock_get_driver.return_value.session.side_effect = RuntimeError("Neo4j query timeout")

            with self.assertRaises(RuntimeError) as ctx:
                self.service.generate_graph_answer(query="test query", project_id=93)

            self.assertIn("Neo4j graph context retrieval failed", str(ctx.exception))

    def test_llm_runtime_error(self):
        """Test RuntimeError from LLMService propagates upwards."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.side_effect = RuntimeError("Ollama service connection refused")

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            with self.assertRaises(RuntimeError) as ctx:
                self.service.generate_graph_answer(query="test query", project_id=93)

            self.assertIn("Ollama service connection refused", str(ctx.exception))

    def test_generate_graph_answer_stream(self):
        """Test that generate_graph_answer_stream yields chunks from LLMService.generate_stream."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate_stream.return_value = iter(["Token1", " Token2", "!"])

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            tokens = list(self.service.generate_graph_answer_stream(
                query="Where is user authentication handled?",
                project_id=93,
            ))

        self.assertEqual(tokens, ["Token1", " Token2", "!"])
        self.mock_llm_service.generate_stream.assert_called_once()

    def test_stream_graph_events(self):
        """Test stream_graph_events yields metadata, token events, and done event."""
        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate_stream.return_value = iter(["Hello", " world"])

        with patch.object(self.service, "_extract_graph_context", return_value=[]):
            events = list(self.service.stream_graph_events(
                query="Where is user authentication handled?",
                project_id=93,
            ))

        self.assertEqual(len(events), 4)
        self.assertEqual(events[0]["type"], "metadata")
        self.assertEqual(events[0]["project_id"], 93)
        self.assertEqual(events[1], {"type": "token", "content": "Hello"})
        self.assertEqual(events[2], {"type": "token", "content": " world"})
        self.assertEqual(events[3], {"type": "done"})


class TestGraphRAGAPI(unittest.TestCase):
    """Integration test suite for POST /api/v1/rag/graph-generate endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_successful_api_request(self, mock_service_cls):
        """Test successful POST /api/v1/rag/graph-generate request (HTTP 200)."""
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
            score=0.89,
            file_path="backend/auth.py",
            start_line=10,
            end_line=30,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        mock_service.generate_graph_answer.return_value = GraphRAGGenerationResponse(
            query="Where is user authentication handled and what functions does it call?",
            project_id=93,
            answer="User authentication is in backend/auth.py and calls verify_password.",
            model="qwen2.5-coder:7b",
            total_chunks=1,
            sources=[mock_chunk],
            graph_context=[mock_detail],
            context="FULL PROMPT CONTEXT",
        )

        response = self.client.post(
            "/api/v1/rag/graph-generate",
            json={
                "query": "Where is user authentication handled and what functions does it call?",
                "project_id": 93,
                "top_k": 3,
                "include_calls": True,
                "include_imports": True,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "Where is user authentication handled and what functions does it call?")
        self.assertEqual(data["project_id"], 93)
        self.assertEqual(data["answer"], "User authentication is in backend/auth.py and calls verify_password.")
        self.assertEqual(data["model"], "qwen2.5-coder:7b")
        self.assertEqual(data["total_chunks"], 1)
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(len(data["graph_context"]), 1)
        self.assertEqual(data["graph_context"][0]["file_path"], "backend/auth.py")
        self.assertIn("verify_password", data["graph_context"][0]["calls"])

    def test_api_validation_failure(self):
        """Test request payload validation errors (HTTP 422)."""
        # Missing query
        r1 = self.client.post("/api/v1/rag/graph-generate", json={"top_k": 5})
        self.assertEqual(r1.status_code, 422)

        # Empty query
        r2 = self.client.post("/api/v1/rag/graph-generate", json={"query": ""})
        self.assertEqual(r2.status_code, 422)

        # Whitespace query
        r3 = self.client.post("/api/v1/rag/graph-generate", json={"query": "   \n "})
        self.assertEqual(r3.status_code, 422)

        # top_k out of bounds (0 or 21)
        r4 = self.client.post("/api/v1/rag/graph-generate", json={"query": "test", "top_k": 0})
        self.assertEqual(r4.status_code, 422)

        r5 = self.client.post("/api/v1/rag/graph-generate", json={"query": "test", "top_k": 21})
        self.assertEqual(r5.status_code, 422)

    @patch("app.api.v1.endpoints.rag.GraphRAGGenerationService")
    def test_api_500_failure(self, mock_service_cls):
        """Test that internal service failures return HTTP 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.generate_graph_answer.side_effect = RuntimeError("Ollama service unreachable")

        response = self.client.post(
            "/api/v1/rag/graph-generate",
            json={"query": "Explain authentication flow", "project_id": 93},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Ollama service unreachable", response.json()["detail"])


class _SingleResult:
    def __init__(self, record):
        self.record = record

    def single(self):
        return self.record


def _single(record):
    return _SingleResult(record)


if __name__ == "__main__":
    unittest.main()
