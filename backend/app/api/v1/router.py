"""Version 1 API router."""

from fastapi import APIRouter

from app.api.v1.endpoints.graph import router as graph_router
from app.api.v1.endpoints.github import router as github_router
from app.api.v1.endpoints.parser import router as parser_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.repository_scanner import router as repository_scanner_router
from app.api.v1.endpoints.upload import router as upload_router
from app.api.v1.endpoints.workspace import router as workspace_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(github_router)
api_router.include_router(projects_router)
api_router.include_router(graph_router)
api_router.include_router(upload_router)
api_router.include_router(repository_scanner_router)
api_router.include_router(workspace_router)
api_router.include_router(parser_router)
