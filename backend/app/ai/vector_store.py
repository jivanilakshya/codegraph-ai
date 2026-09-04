"""Qdrant vector store service for backend connection and collection management."""

import logging
import os
from typing import Any, List, Optional, Sequence

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    ScoredPoint,
    VectorParams,
)

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing connection to Qdrant vector database and collection lifecycle."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        timeout: float = 10.0,
    ):
        """Initialize VectorStoreService.

        Args:
            host: Qdrant server hostname. If not provided, reads QDRANT_HOST env or defaults to 'qdrant'.
            port: Qdrant server port. If not provided, reads QDRANT_PORT env or defaults to 6333.
            timeout: Connection timeout in seconds.
        """
        self.host = host or os.getenv("QDRANT_HOST", "qdrant")
        
        if port is not None:
            self.port = port
        else:
            env_port = os.getenv("QDRANT_PORT", "6333")
            try:
                self.port = int(env_port)
            except ValueError:
                logger.warning("Invalid QDRANT_PORT '%s' in env, falling back to 6333", env_port)
                self.port = 6333

        self.timeout = timeout
        self._client: Optional[QdrantClient] = None

    @property
    def client(self) -> QdrantClient:
        """Get or initialize the QdrantClient instance."""
        if self._client is None:
            logger.info("Initializing Qdrant client at %s:%d...", self.host, self.port)
            self._client = QdrantClient(host=self.host, port=self.port, timeout=self.timeout)
        return self._client

    def health_check(self) -> bool:
        """Check if Qdrant service is reachable and healthy.

        Returns:
            True if Qdrant is reachable and healthy, False otherwise.
        """
        try:
            self.client.get_collections()
            logger.info("Qdrant health check successful.")
            return True
        except Exception as e:
            logger.error("Qdrant health check failed: %s", str(e))
            return False

    def list_collections(self) -> List[str]:
        """List all collection names in Qdrant.

        Returns:
            List of collection names as strings.
        """
        try:
            result = self.client.get_collections()
            collection_names = [col.name for col in result.collections]
            logger.info("Found %d collections: %s", len(collection_names), collection_names)
            return collection_names
        except Exception as e:
            logger.error("Failed to list Qdrant collections: %s", str(e))
            raise RuntimeError(f"Could not list collections: {e}") from e

    def collection_exists(self, collection_name: str) -> bool:
        """Check if a specific collection exists in Qdrant.

        Args:
            collection_name: Name of the collection to check.

        Returns:
            True if collection exists, False otherwise.
        """
        try:
            return self.client.collection_exists(collection_name=collection_name)
        except Exception as e:
            logger.error("Error checking existence of collection '%s': %s", collection_name, str(e))
            raise RuntimeError(f"Failed to check collection existence: {e}") from e

    def ensure_collection(
        self,
        collection_name: str,
        vector_size: int = 384,
        distance: Distance = Distance.COSINE,
    ) -> bool:
        """Ensure that a collection with specified parameters exists.

        If the collection does not exist, it will be created using the specified vector size
        and distance metric. If it already exists, returns successfully without modifying it.

        Args:
            collection_name: Name of the Qdrant collection.
            vector_size: Dimensionality of vector embeddings (default: 384).
            distance: Vector distance metric (default: Distance.COSINE).

        Returns:
            True if collection exists or was created successfully.
        """
        try:
            if self.collection_exists(collection_name):
                logger.info("Collection '%s' already exists.", collection_name)
                return True

            logger.info(
                "Creating collection '%s' (vector_size=%d, distance=%s)...",
                collection_name,
                vector_size,
                distance,
            )
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=distance),
            )
            logger.info("Collection '%s' created successfully.", collection_name)
            return True
        except Exception as e:
            logger.error("Failed to ensure collection '%s': %s", collection_name, str(e))
            raise RuntimeError(f"Could not ensure collection '{collection_name}': {e}") from e

    def search(
        self,
        query_vector: List[float],
        limit: int = 5,
        collection_name: Optional[str] = None,
        project_id: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> List[ScoredPoint]:
        """Search for semantically similar vectors in Qdrant.

        Args:
            query_vector: Dense embedding vector representing the search query.
            limit: Maximum number of search results to return (default: 5).
            collection_name: Target collection name. If not provided, defaults to
                QDRANT_COLLECTION environment variable or 'code_chunks'.
            project_id: Optional project ID to filter vectors by metadata payload.
            score_threshold: Optional minimum similarity score threshold.

        Returns:
            List of ScoredPoint objects ordered by similarity score descending.

        Raises:
            RuntimeError: If search fails or the collection cannot be queried.
        """
        target_collection = collection_name or os.getenv("QDRANT_COLLECTION", "code_chunks")
        try:
            query_filter = None
            if project_id is not None:
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="project_id",
                            match=MatchValue(value=project_id),
                        )
                    ]
                )

            # Check if collection exists before querying to return empty list instead of failing
            if not self.collection_exists(target_collection):
                logger.warning("Collection '%s' does not exist in Qdrant.", target_collection)
                return []

            search_kwargs: dict[str, Any] = {
                "collection_name": target_collection,
                "query": query_vector,
                "limit": limit,
                "query_filter": query_filter,
                "with_payload": True,
            }
            if score_threshold is not None:
                search_kwargs["score_threshold"] = score_threshold

            response = self.client.query_points(**search_kwargs)
            results = (
                response.points
                if hasattr(response, "points")
                else (response if isinstance(response, list) else [])
            )
            logger.info(
                "Retrieved %d search results from collection '%s'",
                len(results),
                target_collection,
            )
            return results
        except Exception as e:
            logger.error("Failed to search Qdrant collection '%s': %s", target_collection, str(e))
            raise RuntimeError(f"Qdrant search failed: {e}") from e

    def upsert_points(
        self,
        points: Sequence[Any],
        collection_name: Optional[str] = None,
    ) -> bool:
        """Upsert points into a Qdrant collection.

        Args:
            points: Sequence of PointStruct or similar point objects to insert.
            collection_name: Target collection name. If not provided, defaults to
                QDRANT_COLLECTION environment variable or 'code_chunks'.

        Returns:
            True if upsert succeeded.

        Raises:
            RuntimeError: If upsert fails.
        """
        target_collection = collection_name or os.getenv("QDRANT_COLLECTION", "code_chunks")
        try:
            self.client.upsert(collection_name=target_collection, points=points)
            logger.info("Upserted %d points to collection '%s'", len(points), target_collection)
            return True
        except Exception as e:
            logger.error("Failed to upsert points into '%s': %s", target_collection, str(e))
            raise RuntimeError(f"Qdrant upsert failed: {e}") from e

    def delete_project_vectors(
        self,
        project_id: int,
        collection_name: Optional[str] = None,
    ) -> bool:
        """Delete all vectors belonging to a specific project from Qdrant.

        Args:
            project_id: The ID of the project whose vectors should be removed.
            collection_name: Target collection name.

        Returns:
            True if deletion succeeded or collection does not exist.
        """
        target_collection = collection_name or os.getenv("QDRANT_COLLECTION", "code_chunks")
        try:
            if not self.collection_exists(target_collection):
                return True

            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="project_id",
                        match=MatchValue(value=project_id),
                    )
                ]
            )
            self.client.delete(
                collection_name=target_collection,
                points_selector=FilterSelector(filter=query_filter),
            )
            logger.info("Deleted existing vectors for project %d from '%s'", project_id, target_collection)
            return True
        except Exception as e:
            logger.error("Failed to delete vectors for project %d from '%s': %s", project_id, target_collection, str(e))
            raise RuntimeError(f"Qdrant delete failed: {e}") from e


