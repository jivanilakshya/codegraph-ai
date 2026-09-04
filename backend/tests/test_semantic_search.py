"""Unit and integration tests for Step 4: Semantic Search."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pydantic import ValidationError
from qdrant_client.models import FieldCondition, Filter, MatchValue, ScoredPoint
from fastapi.testclient import TestClient

from app.main import app
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import VectorStoreService
from app.schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResult,
    SemanticSearchResponse,
)
from app.services.semantic_search_service import SemanticSearchService


class TestSemanticSearchSchemas(unittest.TestCase):
    """Test suite for semantic search Pydantic schemas."""

    def test_valid_request_schema(self):
        """Test valid SemanticSearchRequest parsing."""
        req = SemanticSearchRequest(
            query="  where is the database connection?  ",
            limit=10,
            project_id=1,
        )
        # Verify query is trimmed
        self.assertEqual(req.query, "where is the database connection?")
        self.assertEqual(req.limit, 10)
        self.assertEqual(req.project_id, 1)

    def test_default_request_values(self):
        """Test default values for limit and project_id."""
        req = SemanticSearchRequest(query="find auth logic")
        self.assertEqual(req.query, "find auth logic")
        self.assertEqual(req.limit, 5)
        self.assertIsNone(req.project_id)

    def test_empty_query_validation_error(self):
        """Test that empty query string raises validation error."""
        with self.assertRaises(ValidationError):
            SemanticSearchRequest(query="")

    def test_whitespace_query_validation_error(self):
        """Test that whitespace-only query string raises validation error."""
        with self.assertRaises(ValidationError):
            SemanticSearchRequest(query="    ")

    def test_invalid_limit_validation_error(self):
        """Test that limit <= 0 or > 100 raises validation error."""
        with self.assertRaises(ValidationError):
            SemanticSearchRequest(query="valid query", limit=0)

        with self.assertRaises(ValidationError):
            SemanticSearchRequest(query="valid query", limit=-5)

        with self.assertRaises(ValidationError):
            SemanticSearchRequest(query="valid query", limit=101)


class TestVectorStoreSearch(unittest.TestCase):
    """Test suite for search capabilities in VectorStoreService."""

    def setUp(self):
        self.mock_client = MagicMock()

    @patch("app.ai.vector_store.QdrantClient")
    def test_search_calls_client_with_correct_params(self, mock_qdrant_cls):
        """Test that VectorStoreService.search executes Qdrant query_points with expected parameters."""
        mock_qdrant_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = True

        scored_point = ScoredPoint(
            id=1,
            version=1,
            score=0.88,
            payload={"content": "def connect(): pass", "file_path": "db.py"},
            vector=None,
        )
        mock_response = MagicMock()
        mock_response.points = [scored_point]
        self.mock_client.query_points.return_value = mock_response

        service = VectorStoreService(host="localhost", port=6333)
        query_vec = [0.1] * 384
        results = service.search(query_vector=query_vec, limit=5, collection_name="code_chunks")

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].score, 0.88)
        self.mock_client.query_points.assert_called_once_with(
            collection_name="code_chunks",
            query=query_vec,
            limit=5,
            query_filter=None,
            with_payload=True,
        )

    @patch("app.ai.vector_store.QdrantClient")
    def test_search_with_project_id_filter(self, mock_qdrant_cls):
        """Test that VectorStoreService.search applies project_id filter condition to query_points."""
        mock_qdrant_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = True
        mock_response = MagicMock()
        mock_response.points = []
        self.mock_client.query_points.return_value = mock_response

        service = VectorStoreService(host="localhost", port=6333)
        query_vec = [0.2] * 384
        service.search(query_vector=query_vec, limit=3, project_id=42)

        _, kwargs = self.mock_client.query_points.call_args
        self.assertEqual(kwargs["limit"], 3)
        self.assertEqual(kwargs["query"], query_vec)
        query_filter = kwargs["query_filter"]
        self.assertIsInstance(query_filter, Filter)
        self.assertEqual(len(query_filter.must), 1)
        self.assertEqual(query_filter.must[0].key, "project_id")
        self.assertEqual(query_filter.must[0].match.value, 42)

    @patch("app.ai.vector_store.QdrantClient")
    def test_search_when_collection_not_found(self, mock_qdrant_cls):
        """Test that search returns empty list when collection does not exist."""
        mock_qdrant_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = False

        service = VectorStoreService(host="localhost", port=6333)
        results = service.search(query_vector=[0.1] * 384, collection_name="missing_col")

        self.assertEqual(results, [])
        self.mock_client.query_points.assert_not_called()

    @patch("app.ai.vector_store.QdrantClient")
    def test_search_failure_raises_runtime_error(self, mock_qdrant_cls):
        """Test that Qdrant query_points exception is caught and raises RuntimeError."""
        mock_qdrant_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = True
        self.mock_client.query_points.side_effect = Exception("Connection timeout")

        service = VectorStoreService(host="localhost", port=6333)
        with self.assertRaises(RuntimeError) as ctx:
            service.search(query_vector=[0.1] * 384)

        self.assertIn("Qdrant search failed", str(ctx.exception))


class TestSemanticSearchService(unittest.TestCase):
    """Test suite for SemanticSearchService coordination and logic."""

    def setUp(self):
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_vector_store = MagicMock(spec=VectorStoreService)
        self.service = SemanticSearchService(
            embedding_service=self.mock_embedding_service,
            vector_store_service=self.mock_vector_store,
            collection_name="code_chunks",
        )

    def test_successful_semantic_search(self):
        """Test full successful semantic search flow with embedding and vector lookup."""
        self.mock_embedding_service.embed_text.return_value = [0.25] * 384
        
        mock_point = ScoredPoint(
            id=101,
            version=1,
            score=0.92,
            payload={
                "content": "def create_db_engine(): return create_engine(url)",
                "file_path": "app/database/postgres.py",
                "language": "python",
                "start_line": 15,
                "end_line": 20,
                "entity_type": "function",
                "name": "create_db_engine",
                "project_id": 1,
            },
            vector=None,
        )
        self.mock_vector_store.search.return_value = [mock_point]

        response = self.service.search(query="database engine connection", limit=5, project_id=1)

        # 1. Query embedding was generated
        self.mock_embedding_service.embed_text.assert_called_once_with("database engine connection")

        # 2. Vector search was executed
        self.mock_vector_store.search.assert_called_once_with(
            query_vector=[0.25] * 384,
            limit=5,
            collection_name="code_chunks",
            project_id=1,
        )

        # 3. Formatted response matches
        self.assertIsInstance(response, SemanticSearchResponse)
        self.assertEqual(response.query, "database engine connection")
        self.assertEqual(response.total_results, 1)
        self.assertEqual(len(response.results), 1)

        result_item = response.results[0]
        self.assertAlmostEqual(result_item.score, 0.92)
        self.assertEqual(result_item.content, "def create_db_engine(): return create_engine(url)")
        self.assertEqual(result_item.metadata["file_path"], "app/database/postgres.py")
        self.assertEqual(result_item.metadata["language"], "python")
        self.assertEqual(result_item.metadata["start_line"], 15)
        self.assertEqual(result_item.metadata["end_line"], 20)
        self.assertEqual(result_item.metadata["entity_type"], "function")
        self.assertEqual(result_item.metadata["name"], "create_db_engine")
        self.assertEqual(result_item.metadata["project_id"], 1)

    def test_empty_search_results(self):
        """Test graceful handling when no similar vectors are found."""
        self.mock_embedding_service.embed_text.return_value = [0.1] * 384
        self.mock_vector_store.search.return_value = []

        response = self.service.search(query="nonexistent functionality xyz")

        self.assertEqual(response.total_results, 0)
        self.assertEqual(response.results, [])

    def test_nested_metadata_payload_support(self):
        """Test parsing when payload contains a nested metadata dict."""
        self.mock_embedding_service.embed_text.return_value = [0.1] * 384
        mock_point = ScoredPoint(
            id=202,
            version=1,
            score=0.85,
            payload={
                "content": "const express = require('express');",
                "metadata": {
                    "file_path": "server.js",
                    "language": "javascript",
                    "start_line": 1,
                    "end_line": 5,
                },
            },
            vector=None,
        )
        self.mock_vector_store.search.return_value = [mock_point]

        response = self.service.search(query="express server initialization")

        self.assertEqual(response.total_results, 1)
        self.assertEqual(response.results[0].content, "const express = require('express');")
        self.assertEqual(response.results[0].metadata["file_path"], "server.js")
        self.assertEqual(response.results[0].metadata["language"], "javascript")

    def test_empty_query_raises_value_error(self):
        """Test that empty or whitespace queries raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.search(query="")

        with self.assertRaises(ValueError):
            self.service.search(query="   \t\n  ")

    def test_invalid_limit_raises_value_error(self):
        """Test that non-positive limits raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.search(query="test query", limit=0)

        with self.assertRaises(ValueError):
            self.service.search(query="test query", limit=-3)

    def test_embedding_generation_failure(self):
        """Test that embedding service errors raise RuntimeError."""
        self.mock_embedding_service.embed_text.side_effect = Exception("Model out of memory")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.search(query="some query")

        self.assertIn("Failed to generate query embedding", str(ctx.exception))

    def test_vector_store_failure(self):
        """Test that vector store search errors raise RuntimeError."""
        self.mock_embedding_service.embed_text.return_value = [0.1] * 384
        self.mock_vector_store.search.side_effect = Exception("Qdrant unreachable")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.search(query="some query")

        self.assertIn("Vector search failed", str(ctx.exception))


class TestSemanticSearchAPI(unittest.TestCase):
    """Integration test suite for the Semantic Search FastAPI endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.search.SemanticSearchService")
    def test_search_endpoint_success(self, mock_service_cls):
        """Test POST /api/v1/search endpoint with valid payload."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.search.return_value = SemanticSearchResponse(
            query="Where is the database connection created?",
            total_results=1,
            results=[
                SemanticSearchResult(
                    score=0.95,
                    content="def get_db(): ...",
                    metadata={"file_path": "app/database.py", "language": "python"},
                )
            ],
        )

        response = self.client.post(
            "/api/v1/search",
            json={"query": "Where is the database connection created?", "limit": 5, "project_id": 1},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "Where is the database connection created?")
        self.assertEqual(data["total_results"], 1)
        self.assertEqual(len(data["results"]), 1)
        self.assertAlmostEqual(data["results"][0]["score"], 0.95)
        self.assertEqual(data["results"][0]["content"], "def get_db(): ...")
        self.assertEqual(data["results"][0]["metadata"]["file_path"], "app/database.py")

    @patch("app.api.v1.endpoints.search.SemanticSearchService")
    def test_semantic_search_alias_endpoint(self, mock_service_cls):
        """Test POST /api/v1/semantic-search alias endpoint."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.search.return_value = SemanticSearchResponse(
            query="test query",
            total_results=0,
            results=[],
        )

        response = self.client.post(
            "/api/v1/semantic-search",
            json={"query": "test query"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_results"], 0)

    def test_search_endpoint_validation_errors(self):
        """Test that invalid request payloads return 422 Unprocessable Entity."""
        # Missing query
        resp1 = self.client.post("/api/v1/search", json={"limit": 5})
        self.assertEqual(resp1.status_code, 422)

        # Empty query
        resp2 = self.client.post("/api/v1/search", json={"query": ""})
        self.assertEqual(resp2.status_code, 422)

        # Whitespace query
        resp3 = self.client.post("/api/v1/search", json={"query": "   "})
        self.assertEqual(resp3.status_code, 422)

        # Invalid limit (negative or zero)
        resp4 = self.client.post("/api/v1/search", json={"query": "valid query", "limit": 0})
        self.assertEqual(resp4.status_code, 422)

        # Invalid limit (over 100)
        resp5 = self.client.post("/api/v1/search", json={"query": "valid query", "limit": 200})
        self.assertEqual(resp5.status_code, 422)

    @patch("app.api.v1.endpoints.search.SemanticSearchService")
    def test_search_endpoint_service_error(self, mock_service_cls):
        """Test that service runtime failures return 500 Internal Server Error."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.search.side_effect = RuntimeError("Qdrant connection failed")

        response = self.client.post(
            "/api/v1/search",
            json={"query": "database connection"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Qdrant connection failed", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
