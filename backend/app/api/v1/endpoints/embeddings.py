"""Embeddings preview endpoints."""

import logging
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project
from app.ai.chunker import CodeChunker
from app.ai.embeddings import EmbeddingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["embeddings"])


class EmbeddingPreviewItem(BaseModel):
    """A preview of a chunk's metadata and a truncated version of its embedding vector."""
    file_path: str
    entity_type: str | None
    name: str | None
    start_line: int
    end_line: int
    content_preview: str
    embedding_preview: List[float]


class EmbeddingsPreviewResponse(BaseModel):
    """Response schema for the embedding preview endpoint."""
    project_id: int
    chunks_processed: int
    model_name: str
    embedding_dimension: int
    device: str
    preview_items: List[EmbeddingPreviewItem]


def _resolve_file_path(project: Project, file: File) -> Path | None:
    """Resolve a persisted file record to a safe absolute project path."""
    if project.local_path:
        base = Path(project.local_path)
    else:
        base = Path("/repositories")

    candidate = base / file.path
    if candidate.is_file():
        return candidate

    fallback = Path("/repositories") / file.path
    if fallback.is_file():
        return fallback

    return None


@router.post("/{project_id}/embeddings/preview", response_model=EmbeddingsPreviewResponse)
def preview_project_embeddings(
    project_id: int,
    limit: int = Query(default=5, ge=1, le=20, description="Number of chunks to embed for preview"),
) -> EmbeddingsPreviewResponse:
    """Generate and return embeddings for a limited preview of chunks in a project.

    This endpoint does not write or persist any embeddings. It operates in memory only.
    """
    try:
        with SessionLocal() as session:
            project = session.get(Project, project_id)
            if project is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Project with ID {project_id} not found."
                )

            files = session.query(File).filter(File.project_id == project_id).all()
            if not files:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Project {project_id} has no files."
                )

            # We need to chunk files first to find candidate chunks
            chunker = CodeChunker()
            all_candidate_chunks = []  # List of tuple (File, CodeChunk)

            for file in files:
                abs_path = _resolve_file_path(project, file)
                if abs_path is None:
                    continue
                try:
                    # Use default max_chars = 1000
                    chunks = chunker.chunk_file(abs_path, max_chars=1000)
                    for chunk in chunks:
                        all_candidate_chunks.append((file, chunk))
                except Exception as e:
                    logger.warning("Failed to chunk file %s: %s", file.path, str(e))

            total_chunks = len(all_candidate_chunks)
            if total_chunks == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid chunks could be generated for this project."
                )

            # Take the first `limit` chunks to generate embeddings
            preview_candidates = all_candidate_chunks[:limit]
            preview_chunks = [chunk for _, chunk in preview_candidates]

            # Generate embeddings
            embedding_service = EmbeddingService()
            chunk_embeddings = embedding_service.embed_chunks(preview_chunks)

            # Construct preview response
            preview_items = []
            for idx, (file, chunk) in enumerate(preview_candidates):
                emb = chunk_embeddings[idx].embedding
                # Truncate embedding to first 10 values for the preview
                truncated_emb = emb[:10] if emb else []
                
                content_preview = chunk.content[:200]
                if len(chunk.content) > 200:
                    content_preview += "..."

                preview_items.append(
                    EmbeddingPreviewItem(
                        file_path=file.path,
                        entity_type=chunk.entity_type,
                        name=chunk.name,
                        start_line=chunk.start_line,
                        end_line=chunk.end_line,
                        content_preview=content_preview,
                        embedding_preview=truncated_emb
                    )
                )

            return EmbeddingsPreviewResponse(
                project_id=project_id,
                chunks_processed=total_chunks,
                model_name=embedding_service.model_name,
                embedding_dimension=embedding_service.embedding_dim,
                device=embedding_service.device,
                preview_items=preview_items
            )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error("Database error in project embeddings preview: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve project information."
        ) from e
    except Exception as e:
        logger.error("Failed to generate embedding preview: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding preview generation failed: {e}"
        ) from e
