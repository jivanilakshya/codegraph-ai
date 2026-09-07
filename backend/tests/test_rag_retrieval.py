"""Unit and integration tests for Step 5: RAG Retrieval."""

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
)
from app.schemas.search import (
    SemanticSearchResult,
    SemanticSearchResponse,
)
from app.services.rag_retrieval_service import RAGRetrievalService
from app.services.semantic_search_service import SemanticSearchService


class TestRAGSchemas(unittest.TestCase):
    """Test suite for RAG retrieval Pydantic schemas."""

    def test_valid_request_defaults(self):
        """Test valid RAGRetrievalRequest with default parameters."""
        req = RAGRetrievalRequest(query="Where is user authentication handled?")
        self.assertEqual(req.query, "Where is user authentication handled?")
        self.assertIsNone(req.project_id)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)

    def test_custom_top_k_and_project_id(self):
        """Test RAGRetrievalRequest with custom top_k, project_id, and similarity_threshold."""
        req = RAGRetrievalRequest(
            query="  find database connection  ",
            project_id=93,
            top_k=10,
            similarity_threshold=0.75,
        )
        self.assertEqual(req.query, "find database connection")
        self.assertEqual(req.project_id, 93)
        self.assertEqual(req.top_k, 10)
        self.assertEqual(req.similarity_threshold, 0.75)

    def test_empty_and_whitespace_query_validation(self):
        """Test that empty and whitespace queries raise ValidationError."""
        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="")

        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="   \t\n  ")

    def test_top_k_boundaries(self):
        """Test top_k validation boundaries (1 to 20)."""
        # Valid boundaries
        req_min = RAGRetrievalRequest(query="query", top_k=1)
        self.assertEqual(req_min.top_k, 1)

        req_max = RAGRetrievalRequest(query="query", top_k=20)
        self.assertEqual(req_max.top_k, 20)

        # Invalid boundaries
        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="query", top_k=0)

        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="query", top_k=-1)

        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="query", top_k=21)

    def test_similarity_threshold_boundaries(self):
        """Test similarity_threshold validation boundaries (0.0 to 1.0)."""
        req = RAGRetrievalRequest(query="query", similarity_threshold=1.0)
        self.assertEqual(req.similarity_threshold, 1.0)

        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="query", similarity_threshold=-0.1)

        with self.assertRaises(ValidationError):
            RAGRetrievalRequest(query="query", similarity_threshold=1.1)


