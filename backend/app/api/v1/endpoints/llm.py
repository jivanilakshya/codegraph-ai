"""LLM text generation API endpoints."""

import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.llm import LLMGenerateRequest, LLMGenerateResponse
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])


@router.post("/generate", response_model=LLMGenerateResponse)
def generate_text(request: LLMGenerateRequest) -> LLMGenerateResponse:
    """Generate text completion using the configured Ollama LLM service."""
    service = LLMService()
    try:
        return service.generate(
            prompt=request.prompt,
            model=request.model,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("LLM generation failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during LLM generation: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during LLM generation: {str(error)}",
        ) from error
