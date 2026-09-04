"""Vector indexing service to chunk, embed, and store project source files into Qdrant."""

import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from qdrant_client.models import PointStruct
from sqlalchemy.exc import SQLAlchemyError

from app.ai.chunker import CodeChunker
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import VectorStoreService
from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.schemas.chunk import CodeChunk

logger = logging.getLogger(__name__)


IGNORED_INDEXING_FILENAMES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "pipfile.lock",
    "composer.lock",
    "cargo.lock",
}

IGNORED_INDEXING_EXTENSIONS = {
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".map",
    ".min.js",
    ".min.css",
    ".lock",
}


class VectorIndexingError(Exception):
    """Base exception for vector indexing failures."""


class VectorIndexingService:
    """Service to chunk project files, generate dense embeddings, and persist vectors in Qdrant."""

    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store_service: Optional[VectorStoreService] = None,
        chunker: Optional[CodeChunker] = None,
        collection_name: Optional[str] = None,
    ):
        self.embedding_service = embedding_service or EmbeddingService()
        self.vector_store_service = vector_store_service or VectorStoreService()
        self.chunker = chunker or CodeChunker()
        self.collection_name = collection_name or os.getenv("QDRANT_COLLECTION", "code_chunks")

    def index_project(
        self,
        project_id: int,
        batch_size: int = 32,
    ) -> Dict[str, Any]:
        """Chunk, embed, and store all files for a given project into Qdrant.

        Args:
            project_id: The ID of the project to index.
            batch_size: Batch size for generating embeddings and upserting points.

        Returns:
            Dict containing indexing statistics (files_scanned, chunks_created, vectors_indexed).

        Raises:
            VectorIndexingError: If project is not found or vector indexing fails.
        """
        logger.info("[INDEX] Starting vector indexing for project %s", project_id)

        # 1. Retrieve project and file records from PostgreSQL
        try:
            with SessionLocal() as session:
                project = session.get(Project, project_id)
                if project is None:
                    raise VectorIndexingError(f"Project with ID {project_id} not found.")

                files = session.query(File).filter(File.project_id == project_id).all()
                if not files:
                    logger.warning("[INDEX] Project %s has no files registered in database.", project_id)
                    return {
                        "project_id": project_id,
                        "files_scanned": 0,
                        "chunks_created": 0,
                        "vectors_indexed": 0,
                    }

                file_records = [(f.id, f.path, f.language) for f in files]
                local_path = project.local_path

        except SQLAlchemyError as error:
            logger.exception("Database error while loading project %s files for vector indexing", project_id)
            raise VectorIndexingError(f"Could not load project {project_id} files: {error}") from error

        # 2. Ensure Qdrant collection is ready
        try:
            vector_dim = self.embedding_service.embedding_dim
            self.vector_store_service.ensure_collection(
                collection_name=self.collection_name,
                vector_size=vector_dim,
            )
        except Exception as error:
            logger.exception("Failed to verify/create Qdrant collection '%s'", self.collection_name)
            raise VectorIndexingError(f"Failed to ensure Qdrant collection '{self.collection_name}': {error}") from error

        # 3. Clean up existing vectors for this project to maintain idempotency
        try:
            self.vector_store_service.delete_project_vectors(
                project_id=project_id,
                collection_name=self.collection_name,
            )
        except Exception as error:
            logger.warning("Failed to clear previous vectors for project %s: %s", project_id, str(error))

        # 4. Resolve file paths and generate code chunks
        base_dir = Path(local_path).resolve() if local_path else Path("/repositories")
        all_chunks: List[Tuple[str, Optional[str], CodeChunk, int]] = []
        files_scanned = 0

        for file_id, rel_path, language in file_records:
            file_name = Path(rel_path).name.lower()
            file_ext = Path(rel_path).suffix.lower()
            if file_name in IGNORED_INDEXING_FILENAMES or file_ext in IGNORED_INDEXING_EXTENSIONS:
                continue

            candidate = base_dir / rel_path
            if not candidate.is_file():
                fallback = Path("/repositories") / rel_path
                if fallback.is_file():
                    candidate = fallback
                else:
                    logger.debug("Skipping unresolvable file path: %s", rel_path)
                    continue

            files_scanned += 1
            try:
                chunks = self.chunker.chunk_file(candidate, max_chars=1000)
                for idx, chunk in enumerate(chunks):
                    if chunk.content and chunk.content.strip():
                        all_chunks.append((rel_path, language, chunk, idx))
            except Exception as error:
                logger.warning("Failed to chunk file %s for project %s: %s", rel_path, project_id, str(error))

        logger.info(
            "[INDEX] Project %s: Scanned %d files, generated %d code chunks",
            project_id,
            files_scanned,
            len(all_chunks),
        )

        if not all_chunks:
            logger.info("[INDEX] Project %s: No valid code chunks to embed.", project_id)
            return {
                "project_id": project_id,
                "files_scanned": files_scanned,
                "chunks_created": 0,
                "vectors_indexed": 0,
            }

        # 5. Generate embeddings in batches
        raw_chunks = [item[2] for item in all_chunks]
        try:
            logger.info(
                "[INDEX] Generating embeddings for %d chunks (model: %s, batch_size=%d)...",
                len(raw_chunks),
                self.embedding_service.model_name,
                batch_size,
            )
            chunk_embeddings = self.embedding_service.embed_chunks(raw_chunks, batch_size=batch_size)
        except Exception as error:
            logger.exception("Failed to embed code chunks for project %s", project_id)
            raise VectorIndexingError(f"Embedding generation failed: {error}") from error

        # 6. Build PointStruct records with deterministic UUIDs and comprehensive payload metadata
        points: List[PointStruct] = []
        for i, (rel_path, language, chunk, chunk_idx) in enumerate(all_chunks):
            embedding_vector = chunk_embeddings[i].embedding
            if not embedding_vector:
                continue

            # Deterministic UUID5 prevents duplicates and ensures point stability across rescans
            point_id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    f"codegraph:project_{project_id}:{rel_path}:{chunk_idx}:{chunk.start_line}_{chunk.end_line}",
                )
            )

            metadata_dict = {
                "project_id": project_id,
                "file_path": rel_path,
                "language": language or "",
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "start_byte": chunk.start_byte,
                "end_byte": chunk.end_byte,
                "name": chunk.name or "",
                "entity_type": chunk.entity_type or "",
            }

            payload = {
                **metadata_dict,
                "content": chunk.content,
                "metadata": metadata_dict,
            }

            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding_vector,
                    payload=payload,
                )
            )

        # 7. Upsert vectors into Qdrant collection in batches
        total_vectors_indexed = 0
        upsert_batch_size = 64
        try:
            for i in range(0, len(points), upsert_batch_size):
                batch = points[i : i + upsert_batch_size]
                self.vector_store_service.upsert_points(batch, collection_name=self.collection_name)
                total_vectors_indexed += len(batch)

            logger.info(
                "[INDEX] Project %s successfully indexed: %d files scanned, %d code chunks created, %d vectors inserted into Qdrant collection '%s'",
                project_id,
                files_scanned,
                len(all_chunks),
                total_vectors_indexed,
                self.collection_name,
            )
        except Exception as error:
            logger.exception("Failed to upsert points into Qdrant for project %s", project_id)
            raise VectorIndexingError(f"Qdrant vector upsert failed: {error}") from error

        return {
            "project_id": project_id,
            "files_scanned": files_scanned,
            "chunks_created": len(all_chunks),
            "vectors_indexed": total_vectors_indexed,
        }
