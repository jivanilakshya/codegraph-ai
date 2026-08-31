"""Unit tests for the embedding service."""

import unittest
from unittest.mock import MagicMock, patch
import numpy as np

from app.schemas.chunk import CodeChunk
from app.ai.embeddings import EmbeddingService, ChunkEmbedding


class TestEmbeddingService(unittest.TestCase):
    """Test suite for the EmbeddingService class."""

    def setUp(self):
        """Set up test environment."""
        self.mock_model = MagicMock()
        # Mock the embedding dimension to be 384 (like bge-small-en-v1.5)
        self.mock_model.get_embedding_dimension.return_value = 384
        
        # Mock encode to return a numpy array of size (len(texts), 384) with dummy values
        def mock_encode(texts, **kwargs):
            batch_size = len(texts)
            # Create a deterministic mock embedding vector for each text
            dummy_embeddings = []
            for text in texts:
                # Fill with dummy values, e.g. floats
                vec = np.zeros(384)
                vec[0] = 0.5
                vec[1] = -0.5
                dummy_embeddings.append(vec)
            return np.array(dummy_embeddings)

        self.mock_model.encode.side_effect = mock_encode

    @patch("sentence_transformers.SentenceTransformer")
    def test_model_loading(self, mock_transformer_cls):
        """Test 1: Embedding service can load the model."""
        mock_transformer_cls.return_value = self.mock_model
        
        # Create service with default configuration
        service = EmbeddingService(model_name="mock-model")
        
        # Trigger lazy load
        model = service._get_model()
        
        self.assertIsNotNone(model)
        mock_transformer_cls.assert_called_once_with("mock-model", device=service.device)
        self.assertEqual(service.model_name, "mock-model")

    @patch("sentence_transformers.SentenceTransformer")
    def test_single_text_embedding(self, mock_transformer_cls):
        """Test 2 & 3: One valid text generates one embedding and values are numeric."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model")

        text = "def hello_world(): print('hello')"
        embedding = service.embed_text(text)

        self.assertEqual(len(embedding), 384)
        self.assertIsInstance(embedding, list)
        self.assertTrue(all(isinstance(val, float) for val in embedding))
        self.assertAlmostEqual(embedding[0], 0.5)
        self.assertAlmostEqual(embedding[1], -0.5)

    @patch("sentence_transformers.SentenceTransformer")
    def test_embedding_dimension_consistency(self, mock_transformer_cls):
        """Test 4: Embedding dimension is consistent."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model")

        dim = service.embedding_dim
        self.assertEqual(dim, 384)
        
        # Test that dimension matches output vector length
        embedding = service.embed_text("some random code snippet")
        self.assertEqual(len(embedding), dim)

    @patch("sentence_transformers.SentenceTransformer")
    def test_multiple_chunks_embedding(self, mock_transformer_cls):
        """Test 5: Multiple chunks generate the correct number of embeddings."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model")

        chunks = [
            CodeChunk(content="chunk 1 content", start_line=1, end_line=5, start_byte=0, end_byte=15),
            CodeChunk(content="chunk 2 content", start_line=6, end_line=10, start_byte=16, end_byte=31),
            CodeChunk(content="chunk 3 content", start_line=11, end_line=15, start_byte=32, end_byte=47)
        ]

        results = service.embed_chunks(chunks)

        self.assertEqual(len(results), len(chunks))
        self.assertIsInstance(results[0], ChunkEmbedding)
        self.assertEqual(len(results[0].embedding), 384)
        self.assertEqual(results[0].chunk.content, "chunk 1 content")

    @patch("sentence_transformers.SentenceTransformer")
    def test_batch_processing(self, mock_transformer_cls):
        """Test 6: Batch processing works and uses batch_size parameter."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model", batch_size=2)

        chunks = [
            CodeChunk(content="c1", start_line=1, end_line=2, start_byte=0, end_byte=2),
            CodeChunk(content="c2", start_line=3, end_line=4, start_byte=3, end_byte=5),
            CodeChunk(content="c3", start_line=5, end_line=6, start_byte=6, end_byte=8),
            CodeChunk(content="c4", start_line=7, end_line=8, start_byte=9, end_byte=11)
        ]

        # Use batch size = 2
        results = service.embed_chunks(chunks, batch_size=2)
        
        self.assertEqual(len(results), 4)
        # Verify that encode was called with correct batch size
        self.mock_model.encode.assert_called_with(
            ["c1", "c2", "c3", "c4"],
            batch_size=2,
            normalize_embeddings=True,
            show_progress_bar=False,
            device=service.device
        )

    @patch("sentence_transformers.SentenceTransformer")
    def test_empty_input_handling(self, mock_transformer_cls):
        """Test 7: Empty input is handled correctly."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model")

        # Empty text string should raise ValueError
        with self.assertRaises(ValueError):
            service.embed_text("")
        
        with self.assertRaises(ValueError):
            service.embed_text("   ")

        # Empty chunk list should return empty list
        self.assertEqual(service.embed_chunks([]), [])

        # Chunk with empty content should be handled without throwing and should have empty embedding
        chunks_with_empty = [
            CodeChunk(content="c1", start_line=1, end_line=2, start_byte=0, end_byte=2),
            CodeChunk(content="", start_line=3, end_line=4, start_byte=3, end_byte=5),
            CodeChunk(content="   ", start_line=5, end_line=6, start_byte=6, end_byte=9)
        ]

        results = service.embed_chunks(chunks_with_empty)
        self.assertEqual(len(results), 3)
        self.assertEqual(len(results[0].embedding), 384)
        self.assertEqual(results[1].embedding, [])  # Empty content
        self.assertEqual(results[2].embedding, [])  # Whitespace content

    @patch("sentence_transformers.SentenceTransformer")
    def test_original_metadata_preservation(self, mock_transformer_cls):
        """Test 8: Original CodeChunk metadata is not modified."""
        mock_transformer_cls.return_value = self.mock_model
        service = EmbeddingService(model_name="mock-model")

        original_chunk = CodeChunk(
            content="def test(): pass",
            start_line=10,
            end_line=12,
            start_byte=100,
            end_byte=116,
            name="test",
            entity_type="function"
        )

        # Make a copy to verify values don't change
        chunk_copy = original_chunk.model_copy()

        results = service.embed_chunks([original_chunk])
        
        # Verify the returned chunk is identical in metadata to the original
        returned_chunk = results[0].chunk
        self.assertEqual(returned_chunk.content, chunk_copy.content)
        self.assertEqual(returned_chunk.start_line, chunk_copy.start_line)
        self.assertEqual(returned_chunk.end_line, chunk_copy.end_line)
        self.assertEqual(returned_chunk.start_byte, chunk_copy.start_byte)
        self.assertEqual(returned_chunk.end_byte, chunk_copy.end_byte)
        self.assertEqual(returned_chunk.name, chunk_copy.name)
        self.assertEqual(returned_chunk.entity_type, chunk_copy.entity_type)


if __name__ == "__main__":
    unittest.main()
