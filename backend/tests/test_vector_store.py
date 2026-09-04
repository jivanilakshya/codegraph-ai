"""Unit tests for the Qdrant vector store service."""

import os
import unittest
from unittest.mock import MagicMock, patch

from qdrant_client.models import Distance, VectorParams

from app.ai.vector_store import VectorStoreService


class TestVectorStoreService(unittest.TestCase):
    """Test suite for VectorStoreService class."""

    def setUp(self):
        """Set up mock environment for testing."""
        self.mock_client = MagicMock()

    @patch("app.ai.vector_store.QdrantClient")
    def test_client_initialization_defaults(self, mock_qdrant_client_cls):
        """Test client initialization with default environment variables."""
        mock_qdrant_client_cls.return_value = self.mock_client
        with patch.dict(os.environ, {"QDRANT_HOST": "qdrant", "QDRANT_PORT": "6333"}):
            service = VectorStoreService()
            self.assertEqual(service.host, "qdrant")
            self.assertEqual(service.port, 6333)

            client = service.client
            self.assertEqual(client, self.mock_client)
            mock_qdrant_client_cls.assert_called_once_with(host="qdrant", port=6333, timeout=10.0)

    @patch("app.ai.vector_store.QdrantClient")
    def test_client_initialization_custom(self, mock_qdrant_client_cls):
        """Test client initialization with custom host and port."""
        mock_qdrant_client_cls.return_value = self.mock_client
        service = VectorStoreService(host="custom-host", port=9999, timeout=5.0)
        self.assertEqual(service.host, "custom-host")
        self.assertEqual(service.port, 9999)

        client = service.client
        self.assertEqual(client, self.mock_client)
        mock_qdrant_client_cls.assert_called_once_with(host="custom-host", port=9999, timeout=5.0)

    @patch("app.ai.vector_store.QdrantClient")
    def test_health_check_success(self, mock_qdrant_client_cls):
        """Test health check when Qdrant is reachable."""
        mock_qdrant_client_cls.return_value = self.mock_client
        response = MagicMock()
        response.collections = []
        self.mock_client.get_collections.return_value = response

        service = VectorStoreService(host="localhost", port=6333)
        self.assertTrue(service.health_check())
        self.mock_client.get_collections.assert_called_once()

    @patch("app.ai.vector_store.QdrantClient")
    def test_health_check_failure(self, mock_qdrant_client_cls):
        """Test health check when Qdrant connection fails."""
        mock_qdrant_client_cls.return_value = self.mock_client
        self.mock_client.get_collections.side_effect = Exception("Connection refused")

        service = VectorStoreService(host="localhost", port=6333)
        self.assertFalse(service.health_check())

    @patch("app.ai.vector_store.QdrantClient")
    def test_list_collections(self, mock_qdrant_client_cls):
        """Test listing collection names."""
        mock_qdrant_client_cls.return_value = self.mock_client

        col1 = MagicMock()
        col1.name = "collection_1"
        col2 = MagicMock()
        col2.name = "collection_2"

        response = MagicMock()
        response.collections = [col1, col2]
        self.mock_client.get_collections.return_value = response

        service = VectorStoreService(host="localhost", port=6333)
        collections = service.list_collections()

        self.assertEqual(collections, ["collection_1", "collection_2"])

    @patch("app.ai.vector_store.QdrantClient")
    def test_ensure_collection_new(self, mock_qdrant_client_cls):
        """Test creating a new collection when it does not exist with vector size 384 and COSINE distance."""
        mock_qdrant_client_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = False

        service = VectorStoreService(host="localhost", port=6333)
        result = service.ensure_collection("code_chunks", vector_size=384)

        self.assertTrue(result)
        self.mock_client.collection_exists.assert_called_once_with(collection_name="code_chunks")
        self.mock_client.create_collection.assert_called_once()

        _, kwargs = self.mock_client.create_collection.call_args
        self.assertEqual(kwargs["collection_name"], "code_chunks")
        vectors_config = kwargs["vectors_config"]
        self.assertIsInstance(vectors_config, VectorParams)
        self.assertEqual(vectors_config.size, 384)
        self.assertEqual(vectors_config.distance, Distance.COSINE)

    @patch("app.ai.vector_store.QdrantClient")
    def test_ensure_collection_already_exists(self, mock_qdrant_client_cls):
        """Test ensure_collection when collection already exists."""
        mock_qdrant_client_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = True

        service = VectorStoreService(host="localhost", port=6333)
        result = service.ensure_collection("code_chunks", vector_size=384)

        self.assertTrue(result)
        self.mock_client.collection_exists.assert_called_once_with(collection_name="code_chunks")
        self.mock_client.create_collection.assert_not_called()

    @patch("app.ai.vector_store.QdrantClient")
    def test_ensure_collection_custom_params(self, mock_qdrant_client_cls):
        """Test ensure_collection with custom vector size and distance metric."""
        mock_qdrant_client_cls.return_value = self.mock_client
        self.mock_client.collection_exists.return_value = False

        service = VectorStoreService(host="localhost", port=6333)
        result = service.ensure_collection("custom_col", vector_size=512, distance=Distance.EUCLID)

        self.assertTrue(result)
        _, kwargs = self.mock_client.create_collection.call_args
        self.assertEqual(kwargs["collection_name"], "custom_col")
        self.assertEqual(kwargs["vectors_config"].size, 512)
        self.assertEqual(kwargs["vectors_config"].distance, Distance.EUCLID)


if __name__ == "__main__":
    unittest.main()
