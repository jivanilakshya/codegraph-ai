"""Endpoints for project-scoped conversations and message history."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.conversation import (
    ChatMessageCreate,
    ChatMessageResponse,
    ConversationCreate,
    ConversationDeleteResponse,
    ConversationListResponse,
    ConversationMessagesResponse,
    ConversationResponse,
)
from app.services.conversation_service import (
    ConversationNotFoundError,
    ConversationService,
)
from app.services.project_scope_service import ProjectNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get(
    "/projects/{project_id}/conversations",
    response_model=ConversationListResponse,
)
def list_project_conversations(project_id: int) -> ConversationListResponse:
    """Return all conversations for a project, ordered by most recently updated."""
    service = ConversationService()
    try:
        conversations = service.list_conversations(project_id)
        return ConversationListResponse(
            conversations=[
                ConversationResponse.model_validate(c) for c in conversations
            ]
        )
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not list conversations for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not list conversations.",
        ) from error


@router.post(
    "/projects/{project_id}/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_conversation(
    project_id: int, payload: ConversationCreate | None = None
) -> ConversationResponse:
    """Create a new conversation scoped to a project."""
    service = ConversationService()
    title = payload.title if payload else None
    try:
        conversation = service.create_conversation(project_id, title=title)
        return ConversationResponse.model_validate(conversation)
    except ProjectNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not create conversation for project %s", project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create conversation.",
        ) from error


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation_metadata(
    conversation_id: int,
    project_id: Annotated[int | None, Query()] = None,
) -> ConversationResponse:
    """Fetch metadata for a conversation."""
    service = ConversationService()
    try:
        conversation = service.get_conversation(
            conversation_id, project_id=project_id
        )
        return ConversationResponse.model_validate(conversation)
    except ConversationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not fetch conversation %s", conversation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch conversation.",
        ) from error


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=ConversationMessagesResponse,
)
def get_conversation_messages(
    conversation_id: int,
    project_id: Annotated[int | None, Query()] = None,
) -> ConversationMessagesResponse:
    """Fetch chronological message history for a conversation."""
    service = ConversationService()
    try:
        messages = service.get_messages(
            conversation_id, project_id=project_id
        )
        return ConversationMessagesResponse(
            messages=[ChatMessageResponse.model_validate(m) for m in messages]
        )
    except ConversationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not fetch messages for conversation %s", conversation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch conversation messages.",
        ) from error


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_chat_message(
    conversation_id: int,
    payload: ChatMessageCreate,
    project_id: Annotated[int | None, Query()] = None,
) -> ChatMessageResponse:
    """Add a user or assistant message to a conversation."""
    service = ConversationService()
    try:
        message = service.add_message(
            conversation_id=conversation_id,
            role=payload.role,
            content=payload.content,
            sources=payload.sources,
            graph_context=payload.graph_context,
            project_id=project_id,
        )
        return ChatMessageResponse.model_validate(message)
    except ConversationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not add message to conversation %s", conversation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save message.",
        ) from error


@router.delete(
    "/conversations/{conversation_id}",
    response_model=ConversationDeleteResponse,
)
def delete_conversation(
    conversation_id: int,
    project_id: Annotated[int | None, Query()] = None,
) -> ConversationDeleteResponse:
    """Delete a conversation and all its messages."""
    service = ConversationService()
    try:
        service.delete_conversation(conversation_id, project_id=project_id)
        return ConversationDeleteResponse(
            success=True,
            message=f"Conversation {conversation_id} was deleted successfully.",
            conversation_id=conversation_id,
        )
    except ConversationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        ) from error
    except Exception as error:
        logger.exception("Could not delete conversation %s", conversation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete conversation.",
        ) from error
