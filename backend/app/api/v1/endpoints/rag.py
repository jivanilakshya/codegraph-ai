"""RAG retrieval API endpoints."""

import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.rag import (
    RAGGenerationRequest,
    RAGGenerationResponse,
    RAGRetrievalRequest,
    RAGRetrievalResponse,
)
from app.services.rag_generation_service import RAGGenerationService
from app.services.rag_retrieval_service import RAGRetrievalService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/retrieve", response_model=RAGRetrievalResponse)
def retrieve_rag_context(request: RAGRetrievalRequest) -> RAGRetrievalResponse:
    """Retrieve relevant code context and format prompt for RAG.

    Given a natural language query, performs semantic search over indexed code chunks,
    applies score thresholds, deduplicates identical code chunks, preserves metadata,
    and returns both structured results and a formatted context prompt.
    """
    service = RAGRetrievalService()
    try:
        return service.retrieve(
            query=request.query,
            top_k=request.top_k,
            project_id=request.project_id,
            similarity_threshold=request.similarity_threshold,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("RAG retrieval failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG retrieval service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during RAG retrieval: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during RAG retrieval: {str(error)}",
        ) from error


@router.post("/generate", response_model=RAGGenerationResponse)
def generate_rag_answer(request: RAGGenerationRequest) -> RAGGenerationResponse:
    """Retrieve relevant code context and generate a grounded answer using the Qwen LLM.

    Coordinates semantic code search, deduplication, context prompt construction,
    and completion generation via Ollama/Qwen.
    """
    service = RAGGenerationService()
    try:
        return service.generate_answer(
            query=request.query,
            project_id=request.project_id,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            model=request.model,
            system_prompt=request.system_prompt,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("RAG answer generation failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG generation service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during RAG answer generation: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during RAG generation: {str(error)}",
        ) from error

