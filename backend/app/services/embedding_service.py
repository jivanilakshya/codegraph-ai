"""Embedding service module for RAG pipeline.

Re-exports EmbeddingService and ChunkEmbedding for service layer accessibility.
"""

from app.ai.embeddings import ChunkEmbedding, EmbeddingService

__all__ = ["EmbeddingService", "ChunkEmbedding"]
