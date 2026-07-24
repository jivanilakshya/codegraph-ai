"""GitHub project endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.github import GitHubProjectCloneRequest, GitHubProjectCloneResponse
from app.services.github_service import (
    GitHubService,
    InvalidGitHubUrlError,
    RepositoryAlreadyExistsError,
    RepositoryCloneError,
    RepositoryNetworkError,
    RepositoryPermissionError,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "/github",
    response_model=GitHubProjectCloneResponse,
    status_code=status.HTTP_201_CREATED,
)
def clone_github_project(
    request: GitHubProjectCloneRequest,
) -> GitHubProjectCloneResponse:
    """Clone a GitHub repository and register its basic project information."""
    service = GitHubService()

    try:
        cloned_repository = service.clone_repository(request.github_url)
    except InvalidGitHubUrlError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except RepositoryAlreadyExistsError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except RepositoryPermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except RepositoryNetworkError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
    except RepositoryCloneError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error

    return GitHubProjectCloneResponse(
        project_id=cloned_repository.project_id,
        project_name=cloned_repository.project_name,
        branch=cloned_repository.branch,
        local_path=cloned_repository.local_path,
    )
