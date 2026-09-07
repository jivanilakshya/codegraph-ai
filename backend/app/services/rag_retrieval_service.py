"""RAG (Retrieval-Augmented Generation) retrieval service.

Coordinates semantic code search, result filtering, deduplication, metadata preservation,
and structured context formatting for downstream LLM generation.
"""

import logging
from typing import List, Optional, Set, Tuple

from app.schemas.rag import RAGChunkResult, RAGRetrievalResponse
from app.services.semantic_search_service import SemanticSearchService

logger = logging.getLogger(__name__)


class RAGRetrievalService:
    """Service to retrieve, filter, and format relevant code context for RAG pipelines."""

    def __init__(
        self,
        semantic_search_service: Optional[SemanticSearchService] = None,
        default_similarity_threshold: float = 0.0,
    ):
        """Initialize the RAGRetrievalService.

        Args:
            semantic_search_service: Optional SemanticSearchService instance for dependency injection.
            default_similarity_threshold: Default minimum similarity score threshold (0.0 means no minimum).
        """
        self.semantic_search_service = semantic_search_service or SemanticSearchService()
        self.default_similarity_threshold = default_similarity_threshold

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        project_id: Optional[int] = None,
        similarity_threshold: Optional[float] = None,
    ) -> RAGRetrievalResponse:
        """Retrieve the most relevant code chunks for a user query, deduplicate, and format context.

        Flow:
            1. Validate query string and top_k parameters.
            2. Call existing SemanticSearchService with the specified project_id and limit.
            3. Preserve all structured chunk metadata (file_path, lines, bytes, language, entity, score, content).
            4. Filter out chunks falling below the similarity score threshold.
            5. Deduplicate exact duplicate code chunks while maintaining relevance order.
            6. Limit to top_k results.
            7. Construct structured RAG context prompt.

        Args:
            query: Natural language question or search query.
            top_k: Maximum number of relevant code chunks to return (1-20, default: 5).
            project_id: Optional project ID to restrict search.
            similarity_threshold: Optional minimum cosine similarity threshold (default: self.default_similarity_threshold).

        Returns:
            RAGRetrievalResponse with structured results and formatted context string.

        Raises:
            ValueError: If query or parameters are invalid.
            RuntimeError: If semantic search or vector retrieval fails.
        """
        if not query or not isinstance(query, str) or not query.strip():
            raise ValueError("Query string cannot be empty or contain only whitespace.")

        if top_k < 1 or top_k > 20:
            raise ValueError(f"top_k must be between 1 and 20, got {top_k}.")

        effective_threshold = (
            similarity_threshold
            if similarity_threshold is not None
            else self.default_similarity_threshold
        )
        if effective_threshold < 0.0 or effective_threshold > 1.0:
            raise ValueError(
                f"similarity_threshold must be between 0.0 and 1.0, got {effective_threshold}."
            )

        clean_query = query.strip()
        logger.info(
            "Executing RAG retrieval for query '%s' (top_k=%d, project_id=%s, min_score=%.2f)",
            clean_query,
            top_k,
            project_id,
            effective_threshold,
        )

        # 1. Fetch search results from existing SemanticSearchService
        # Fetch up to top_k (or slightly more to account for threshold / duplicate filtering)
        fetch_limit = min(max(top_k * 2, top_k), 20)
        search_response = self.semantic_search_service.search(
            query=clean_query,
            limit=fetch_limit,
            project_id=project_id,
        )

        # 2. Extract and preserve metadata
        extracted_chunks: List[RAGChunkResult] = []
        for item in search_response.results:
            meta = item.metadata or {}

            file_path = meta.get("file_path")
            start_line = meta.get("start_line")
            end_line = meta.get("end_line")
            start_byte = meta.get("start_byte")
            end_byte = meta.get("end_byte")
            language = meta.get("language")
            entity_type = meta.get("entity_type")
            name = meta.get("name")
            proj_id = meta.get("project_id") or project_id

            chunk_result = RAGChunkResult(
                score=float(item.score),
                file_path=file_path,
                start_line=start_line,
                end_line=end_line,
                start_byte=start_byte,
                end_byte=end_byte,
                language=language,
                entity_type=entity_type,
                name=name,
                project_id=proj_id,
                content=item.content,
                metadata=meta,
            )
            extracted_chunks.append(chunk_result)

        # 3. Filter by similarity threshold & deduplicate while preserving relevance ordering
        seen_keys: Set[Tuple[Optional[str], Optional[int], Optional[int], str]] = set()
        filtered_chunks: List[RAGChunkResult] = []

        for chunk in extracted_chunks:
            # Check similarity threshold
            if chunk.score < effective_threshold:
                continue

            # Deduplication key based on file location and code content
            dedup_key = (
                chunk.file_path,
                chunk.start_line,
                chunk.end_line,
                chunk.content.strip(),
            )
            if dedup_key in seen_keys:
                continue

            seen_keys.add(dedup_key)
            filtered_chunks.append(chunk)

            if len(filtered_chunks) >= top_k:
                break

        # 4. Build structured RAG context string
        context_str = self.format_context(query=clean_query, chunks=filtered_chunks)

        logger.info(
            "RAG retrieval completed for query '%s': returning %d chunks",
            clean_query,
            len(filtered_chunks),
        )

        return RAGRetrievalResponse(
            query=clean_query,
            project_id=project_id,
            total_results=len(filtered_chunks),
            results=filtered_chunks,
            context=context_str,
        )

    def format_context(self, query: str, chunks: List[RAGChunkResult]) -> str:
        """Format retrieved code chunks into a clear, structured context string for LLM prompting.

        Args:
            query: The user's question or search query.
            chunks: List of relevant, filtered RAGChunkResult items.

        Returns:
            Formatted context string.
        """
        if not chunks:
            return f"QUESTION:\n{query}\n\nRELEVANT CODE:\nNo relevant code chunks found."

        chunk_blocks: List[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            file_str = chunk.file_path or "N/A"
            if chunk.start_line is not None and chunk.end_line is not None:
                lines_str = f"{chunk.start_line}-{chunk.end_line}"
            elif chunk.start_line is not None:
                lines_str = str(chunk.start_line)
            else:
                lines_str = "N/A"

            lang_str = chunk.language or "N/A"
            entity_str = chunk.entity_type or chunk.name or "code_block"
            score_str = f"{chunk.score:.2f}"

            block = (
                f"[{idx}]\n"
                f"File: {file_str}\n"
                f"Lines: {lines_str}\n"
                f"Language: {lang_str}\n"
                f"Entity: {entity_str}\n"
                f"Score: {score_str}\n\n"
                f"{chunk.content}"
            )
            chunk_blocks.append(block)

        relevant_code_section = "\n\n\n".join(chunk_blocks)
        return f"QUESTION:\n{query}\n\nRELEVANT CODE:\n\n{relevant_code_section}"
