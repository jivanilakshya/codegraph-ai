"""Unit and integration test suite for Step 6.2.5: Advanced RAG Retrieval & Semantic Code Search."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.rag import (
    RAGChunkResult,
    RAGRetrievalRequest,
    RAGRetrievalResponse,
    RAGSearchRequest,
)
from app.schemas.search import (
    SemanticSearchResult,
    SemanticSearchResponse,
)
from app.services.rag_retrieval_service import RAGRetrievalService
from app.services.semantic_search_service import SemanticSearchService


class TestRAGSearchSchemas(unittest.TestCase):
    """Test suite for RAG search and retrieval Pydantic schemas and validation rules."""

    def test_1_valid_basic_query(self):
        """1. Test valid basic query with default parameters."""
        req = RAGSearchRequest(query="Where is user authentication handled?")
        self.assertEqual(req.query, "Where is user authentication handled?")
        self.assertIsNone(req.project_id)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)

    def test_2_empty_query_rejection(self):
        """2. Test that an empty query string raises a ValidationError."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="")

    def test_3_whitespace_only_query_rejection(self):
        """3. Test that a whitespace-only query string raises a ValidationError."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="   \t\n  ")

    def test_4_top_k_min_boundary_accepted(self):
        """4. Test top_k=1 is accepted as valid boundary."""
        req = RAGSearchRequest(query="valid query", top_k=1)
        self.assertEqual(req.top_k, 1)

    def test_5_top_k_max_boundary_accepted(self):
        """5. Test top_k=20 is accepted as valid boundary."""
        req = RAGSearchRequest(query="valid query", top_k=20)
        self.assertEqual(req.top_k, 20)

    def test_6_top_k_zero_rejected(self):
        """6. Test top_k=0 is rejected."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="valid query", top_k=0)

    def test_7_top_k_over_max_rejected(self):
        """7. Test top_k=25 is rejected."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="valid query", top_k=25)

    def test_8_valid_similarity_threshold_accepted(self):
        """8. Test similarity_threshold=0.8 is accepted."""
        req = RAGSearchRequest(query="valid query", similarity_threshold=0.8)
        self.assertEqual(req.similarity_threshold, 0.8)

    def test_9_negative_similarity_threshold_rejected(self):
        """9. Test similarity_threshold=-0.1 is rejected."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="valid query", similarity_threshold=-0.1)

    def test_10_over_max_similarity_threshold_rejected(self):
        """10. Test similarity_threshold=1.5 is rejected."""
        with self.assertRaises(ValidationError):
            RAGSearchRequest(query="valid query", similarity_threshold=1.5)


