"""Unit tests for the vector indexing pipeline."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.embeddings import ChunkEmbedding, EmbeddingService
from app.ai.vector_store import VectorStoreService
from app.ai.chunker import CodeChunker
from app.schemas.chunk import CodeChunk
from app.services.vector_indexing_service import VectorIndexingError, VectorIndexingService


class TestVectorIndexingService(unittest.TestCase):
    """Test suite for VectorIndexingService."""

    def setUp(self):
        self.mock_embedding_service = MagicMock(spec=EmbeddingService)
        self.mock_embedding_service.embedding_dim = 384
        self.mock_embedding_service.model_name = "BAAI/bge-small-en-v1.5"

        self.mock_vector_store = MagicMock(spec=VectorStoreService)
        self.mock_chunker = MagicMock(spec=CodeChunker)

        self.service = VectorIndexingService(
            embedding_service=self.mock_embedding_service,
            vector_store_service=self.mock_vector_store,
            chunker=self.mock_chunker,
            collection_name="code_chunks",
        )

    @patch("app.services.vector_indexing_service.SessionLocal")
    @patch("app.services.vector_indexing_service.Path.is_file")
    def test_successful_indexing_flow(self, mock_is_file, mock_session_cls):
        """Test that chunks are extracted, embedded, and upserted with correct metadata."""
        mock_is_file.return_value = True

        # Mock database session and project/files
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.local_path = "/repositories/test-project"
        mock_session.get.return_value = mock_project

        mock_file1 = MagicMock()
        mock_file1.id = 10
        mock_file1.path = "app/auth.py"
        mock_file1.language = "Python"

        mock_session.query.return_value.filter.return_value.all.return_value = [mock_file1]

        # Mock chunking
        chunk1 = CodeChunk(
            content="def login(user, password): pass",
            start_line=1,
            end_line=5,
            start_byte=0,
            end_byte=35,
            name="login",
            entity_type="function",
        )
        self.mock_chunker.chunk_file.return_value = [chunk1]

        # Mock embedding
        self.mock_embedding_service.embed_chunks.return_value = [
            ChunkEmbedding(chunk=chunk1, embedding=[0.1] * 384)
        ]

        stats = self.service.index_project(project_id=1, batch_size=16)

        # 1. Collection ensured and old vectors deleted
        self.mock_vector_store.ensure_collection.assert_called_once_with(
            collection_name="code_chunks",
            vector_size=384,
        )
        self.mock_vector_store.delete_project_vectors.assert_called_once_with(
            project_id=1,
            collection_name="code_chunks",
        )

        # 2. Chunking called on candidate file
        self.mock_chunker.chunk_file.assert_called_once()

        # 3. Embeddings generated with batch_size
        self.mock_embedding_service.embed_chunks.assert_called_once_with(
            [chunk1],
            batch_size=16,
        )

        # 4. Upserted into Qdrant
        self.mock_vector_store.upsert_points.assert_called_once()
        _, kwargs = self.mock_vector_store.upsert_points.call_args
        points = self.mock_vector_store.upsert_points.call_args[0][0]
        self.assertEqual(len(points), 1)

        point = points[0]
        self.assertEqual(len(point.vector), 384)
        self.assertEqual(point.payload["project_id"], 1)
        self.assertEqual(point.payload["file_path"], "app/auth.py")
        self.assertEqual(point.payload["language"], "Python")
        self.assertEqual(point.payload["content"], "def login(user, password): pass")
        self.assertEqual(point.payload["start_line"], 1)
        self.assertEqual(point.payload["end_line"], 5)
        self.assertEqual(point.payload["name"], "login")
        self.assertEqual(point.payload["entity_type"], "function")

        # Nested metadata structure preservation
        self.assertEqual(point.payload["metadata"]["project_id"], 1)
        self.assertEqual(point.payload["metadata"]["file_path"], "app/auth.py")

        self.assertEqual(stats["project_id"], 1)
        self.assertEqual(stats["files_scanned"], 1)
        self.assertEqual(stats["chunks_created"], 1)
        self.assertEqual(stats["vectors_indexed"], 1)

    @patch("app.services.vector_indexing_service.SessionLocal")
    def test_project_not_found(self, mock_session_cls):
        """Test error raised when project is missing from database."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.get.return_value = None

        with self.assertRaises(VectorIndexingError) as ctx:
            self.service.index_project(project_id=999)

        self.assertIn("Project with ID 999 not found", str(ctx.exception))

    @patch("app.services.vector_indexing_service.SessionLocal")
    def test_project_with_no_files(self, mock_session_cls):
        """Test graceful handling when project has zero files."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        mock_project = MagicMock()
        mock_project.id = 2
        mock_project.local_path = "/repositories/empty-project"
        mock_session.get.return_value = mock_project
        mock_session.query.return_value.filter.return_value.all.return_value = []

        stats = self.service.index_project(project_id=2)

        self.assertEqual(stats["vectors_indexed"], 0)
        self.mock_embedding_service.embed_chunks.assert_not_called()
        self.mock_vector_store.upsert_points.assert_not_called()

    @patch("app.services.vector_indexing_service.SessionLocal")
    @patch("app.services.vector_indexing_service.Path.is_file")
    def test_empty_or_whitespace_chunks_skipped(self, mock_is_file, mock_session_cls):
        """Test that empty or whitespace-only chunks do not create vectors."""
        mock_is_file.return_value = True
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        mock_project = MagicMock()
        mock_project.id = 3
        mock_project.local_path = "/repositories/test3"
        mock_session.get.return_value = mock_project

        mock_file = MagicMock()
        mock_file.id = 1
        mock_file.path = "empty.py"
        mock_file.language = "Python"
        mock_session.query.return_value.filter.return_value.all.return_value = [mock_file]

        # Chunk with empty content
        chunk_empty = CodeChunk(
            content="   \n   ",
            start_line=1,
            end_line=2,
            start_byte=0,
            end_byte=6,
        )
        self.mock_chunker.chunk_file.return_value = [chunk_empty]

        stats = self.service.index_project(project_id=3)

        self.assertEqual(stats["chunks_created"], 0)
        self.assertEqual(stats["vectors_indexed"], 0)
        self.mock_embedding_service.embed_chunks.assert_not_called()
        self.mock_vector_store.upsert_points.assert_not_called()

    @patch("app.services.vector_indexing_service.SessionLocal")
    @patch("app.services.vector_indexing_service.Path.is_file")
    def test_embedding_failure_surfaced(self, mock_is_file, mock_session_cls):
        """Test that embedding generation failure raises VectorIndexingError."""
        mock_is_file.return_value = True
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        mock_project = MagicMock()
        mock_project.id = 4
        mock_project.local_path = "/repositories/test4"
        mock_session.get.return_value = mock_project

        mock_file = MagicMock()
        mock_file.id = 1
        mock_file.path = "app.py"
        mock_file.language = "Python"
        mock_session.query.return_value.filter.return_value.all.return_value = [mock_file]

        chunk = CodeChunk(content="code", start_line=1, end_line=1, start_byte=0, end_byte=4)
        self.mock_chunker.chunk_file.return_value = [chunk]
        self.mock_embedding_service.embed_chunks.side_effect = RuntimeError("Embedding OOM")

        with self.assertRaises(VectorIndexingError) as ctx:
            self.service.index_project(project_id=4)

        self.assertIn("Embedding generation failed", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
