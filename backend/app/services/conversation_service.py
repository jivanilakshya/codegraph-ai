"""Service for managing project-scoped conversations and chat messages."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.conversation import ChatMessage, Conversation
from app.services.project_scope_service import ProjectScopeService

logger = logging.getLogger(__name__)


class ConversationNotFoundError(Exception):
    """Raised when a conversation does not exist or belong to the specified project."""


class ConversationService:
    """CRUD operations for persistent chat history."""

    def __init__(self) -> None:
        self.project_scope_service = ProjectScopeService()

    def create_conversation(
        self, project_id: int, title: str | None = None
    ) -> Conversation:
        """Create a new conversation for *project_id*."""
        self.project_scope_service.require_project(project_id)

        clean_title = (title or "").strip()
        if not clean_title:
            clean_title = "New Conversation"
        if len(clean_title) > 255:
            clean_title = clean_title[:255]

        try:
            with SessionLocal() as session:
                conversation = Conversation(
                    project_id=project_id,
                    title=clean_title,
                )
                session.add(conversation)
                session.commit()
                session.refresh(conversation)
                return conversation
        except SQLAlchemyError as error:
            logger.exception("Could not create conversation for project %s", project_id)
            raise RuntimeError("Could not create conversation.") from error

    def list_conversations(self, project_id: int) -> list[Conversation]:
        """List all conversations for *project_id* ordered by updated_at descending."""
        self.project_scope_service.require_project(project_id)

        try:
            with SessionLocal() as session:
                return list(
                    session.scalars(
                        select(Conversation)
                        .where(Conversation.project_id == project_id)
                        .order_by(Conversation.updated_at.desc())
                    ).all()
                )
        except SQLAlchemyError as error:
            logger.exception("Could not list conversations for project %s", project_id)
            raise RuntimeError("Could not list conversations.") from error

    def get_conversation(
        self, conversation_id: int, project_id: int | None = None
    ) -> Conversation:
        """Fetch conversation by ID, enforcing project isolation if *project_id* is given."""
        if isinstance(conversation_id, bool) or not isinstance(conversation_id, int) or conversation_id < 1:
            raise ValueError("conversation_id must be a positive integer.")

        try:
            with SessionLocal() as session:
                conversation = session.get(Conversation, conversation_id)
                if conversation is None:
                    raise ConversationNotFoundError(
                        f"Conversation {conversation_id} was not found."
                    )

                if project_id is not None and conversation.project_id != project_id:
                    logger.warning(
                        "Cross-project conversation access rejected: conversation %s (project %s) requested for project %s",
                        conversation_id,
                        conversation.project_id,
                        project_id,
                    )
                    raise ConversationNotFoundError(
                        f"Conversation {conversation_id} was not found."
                    )

                return conversation
        except ConversationNotFoundError:
            raise
        except SQLAlchemyError as error:
            logger.exception("Could not fetch conversation %s", conversation_id)
            raise RuntimeError("Could not fetch conversation.") from error

    def get_messages(
        self, conversation_id: int, project_id: int | None = None
    ) -> list[ChatMessage]:
        """Fetch all messages for *conversation_id* in chronological order."""
        self.get_conversation(conversation_id, project_id=project_id)

        try:
            with SessionLocal() as session:
                return list(
                    session.scalars(
                        select(ChatMessage)
                        .where(ChatMessage.conversation_id == conversation_id)
                        .order_by(ChatMessage.created_at.asc())
                    ).all()
                )
        except SQLAlchemyError as error:
            logger.exception("Could not fetch messages for conversation %s", conversation_id)
            raise RuntimeError("Could not fetch messages.") from error

    def add_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        sources: list[dict] | None = None,
        graph_context: list[dict] | None = None,
        project_id: int | None = None,
    ) -> ChatMessage:
        """Add a message to *conversation_id* and update conversation.updated_at timestamp."""
        if role not in ("user", "assistant"):
            raise ValueError("Role must be 'user' or 'assistant'.")

        clean_content = content.strip()
        if not clean_content:
            raise ValueError("Message content cannot be empty.")

        self.get_conversation(conversation_id, project_id=project_id)

        try:
            with SessionLocal() as session:
                message = ChatMessage(
                    conversation_id=conversation_id,
                    role=role,
                    content=clean_content,
                    sources=sources,
                    graph_context=graph_context,
                )
                session.add(message)

                # Update conversation updated_at timestamp
                conversation = session.get(Conversation, conversation_id)
                if conversation is not None:
                    conversation.updated_at = datetime.now(timezone.utc)
                    # If this is the first user message and title is default, update title to question prefix
                    if role == "user" and conversation.title == "New Conversation":
                        new_title = clean_content[:60].strip()
                        if new_title:
                            conversation.title = new_title

                session.commit()
                session.refresh(message)
                return message
        except SQLAlchemyError as error:
            logger.exception("Could not add message to conversation %s", conversation_id)
            raise RuntimeError("Could not save message.") from error

    def delete_conversation(
        self, conversation_id: int, project_id: int | None = None
    ) -> bool:
        """Delete *conversation_id* and all associated chat messages."""
        self.get_conversation(conversation_id, project_id=project_id)

        try:
            with SessionLocal() as session:
                conversation = session.get(Conversation, conversation_id)
                if conversation is not None:
                    session.delete(conversation)
                    session.commit()
                return True
        except SQLAlchemyError as error:
            logger.exception("Could not delete conversation %s", conversation_id)
            raise RuntimeError("Could not delete conversation.") from error