class TestRAGSearchFilteringAndRetrieval(unittest.TestCase):
    """Test suite for business logic, filtering, ordering, and error propagation in RAGRetrievalService."""

    def setUp(self):
        self.mock_search_service = MagicMock(spec=SemanticSearchService)
        self.service = RAGRetrievalService(
            semantic_search_service=self.mock_search_service,
            default_similarity_threshold=0.0,
        )

    def test_11_project_id_filtering(self):
        """11. Test project_id filter is passed to SemanticSearchService and populated in response."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="find token",
            total_results=0,
            results=[],
        )

        response = self.service.retrieve(query="find token", project_id=93)
        self.mock_search_service.search.assert_called_once_with(
            query="find token",
            limit=10,
            project_id=93,
        )
        self.assertEqual(response.project_id, 93)
        self.assertEqual(response.applied_filters, {"project_id": 93})
        self.assertEqual(response.retrieval_config["project_id"], 93)

    def test_12_file_path_filtering(self):
        """12. Test file_path filter is forwarded to search service and post-retrieval scope enforced."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="auth handler",
            total_results=2,
            results=[
                SemanticSearchResult(
                    score=0.90,
                    content="def auth(): pass",
                    metadata={"file_path": "backend/auth.py", "name": "auth"},
                ),
                SemanticSearchResult(
                    score=0.85,
                    content="def other(): pass",
                    metadata={"file_path": "backend/other.py", "name": "other"},
                ),
            ],
        )

        response = self.service.retrieve(query="auth handler", file_path="backend/auth.py")
        self.assertEqual(len(response.results), 1)
        self.assertEqual(response.results[0].file_path, "backend/auth.py")
        self.assertEqual(response.applied_filters["file_path"], "backend/auth.py")

    def test_13_entity_name_filtering(self):
        """13. Test entity_name filter is forwarded to search service and post-retrieval scope enforced."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="authenticate user",
            total_results=2,
            results=[
                SemanticSearchResult(
                    score=0.92,
                    content="def authenticate_user(): pass",
                    metadata={"file_path": "backend/auth.py", "name": "authenticate_user"},
                ),
                SemanticSearchResult(
                    score=0.80,
                    content="def logout_user(): pass",
                    metadata={"file_path": "backend/auth.py", "name": "logout_user"},
                ),
            ],
        )

        response = self.service.retrieve(query="authenticate user", entity_name="authenticate_user")
        self.assertEqual(len(response.results), 1)
        self.assertEqual(response.results[0].name, "authenticate_user")
        self.assertEqual(response.applied_filters["entity_name"], "authenticate_user")

    def test_14_multiple_filters_together(self):
        """14. Test project_id + file_path + entity_name filters applied together."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="login route",
            total_results=1,
            results=[
                SemanticSearchResult(
                    score=0.95,
                    content="def login(): pass",
                    metadata={"file_path": "routes/auth.py", "name": "login", "project_id": 93},
                )
            ],
        )

        response = self.service.retrieve(
            query="login route",
            project_id=93,
            file_path="routes/auth.py",
            entity_name="login",
        )
        self.assertEqual(len(response.results), 1)
        self.assertEqual(
            response.applied_filters,
            {
                "project_id": 93,
                "file_path": "routes/auth.py",
                "entity_name": "login",
            },
        )

    def test_15_results_remain_ordered_by_similarity(self):
        """15. Test that results preserve similarity score descending order."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="query",
            total_results=3,
            results=[
                SemanticSearchResult(score=0.95, content="chunk A", metadata={"file_path": "a.py"}),
                SemanticSearchResult(score=0.85, content="chunk B", metadata={"file_path": "b.py"}),
                SemanticSearchResult(score=0.75, content="chunk C", metadata={"file_path": "c.py"}),
            ],
        )

        response = self.service.retrieve(query="query")
        scores = [r.score for r in response.results]
        self.assertEqual(scores, [0.95, 0.85, 0.75])

    def test_16_top_k_limits_results(self):
        """16. Test that top_k correctly limits maximum number of returned results."""
        mock_results = [
            SemanticSearchResult(
                score=0.9 - (i * 0.05),
                content=f"code block {i}",
                metadata={"file_path": f"file_{i}.py", "start_line": i, "end_line": i + 10},
            )
            for i in range(10)
        ]
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="query",
            total_results=10,
            results=mock_results,
        )

        response = self.service.retrieve(query="query", top_k=3)
        self.assertEqual(response.total_results, 3)
        self.assertEqual(len(response.results), 3)

    def test_17_similarity_threshold_removes_low_score_results(self):
        """17. Test that similarity_threshold removes results falling below threshold."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="query",
            total_results=4,
            results=[
                SemanticSearchResult(score=0.95, content="chunk 1", metadata={"file_path": "1.py"}),
                SemanticSearchResult(score=0.82, content="chunk 2", metadata={"file_path": "2.py"}),
                SemanticSearchResult(score=0.65, content="chunk 3", metadata={"file_path": "3.py"}),
                SemanticSearchResult(score=0.40, content="chunk 4", metadata={"file_path": "4.py"}),
            ],
        )

        response = self.service.retrieve(query="query", similarity_threshold=0.80)
        self.assertEqual(response.total_results, 2)
        self.assertEqual([r.score for r in response.results], [0.95, 0.82])

    def test_18_empty_retrieval_result_handled(self):
        """18. Test empty search result handling with fallback context."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="nonexistent feature",
            total_results=0,
            results=[],
        )

        response = self.service.retrieve(query="nonexistent feature")
        self.assertEqual(response.total_results, 0)
        self.assertEqual(response.results, [])
        self.assertIn("No relevant code chunks found.", response.context)

    def test_19_embedding_generation_failure_propagates(self):
        """19. Test that embedding generation failure propagates as RuntimeError."""
        self.mock_search_service.search.side_effect = RuntimeError("Failed to generate query embedding: Model error")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.retrieve(query="test query")

        self.assertIn("Failed to generate query embedding", str(ctx.exception))

    def test_20_vector_store_search_failure_propagates(self):
        """20. Test that vector store search failure propagates as RuntimeError."""
        self.mock_search_service.search.side_effect = RuntimeError("Vector search failed: Qdrant timeout")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.retrieve(query="test query")

        self.assertIn("Vector search failed", str(ctx.exception))

    def test_21_successful_rag_retrieval_service_flow(self):
        """21. Test full successful service flow with context formatting and metadata preservation."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="database connection",
            total_results=1,
            results=[
                SemanticSearchResult(
                    score=0.91,
                    content="def get_db(): return SessionLocal()",
                    metadata={
                        "file_path": "app/database.py",
                        "start_line": 10,
                        "end_line": 15,
                        "language": "python",
                        "entity_type": "function",
                        "name": "get_db",
                        "project_id": 93,
                    },
                )
            ],
        )

        response = self.service.retrieve(query="database connection", top_k=5, project_id=93)
        self.assertEqual(response.query, "database connection")
        self.assertEqual(response.project_id, 93)
        self.assertEqual(response.total_results, 1)
        self.assertEqual(response.results[0].file_path, "app/database.py")
        self.assertEqual(response.results[0].entity_name, "get_db")
        self.assertIn("QUESTION:\ndatabase connection", response.context)


