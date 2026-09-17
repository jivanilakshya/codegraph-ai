"""Schemas for conversations and chat messages."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    """Payload for creating a new conversation."""

    title: str | None = Field(default=None, max_length=255)


class ConversationResponse(BaseModel):
    """Conversation metadata returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Collection of conversations for a project."""

    conversations: list[ConversationResponse]


class ChatMessageCreate(BaseModel):
    """Payload for creating a chat message."""

    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)
    sources: list[dict[str, Any]] | None = None
    graph_context: list[dict[str, Any]] | None = None


class ChatMessageResponse(BaseModel):
    """Chat message detail returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: str
    content: str
    sources: list[Any] | None = None
    graph_context: list[Any] | None = None
    created_at: datetime


class ConversationMessagesResponse(BaseModel):
    """Collection of chat messages in a conversation."""

    messages: list[ChatMessageResponse]


class ConversationDeleteResponse(BaseModel):
    """Response returned when a conversation is deleted."""

    success: bool = True
    message: str
    conversation_id: int
