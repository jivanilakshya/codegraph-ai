"""Version 1 API router."""

from fastapi import APIRouter

from app.api.v1.endpoints.conversations import router as conversations_router
from app.api.v1.endpoints.graph import router as graph_router
from app.api.v1.endpoints.github import router as github_router
from app.api.v1.endpoints.parser import router as parser_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.repository_scanner import router as repository_scanner_router
from app.api.v1.endpoints.upload import router as upload_router
from app.api.v1.endpoints.workspace import router as workspace_router
from app.api.v1.endpoints.chunks import router as chunks_router
from app.api.v1.endpoints.embeddings import router as embeddings_router
from app.api.v1.endpoints.search import router as search_router
from app.api.v1.endpoints.rag import router as rag_router
from app.api.v1.endpoints.llm import router as llm_router
from app.api.v1.endpoints.dead_code import router as dead_code_router
from app.api.v1.endpoints.circular_dependency import router as circular_dependency_router
from app.api.v1.endpoints.complexity import router as complexity_router
from app.api.v1.endpoints.code_quality import router as code_quality_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(conversations_router)
api_router.include_router(github_router)
api_router.include_router(projects_router)
api_router.include_router(graph_router)
api_router.include_router(dead_code_router)
api_router.include_router(circular_dependency_router)
api_router.include_router(complexity_router)
api_router.include_router(code_quality_router)
api_router.include_router(upload_router)
api_router.include_router(repository_scanner_router)
api_router.include_router(workspace_router)
api_router.include_router(parser_router)
api_router.include_router(chunks_router)
api_router.include_router(embeddings_router)
api_router.include_router(search_router)
api_router.include_router(rag_router)
api_router.include_router(llm_router)