class TestRAGRetrievalService(unittest.TestCase):
    """Test suite for RAGRetrievalService business logic."""

    def setUp(self):
        self.mock_search_service = MagicMock(spec=SemanticSearchService)
        self.service = RAGRetrievalService(
            semantic_search_service=self.mock_search_service,
            default_similarity_threshold=0.0,
        )

    def test_basic_rag_retrieval(self):
        """Test basic RAG retrieval successfully calls semantic search and formats results."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="Where is user authentication handled?",
            total_results=2,
            results=[
                SemanticSearchResult(
                    score=0.89,
                    content="def authenticate_user(token): ...",
                    metadata={
                        "file_path": "backend/auth.py",
                        "start_line": 20,
                        "end_line": 45,
                        "language": "Python",
                        "entity_type": "function",
                        "name": "authenticate_user",
                        "project_id": 93,
                    },
                ),
                SemanticSearchResult(
                    score=0.84,
                    content="@router.post('/login')\ndef login(): ...",
                    metadata={
                        "file_path": "backend/routes/auth.py",
                        "start_line": 10,
                        "end_line": 30,
                        "language": "Python",
                        "entity_type": "route",
                        "name": "login",
                        "project_id": 93,
                    },
                ),
            ],
        )

        response = self.service.retrieve(
            query="Where is user authentication handled?",
            top_k=5,
            project_id=93,
        )

        self.mock_search_service.search.assert_called_once_with(
            query="Where is user authentication handled?",
            limit=10,
            project_id=93,
        )

        self.assertEqual(response.query, "Where is user authentication handled?")
        self.assertEqual(response.project_id, 93)
        self.assertEqual(response.total_results, 2)
        self.assertEqual(len(response.results), 2)

        # Check first result item
        r1 = response.results[0]
        self.assertAlmostEqual(r1.score, 0.89)
        self.assertEqual(r1.file_path, "backend/auth.py")
        self.assertEqual(r1.start_line, 20)
        self.assertEqual(r1.end_line, 45)
        self.assertEqual(r1.language, "Python")
        self.assertEqual(r1.entity_type, "function")
        self.assertEqual(r1.name, "authenticate_user")
        self.assertEqual(r1.project_id, 93)
        self.assertEqual(r1.content, "def authenticate_user(token): ...")

    def test_default_top_k_limit(self):
        """Test that default top_k=5 is respected."""
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

        response = self.service.retrieve(query="query")
        self.assertEqual(response.total_results, 5)
        self.assertEqual(len(response.results), 5)

    def test_custom_top_k(self):
        """Test custom top_k limits returned items."""
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

    def test_invalid_top_k_raises_value_error(self):
        """Test that top_k < 1 or > 20 raises ValueError."""
        with self.assertRaises(ValueError):
            self.service.retrieve(query="test", top_k=0)

        with self.assertRaises(ValueError):
            self.service.retrieve(query="test", top_k=25)

    def test_project_id_filtering_passed_to_search(self):
        """Test that project_id is correctly forwarded to SemanticSearchService."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="find token",
            total_results=0,
            results=[],
        )

        self.service.retrieve(query="find token", project_id=42)
        self.mock_search_service.search.assert_called_once_with(
            query="find token",
            limit=10,
            project_id=42,
        )

    def test_empty_search_results(self):
        """Test empty search results return 0 total_results and fallback context."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="nonexistent query",
            total_results=0,
            results=[],
        )

        response = self.service.retrieve(query="nonexistent query")
        self.assertEqual(response.total_results, 0)
        self.assertEqual(response.results, [])
        self.assertIn("No relevant code chunks found.", response.context)
        self.assertIn("QUESTION:\nnonexistent query", response.context)

    def test_duplicate_result_handling(self):
        """Test that exact duplicate chunks are removed while preserving the highest scoring occurrence."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="auth logic",
            total_results=4,
            results=[
                SemanticSearchResult(
                    score=0.95,
                    content="def auth(): pass",
                    metadata={"file_path": "auth.py", "start_line": 1, "end_line": 10},
                ),
                # Duplicate with lower score
                SemanticSearchResult(
                    score=0.88,
                    content="def auth(): pass",
                    metadata={"file_path": "auth.py", "start_line": 1, "end_line": 10},
                ),
                SemanticSearchResult(
                    score=0.85,
                    content="def login(): pass",
                    metadata={"file_path": "login.py", "start_line": 5, "end_line": 20},
                ),
                # Duplicate with identical content and location
                SemanticSearchResult(
                    score=0.80,
                    content="def auth(): pass",
                    metadata={"file_path": "auth.py", "start_line": 1, "end_line": 10},
                ),
            ],
        )

        response = self.service.retrieve(query="auth logic", top_k=5)
        self.assertEqual(response.total_results, 2)
        self.assertEqual(len(response.results), 2)
        self.assertEqual(response.results[0].file_path, "auth.py")
        self.assertAlmostEqual(response.results[0].score, 0.95)
        self.assertEqual(response.results[1].file_path, "login.py")
        self.assertAlmostEqual(response.results[1].score, 0.85)

    def test_metadata_preservation(self):
        """Test that all 10 chunk metadata fields are properly extracted and preserved."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="get profile",
            total_results=1,
            results=[
                SemanticSearchResult(
                    score=0.91,
                    content="def get_profile(user_id): return db.find(user_id)",
                    metadata={
                        "project_id": 99,
                        "file_path": "src/user.py",
                        "language": "python",
                        "start_line": 50,
                        "end_line": 65,
                        "start_byte": 1200,
                        "end_byte": 1500,
                        "name": "get_profile",
                        "entity_type": "function",
                    },
                )
            ],
        )

        response = self.service.retrieve(query="get profile")
        self.assertEqual(response.total_results, 1)
        r = response.results[0]
        self.assertEqual(r.project_id, 99)
        self.assertEqual(r.file_path, "src/user.py")
        self.assertEqual(r.language, "python")
        self.assertEqual(r.start_line, 50)
        self.assertEqual(r.end_line, 65)
        self.assertEqual(r.start_byte, 1200)
        self.assertEqual(r.end_byte, 1500)
        self.assertEqual(r.name, "get_profile")
        self.assertEqual(r.entity_type, "function")
        self.assertAlmostEqual(r.score, 0.91)
        self.assertEqual(r.content, "def get_profile(user_id): return db.find(user_id)")

    def test_context_formatting(self):
        """Test that context string matches the required structure."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="Where is user authentication handled?",
            total_results=2,
            results=[
                SemanticSearchResult(
                    score=0.89,
                    content="def auth():\n    return True",
                    metadata={
                        "file_path": "backend/auth.py",
                        "start_line": 20,
                        "end_line": 45,
                        "language": "Python",
                        "entity_type": "function",
                    },
                ),
                SemanticSearchResult(
                    score=0.76,
                    content="function Login() { return <div />; }",
                    metadata={
                        "file_path": "frontend/src/components/Login.js",
                        "start_line": 24,
                        "end_line": 45,
                        "language": "JavaScript",
                        "entity_type": "component",
                    },
                ),
            ],
        )

        response = self.service.retrieve(query="Where is user authentication handled?")
        ctx = response.context

        # Check main header sections
        self.assertTrue(ctx.startswith("QUESTION:\nWhere is user authentication handled?\n\nRELEVANT CODE:\n\n"))
        self.assertIn("[1]\nFile: backend/auth.py\nLines: 20-45\nLanguage: Python\nEntity: function\nScore: 0.89\n\ndef auth():\n    return True", ctx)
        self.assertIn("[2]\nFile: frontend/src/components/Login.js\nLines: 24-45\nLanguage: JavaScript\nEntity: component\nScore: 0.76\n\nfunction Login() { return <div />; }", ctx)

    def test_correct_relevance_ordering(self):
        """Test that original similarity score ordering from semantic search is preserved."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="query",
            total_results=3,
            results=[
                SemanticSearchResult(score=0.95, content="chunk A", metadata={"file_path": "a.py", "start_line": 1, "end_line": 10}),
                SemanticSearchResult(score=0.85, content="chunk B", metadata={"file_path": "b.py", "start_line": 1, "end_line": 10}),
                SemanticSearchResult(score=0.75, content="chunk C", metadata={"file_path": "c.py", "start_line": 1, "end_line": 10}),
            ],
        )

        response = self.service.retrieve(query="query")
        scores = [r.score for r in response.results]
        self.assertEqual(scores, [0.95, 0.85, 0.75])

    def test_similarity_threshold_filtering(self):
        """Test filtering out results below the similarity threshold."""
        self.mock_search_service.search.return_value = SemanticSearchResponse(
            query="query",
            total_results=4,
            results=[
                SemanticSearchResult(score=0.95, content="chunk 1", metadata={"file_path": "1.py", "start_line": 1, "end_line": 10}),
                SemanticSearchResult(score=0.82, content="chunk 2", metadata={"file_path": "2.py", "start_line": 1, "end_line": 10}),
                SemanticSearchResult(score=0.65, content="chunk 3", metadata={"file_path": "3.py", "start_line": 1, "end_line": 10}),
                SemanticSearchResult(score=0.40, content="chunk 4", metadata={"file_path": "4.py", "start_line": 1, "end_line": 10}),
            ],
        )

        # Threshold 0.80 should keep chunks 1 and 2
        response = self.service.retrieve(query="query", similarity_threshold=0.80)
        self.assertEqual(response.total_results, 2)
        self.assertEqual([r.score for r in response.results], [0.95, 0.82])

    def test_semantic_search_failure_propagates_error(self):
        """Test that failure in semantic search raises RuntimeError."""
        self.mock_search_service.search.side_effect = RuntimeError("Embedding service unavailable")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.retrieve(query="test query")

        self.assertIn("Embedding service unavailable", str(ctx.exception))


class TestRAGRetrievalAPI(unittest.TestCase):
    """Integration test suite for the RAG retrieval FastAPI endpoint POST /api/v1/rag/retrieve."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.RAGRetrievalService")
    def test_rag_retrieve_endpoint_success(self, mock_service_cls):
        """Test successful POST /api/v1/rag/retrieve request."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.retrieve.return_value = RAGRetrievalResponse(
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
                    name="auth_user",
                    project_id=93,
                    content="def auth_user(): pass",
                )
            ],
            context="QUESTION:\nWhere is user authentication handled?\n\nRELEVANT CODE:\n\n[1]\nFile: backend/auth.py\nLines: 20-45\nLanguage: Python\nEntity: function\nScore: 0.89\n\ndef auth_user(): pass",
        )

        response = self.client.post(
            "/api/v1/rag/retrieve",
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
        self.assertEqual(data["total_results"], 1)
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["file_path"], "backend/auth.py")
        self.assertIn("QUESTION:", data["context"])

    def test_rag_retrieve_validation_errors(self):
        """Test request payload validation errors (422)."""
        # Missing query
        r1 = self.client.post("/api/v1/rag/retrieve", json={"top_k": 5})
        self.assertEqual(r1.status_code, 422)

        # Empty query
        r2 = self.client.post("/api/v1/rag/retrieve", json={"query": ""})
        self.assertEqual(r2.status_code, 422)

        # Whitespace query
        r3 = self.client.post("/api/v1/rag/retrieve", json={"query": "   "})
        self.assertEqual(r3.status_code, 422)

        # top_k out of bounds (0 or 25)
        r4 = self.client.post("/api/v1/rag/retrieve", json={"query": "test", "top_k": 0})
        self.assertEqual(r4.status_code, 422)

        r5 = self.client.post("/api/v1/rag/retrieve", json={"query": "test", "top_k": 25})
        self.assertEqual(r5.status_code, 422)

    @patch("app.api.v1.endpoints.rag.RAGRetrievalService")
    def test_rag_retrieve_service_error_500(self, mock_service_cls):
        """Test that internal service errors return 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.retrieve.side_effect = RuntimeError("Qdrant connection timed out")

        response = self.client.post(
            "/api/v1/rag/retrieve",
            json={"query": "find auth"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Qdrant connection timed out", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
