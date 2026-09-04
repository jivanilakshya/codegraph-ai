"""Semantic search service coordinating embedding generation and vector similarity search."""

import logging
import os
from typing import Optional

from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import VectorStoreService
from app.schemas.search import (
    SemanticSearchResult,
    SemanticSearchResponse,
)

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """Service to execute semantic similarity searches against indexed code chunks."""

    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store_service: Optional[VectorStoreService] = None,
        collection_name: Optional[str] = None,
    ):
        """Initialize the SemanticSearchService with embedding and vector store dependencies.

        Args:
            embedding_service: Service to generate dense vector embeddings.
            vector_store_service: Service to interact with the Qdrant vector store.
            collection_name: Optional collection name override.
        """
        self.embedding_service = embedding_service or EmbeddingService()
        self.vector_store_service = vector_store_service or VectorStoreService()
        self.collection_name = collection_name or os.getenv("QDRANT_COLLECTION", "code_chunks")

    def search(
        self,
        query: str,
        limit: int = 5,
        project_id: Optional[int] = None,
    ) -> SemanticSearchResponse:
        """Perform semantic similarity search for a query.

        Flow:
            1. Validate query string and limit.
            2. Generate embedding vector using EmbeddingService.
            3. Search Qdrant vector database via VectorStoreService.
            4. Format and return matched code chunks with similarity score and metadata.

        Args:
            query: Natural language search query.
            limit: Maximum number of results to return (default: 5).
            project_id: Optional project ID to filter results.

        Returns:
            SemanticSearchResponse containing matched chunks and metadata.

        Raises:
            ValueError: If query is empty or limit is invalid.
            RuntimeError: If embedding generation or vector search fails.
        """
        if not query or not isinstance(query, str) or not query.strip():
            raise ValueError("Query string cannot be empty or contain only whitespace.")

        if limit <= 0:
            raise ValueError("Limit must be a positive integer.")

        clean_query = query.strip()
        logger.info(
            "Executing semantic search for query '%s' (limit=%d, project_id=%s)",
            clean_query,
            limit,
            project_id,
        )

        # 1. Generate query embedding
        try:
            query_vector = self.embedding_service.embed_text(clean_query)
        except Exception as e:
            logger.error("Embedding generation failed for query '%s': %s", clean_query, str(e))
            raise RuntimeError(f"Failed to generate query embedding: {e}") from e

        # 2. Search Qdrant vector database
        try:
            scored_points = self.vector_store_service.search(
                query_vector=query_vector,
                limit=limit,
                collection_name=self.collection_name,
                project_id=project_id,
            )
        except Exception as e:
            logger.error("Vector store search failed for query '%s': %s", clean_query, str(e))
            raise RuntimeError(f"Vector search failed: {e}") from e

        # 3. Format results
        results = []
        for point in scored_points:
            payload = point.payload or {}

            # Handle both nested and flat payload conventions
            if "metadata" in payload and isinstance(payload["metadata"], dict):
                metadata = dict(payload["metadata"])
                content = (
                    payload.get("content")
                    or payload.get("text")
                    or payload.get("code")
                    or metadata.get("content")
                    or metadata.get("text")
                    or metadata.get("code")
                    or ""
                )
            else:
                content = (
                    payload.get("content")
                    or payload.get("text")
                    or payload.get("code")
                    or ""
                )
                metadata = {
                    k: v for k, v in payload.items() if k not in ("content", "text", "code")
                }

            results.append(
                SemanticSearchResult(
                    score=float(point.score),
                    content=str(content),
                    metadata=metadata,
                )
            )

        logger.info(
            "Semantic search completed for query '%s': returned %d results",
            clean_query,
            len(results),
        )

        return SemanticSearchResponse(
            query=clean_query,
            total_results=len(results),
            results=results,
        )