class TestRAGSearchAPI(unittest.TestCase):
    """Test suite for FastAPI endpoints POST /api/v1/rag/search and POST /api/v1/rag/retrieve."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.RAGRetrievalService")
    def test_22_successful_http_200_search_endpoint(self, mock_service_cls):
        """22. Test successful POST /api/v1/rag/search request returning HTTP 200."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.retrieve.return_value = RAGRetrievalResponse(
            query="authentication flow",
            project_id=93,
            total_results=1,
            results=[
                RAGChunkResult(
                    score=0.89,
                    file_path="backend/auth.py",
                    start_line=20,
                    end_line=45,
                    language="python",
                    entity_type="function",
                    name="auth_user",
                    entity_name="auth_user",
                    project_id=93,
                    content="def auth_user(): pass",
                )
            ],
            applied_filters={"project_id": 93},
            retrieval_config={"top_k": 5, "project_id": 93},
            context="QUESTION:\nauthentication flow\n\nRELEVANT CODE:\n...",
        )

        response = self.client.post(
            "/api/v1/rag/search",
            json={
                "query": "authentication flow",
                "project_id": 93,
                "top_k": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["query"], "authentication flow")
        self.assertEqual(data["project_id"], 93)
        self.assertEqual(data["total_results"], 1)
        self.assertEqual(data["applied_filters"]["project_id"], 93)

    def test_23_invalid_request_returns_http_422(self):
        """23. Test invalid request payload returns HTTP 422 Unprocessable Entity."""
        # Empty query
        r1 = self.client.post("/api/v1/rag/search", json={"query": "", "top_k": 5})
        self.assertEqual(r1.status_code, 422)

        # Invalid top_k
        r2 = self.client.post("/api/v1/rag/search", json={"query": "test", "top_k": 25})
        self.assertEqual(r2.status_code, 422)

        # Invalid similarity threshold
        r3 = self.client.post("/api/v1/rag/search", json={"query": "test", "similarity_threshold": 1.5})
        self.assertEqual(r3.status_code, 422)

    @patch("app.api.v1.endpoints.rag.RAGRetrievalService")
    def test_24_service_failure_returns_http_500(self, mock_service_cls):
        """24. Test internal service error returns HTTP 500 Internal Server Error."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.retrieve.side_effect = RuntimeError("Qdrant store connection failed")

        response = self.client.post(
            "/api/v1/rag/search",
            json={"query": "authentication flow"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Qdrant store connection failed", response.json()["detail"])

    @patch("app.api.v1.endpoints.rag.RAGRetrievalService")
    def test_25_backward_compatibility_retrieve_endpoint(self, mock_service_cls):
        """25. Test that existing POST /api/v1/rag/retrieve endpoint remains functional."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.retrieve.return_value = RAGRetrievalResponse(
            query="legacy retrieve test",
            total_results=0,
            results=[],
            context="QUESTION:\nlegacy retrieve test\n\nRELEVANT CODE:\nNo relevant code chunks found.",
        )

        response = self.client.post(
            "/api/v1/rag/retrieve",
            json={"query": "legacy retrieve test"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["query"], "legacy retrieve test")


if __name__ == "__main__":
    unittest.main()
