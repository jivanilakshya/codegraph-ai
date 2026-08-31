"""Embedding service for generating dense vector representations of code chunks."""

import logging
import os
import torch
from typing import List, Sequence, Union
from pydantic import BaseModel

from app.schemas.chunk import CodeChunk

logger = logging.getLogger(__name__)


class ChunkEmbedding(BaseModel):
    """A semantic code chunk paired with its embedding vector."""
    chunk: CodeChunk
    embedding: List[float]


class EmbeddingService:
    """Service to load an embedding model and generate embeddings for text and code chunks."""

    def __init__(
        self,
        model_name: str | None = None,
        batch_size: int | None = None,
        device: str | None = None,
    ):
        """Initialize the EmbeddingService.

        Args:
            model_name: Optional name of the model to use. If not specified,
                loaded from the EMBEDDING_MODEL environment variable, defaulting to
                'BAAI/bge-small-en-v1.5'.
            batch_size: Optional batch size for encoding. If not specified,
                loaded from the EMBEDDING_BATCH_SIZE environment variable, defaulting to 32.
            device: Optional torch device string ('cuda', 'cpu', 'mps'). If not specified,
                automatically determined based on hardware availability.
        """
        self._model_name = model_name or os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        
        # Read batch size from environment or use default
        env_batch_size = os.getenv("EMBEDDING_BATCH_SIZE", "32")
        try:
            self._batch_size = batch_size or int(env_batch_size)
        except ValueError:
            logger.warning(
                "Invalid EMBEDDING_BATCH_SIZE '%s' in env, falling back to 32",
                env_batch_size
            )
            self._batch_size = 32

        # Device determination
        if device:
            self._device = device
        else:
            if torch.cuda.is_available():
                self._device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self._device = "mps"
            else:
                self._device = "cpu"

        self._model = None  # Loaded lazily

    @property
    def model_name(self) -> str:
        """Get the name of the embedding model."""
        return self._model_name

    @property
    def batch_size(self) -> int:
        """Get the configured batch size."""
        return self._batch_size

    @property
    def device(self) -> str:
        """Get the device on which the model is running."""
        return self._device

    @property
    def embedding_dim(self) -> int:
        """Get the dimension of the embedding vectors produced by this model."""
        model = self._get_model()
        # SentenceTransformer models have a get_embedding_dimension method
        return int(model.get_embedding_dimension())

    def _get_model(self):
        """Lazy-load and return the SentenceTransformer model instance."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(
                    "Loading SentenceTransformer model '%s' on device '%s'...",
                    self._model_name,
                    self._device,
                )
                self._model = SentenceTransformer(self._model_name, device=self._device)
                logger.info("Embedding model loaded successfully.")
            except Exception as e:
                logger.error("Failed to load embedding model '%s': %s", self._model_name, str(e))
                raise RuntimeError(f"Could not load embedding model: {e}") from e
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """Generate a single embedding vector for the given text.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.

        Raises:
            ValueError: If the input text is empty or invalid.
        """
        if not text or not isinstance(text, str) or not text.strip():
            raise ValueError("Input text must be a non-empty string.")

        model = self._get_model()
        try:
            # We encode a list containing the single text and extract the first result
            embeddings = model.encode(
                [text],
                normalize_embeddings=True,
                show_progress_bar=False,
                device=self._device,
            )
            return embeddings[0].tolist()
        except Exception as e:
            logger.error("Error generating embedding for text: %s", str(e))
            raise RuntimeError(f"Embedding generation failed: {e}") from e

    def embed_chunks(
        self,
        chunks: Sequence[CodeChunk],
        batch_size: int | None = None,
    ) -> List[ChunkEmbedding]:
        """Generate embeddings for a sequence of CodeChunks in batches.

        Args:
            chunks: Sequence of CodeChunk objects to embed.
            batch_size: Optional batch size to override the default.

        Returns:
            A list of ChunkEmbedding objects containing the original chunk and its embedding.
        """
        if not chunks:
            return []

        effective_batch_size = batch_size or self._batch_size
        model = self._get_model()

        # Extract contents to encode, handling empty contents gracefully by returning a zero-vector
        # or logging warning and skipping.
        # We must keep index alignment between input chunks and returned ChunkEmbeddings.
        texts = []
        valid_indices = []
        
        for idx, chunk in enumerate(chunks):
            content = chunk.content
            if content and content.strip():
                texts.append(content)
                valid_indices.append(idx)
            else:
                logger.warning("Skipping empty or whitespace-only chunk at index %d", idx)

        # Initialize results list with empty embeddings
        results = [
            ChunkEmbedding(chunk=chunk, embedding=[]) for chunk in chunks
        ]

        if not texts:
            return results

        try:
            embeddings = model.encode(
                texts,
                batch_size=effective_batch_size,
                normalize_embeddings=True,
                show_progress_bar=False,
                device=self._device,
            )

            # Map the generated embeddings back to the original indices
            for raw_idx, emb in enumerate(embeddings):
                orig_idx = valid_indices[raw_idx]
                results[orig_idx].embedding = emb.tolist()

        except Exception as e:
            logger.error("Error batch generating embeddings: %s", str(e))
            raise RuntimeError(f"Batch embedding generation failed: {e}") from e

        return results
