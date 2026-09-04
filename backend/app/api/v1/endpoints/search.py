"""Semantic search API endpoints."""

import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.services.semantic_search_service import SemanticSearchService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SemanticSearchResponse)
@router.post("/semantic-search", response_model=SemanticSearchResponse, include_in_schema=False)
def semantic_search(request: SemanticSearchRequest) -> SemanticSearchResponse:
    """Execute semantic code search across indexed code chunks.

    Given a natural language query, generates an embedding, searches Qdrant
    for the most semantically relevant code chunks, and returns them ordered
    by similarity score.
    """
    service = SemanticSearchService()
    try:
        return service.search(
            query=request.query,
            limit=request.limit,
            project_id=request.project_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("Semantic search failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during semantic search: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during semantic search: {str(error)}",
        ) from error
