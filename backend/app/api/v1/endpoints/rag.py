import json
import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.rag import (
    GraphRAGGenerationRequest,
    GraphRAGGenerationResponse,
    ImpactAnalysisRequest,
    ImpactAnalysisResponse,
    RAGExplanationRequest,
    RAGExplanationResponse,
    RAGGenerationRequest,
    RAGGenerationResponse,
    RAGAskRequest,
    RAGRetrievalRequest,
    RAGRetrievalResponse,
    RAGSearchRequest,
)
from app.services.code_explanation_service import CodeExplanationRAGService
from app.services.graph_rag_service import GraphRAGGenerationService
from app.services.impact_analysis_service import ImpactAnalysisRAGService
from app.services.rag_generation_service import RAGGenerationService
from app.services.rag_retrieval_service import RAGRetrievalService
from app.services.project_scope_service import ProjectNotFoundError, ProjectScopeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/ask", response_model=GraphRAGGenerationResponse)
def ask_codebase_question(request: RAGAskRequest) -> GraphRAGGenerationResponse:
    """Answer a project-scoped codebase question using Qdrant, Neo4j, and Qwen.

    This is the canonical end-to-end RAG endpoint. Lower-level retrieval and
    generation endpoints remain available for debugging and specialized use.
    """
    try:
        return GraphRAGGenerationService().generate_graph_answer(
            query=request.question,
            project_id=request.project_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("Canonical RAG question failed for project %s: %s", request.project_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not answer the question.",
        ) from error
    except Exception as error:
        logger.exception("Unexpected canonical RAG question failure for project %s", request.project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not answer the question.",
        ) from error


@router.post("/ask-stream")
def ask_codebase_question_stream(request: RAGAskRequest) -> StreamingResponse:
    """Stream a project-scoped codebase answer using Qdrant, Neo4j, and Qwen via SSE.

    Emits Server-Sent Events (text/event-stream) containing:
    - Initial metadata event: data: {"type": "metadata", "query": "...", "project_id": 1, ...}
    - Token events: data: {"type": "token", "content": "..."}
    - Completion event: data: {"type": "done"}
    - Error event (on mid-stream error): data: {"type": "error", "message": "..."}
    """
    project_scope_service = ProjectScopeService()
    try:
        project_scope_service.require_project(request.project_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    service = GraphRAGGenerationService()

    def event_stream():
        try:
            for event in service.stream_graph_events(
                query=request.question,
                project_id=request.project_id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except (RuntimeError, ValueError) as error:
            logger.error("RAG streaming error for project %s: %s", request.project_id, error)
            error_event = {"type": "error", "message": "Could not answer the question."}
            yield f"data: {json.dumps(error_event)}\n\n"
        except Exception:
            logger.exception("Unexpected RAG streaming failure for project %s", request.project_id)
            error_event = {"type": "error", "message": "Could not answer the question."}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/search", response_model=RAGRetrievalResponse)
@router.post("/retrieve", response_model=RAGRetrievalResponse)
def retrieve_rag_context(request: RAGRetrievalRequest) -> RAGRetrievalResponse:
    """Retrieve relevant code context and format prompt for RAG.

    Given a natural language query, performs semantic search over indexed code chunks,
    applies score thresholds and metadata filters, deduplicates identical code chunks,
    preserves metadata, and returns both structured results and a formatted context prompt.
    """
    service = RAGRetrievalService()
    try:
        return service.retrieve(
            query=request.query,
            top_k=request.top_k,
            project_id=request.project_id,
            similarity_threshold=request.similarity_threshold,
            file_path=request.file_path,
            entity_name=request.entity_name,
            language=request.language,
            entity_type=request.entity_type,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
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
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
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


@router.post("/graph-generate", response_model=GraphRAGGenerationResponse)
def generate_graph_rag_answer(request: GraphRAGGenerationRequest) -> GraphRAGGenerationResponse:
    """Retrieve relevant code context, query Neo4j graph context, and generate a graph-grounded answer using Qwen LLM.

    Coordinates semantic code search, Neo4j relationship retrieval (CALLS and IMPORTS),
    graph-enriched prompt construction, and completion generation via Ollama/Qwen.
    """
    service = GraphRAGGenerationService()
    try:
        return service.generate_graph_answer(
            query=request.query,
            project_id=request.project_id,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            model=request.model,
            system_prompt=request.system_prompt,
            include_calls=request.include_calls,
            include_imports=request.include_imports,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("Graph-Enriched RAG answer generation failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph RAG generation service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during Graph-Enriched RAG answer generation: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during Graph RAG generation: {str(error)}",
        ) from error


@router.post("/explain", response_model=RAGExplanationResponse)
def explain_code_entity(request: RAGExplanationRequest) -> RAGExplanationResponse:
    """Generate a targeted explanation for a specific code entity or file using RAG and Knowledge Graph context.

    Coordinates symbol resolution, graph dependency tracing (CALLS and IMPORTS),
    semantic code search, and completion generation via Ollama/Qwen.
    """
    service = CodeExplanationRAGService()
    try:
        return service.explain_entity(
            entity_name=request.entity_name,
            file_path=request.file_path,
            query=request.query,
            project_id=request.project_id,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            model=request.model,
            system_prompt=request.system_prompt,
            include_graph_context=request.include_graph_context,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("Code explanation RAG generation failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code explanation service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during code explanation generation: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during code explanation: {str(error)}",
        ) from error


@router.post("/impact", response_model=ImpactAnalysisResponse)
def analyze_change_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    """Analyze change impact for a code entity or file using reverse dependency tracing and RAG.

    Coordinates target resolution, PostgreSQL reverse dependency graph traversal (CALLS and IMPORTS),
    semantic code search, and completion generation via Ollama/Qwen.
    """
    service = ImpactAnalysisRAGService()
    try:
        return service.analyze_impact(
            entity_name=request.entity_name,
            file_path=request.file_path,
            project_id=request.project_id,
            depth=request.depth,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            model=request.model,
            system_prompt=request.system_prompt,
            include_imports=request.include_imports,
            include_calls=request.include_calls,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        logger.error("Impact analysis RAG generation failed: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impact analysis service error: {str(error)}",
        ) from error
    except Exception as error:
        logger.error("Unexpected error during impact analysis generation: %s", str(error))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during impact analysis: {str(error)}",
        ) from error
