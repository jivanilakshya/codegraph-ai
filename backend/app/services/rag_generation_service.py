"""RAG Generation Service.

Coordinates context retrieval via RAGRetrievalService, system prompt construction,
and LLM completion generation via LLMService for code question answering.
"""

import logging
from typing import Optional

from app.schemas.rag import RAGGenerationResponse
from app.services.llm_service import LLMService
from app.services.rag_retrieval_service import RAGRetrievalService

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are a codebase analysis assistant. Answer the user's question using the supplied "
    "retrieved code context. Prefer information directly supported by the supplied code. "
    "Do not invent files, functions, classes, APIs, or behavior. If the retrieved context "
    "does not contain enough information, clearly say so. Mention relevant file paths and "
    "line ranges when supported by the context. Keep the answer clear and technically accurate."
)

NO_RESULT_PROMPT_INSTRUCTION = (
    "No relevant code was retrieved from the codebase for this query. Do not invent "
    "project-specific information. Explain that there is insufficient retrieved context "
    "if the question requires project-specific knowledge."
)


class RAGGenerationService:
    """Service to orchestrate RAG retrieval and Qwen LLM answer generation."""

    def __init__(
        self,
        rag_retrieval_service: Optional[RAGRetrievalService] = None,
        llm_service: Optional[LLMService] = None,
    ):
        """Initialize the RAGGenerationService.

        Args:
            rag_retrieval_service: Optional RAGRetrievalService instance for dependency injection.
            llm_service: Optional LLMService instance for dependency injection.
        """
        self.rag_retrieval_service = rag_retrieval_service or RAGRetrievalService()
        self.llm_service = llm_service or LLMService()

    def generate_answer(
        self,
        query: str,
        project_id: Optional[int] = None,
        top_k: int = 5,
        similarity_threshold: Optional[float] = None,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> RAGGenerationResponse:
        """Retrieve relevant code context and generate an answer using the Qwen LLM.

        Flow:
            1. Validate query string.
            2. Retrieve relevant code chunks via RAGRetrievalService.
            3. Construct a clear prompt envelope for Qwen.
            4. Send prompt to LLMService.
            5. Return RAGGenerationResponse containing answer, sources, and context.

        Args:
            query: User's natural language question.
            project_id: Optional project ID to scope vector search.
            top_k: Maximum number of relevant code chunks to retrieve (1-20, default: 5).
            similarity_threshold: Minimum similarity threshold (0.0-1.0).
            model: Optional model override (defaults to configured model).
            system_prompt: Optional custom system prompt instructions.

        Returns:
            RAGGenerationResponse with generated answer, model metadata, source chunks, and context.

        Raises:
            ValueError: If query or parameters are invalid.
            RuntimeError: If RAG retrieval or LLM generation fails.
        """
        if not query or not isinstance(query, str) or not query.strip():
            raise ValueError("Query string cannot be empty or contain only whitespace.")

        clean_query = query.strip()
        logger.info(
            "Starting RAG generation pipeline for query '%s' (project_id=%s, top_k=%d)",
            clean_query,
            project_id,
            top_k,
        )

        # 1. Perform RAG retrieval via existing Step 5 RAGRetrievalService
        retrieval_response = self.rag_retrieval_service.retrieve(
            query=clean_query,
            top_k=top_k,
            project_id=project_id,
            similarity_threshold=similarity_threshold,
        )

        # 2. Build prompt for Qwen LLM
        base_instruction = (
            system_prompt.strip()
            if (system_prompt and isinstance(system_prompt, str) and system_prompt.strip())
            else DEFAULT_SYSTEM_PROMPT
        )

        if retrieval_response.total_results == 0:
            system_section = f"{base_instruction}\n\nNOTE: {NO_RESULT_PROMPT_INSTRUCTION}"
        else:
            system_section = base_instruction

        full_prompt = (
            f"SYSTEM INSTRUCTIONS:\n{system_section}\n\n"
            f"{retrieval_response.context}"
        )

        # 3. Call existing Step 6.1 LLMService
        llm_response = self.llm_service.generate(
            prompt=full_prompt,
            model=model,
        )

        logger.info(
            "RAG generation pipeline completed for query '%s' using model '%s'",
            clean_query,
            llm_response.model,
        )

        # 4. Return structured response
        return RAGGenerationResponse(
            query=clean_query,
            project_id=project_id,
            answer=llm_response.response,
            model=llm_response.model,
            total_chunks=retrieval_response.total_results,
            sources=retrieval_response.results,
            context=retrieval_response.context,
        )
