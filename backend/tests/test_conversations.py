"""Contract and unit tests for conversation history endpoints and service logic."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.conversation import ChatMessage, Conversation
from app.models.project import Project
from app.services.conversation_service import (
    ConversationNotFoundError,
    ConversationService,
)
from app.services.project_scope_service import ProjectNotFoundError


class ConversationServiceAndEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    # ------------------------------------------------------------------ #
    # 1. Create conversation                                             #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.create_conversation")
    def test_create_conversation_endpoint(self, mock_create) -> None:
        mock_conv = MagicMock(spec=Conversation)
        mock_conv.id = 101
        mock_conv.project_id = 7
        mock_conv.title = "Auth Flow"
        mock_conv.created_at = datetime.now(timezone.utc)
        mock_conv.updated_at = datetime.now(timezone.utc)
        mock_create.return_value = mock_conv

        response = self.client.post(
            "/api/v1/projects/7/conversations",
            json={"title": "Auth Flow"},
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["id"], 101)
        self.assertEqual(data["project_id"], 7)
        self.assertEqual(data["title"], "Auth Flow")
        mock_create.assert_called_once_with(7, title="Auth Flow")

    # ------------------------------------------------------------------ #
    # 2. List project conversations                                      #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.list_conversations")
    def test_list_conversations_endpoint(self, mock_list) -> None:
        c1 = MagicMock(spec=Conversation)
        c1.id = 1
        c1.project_id = 7
        c1.title = "Conv 1"
        c1.created_at = datetime.now(timezone.utc)
        c1.updated_at = datetime.now(timezone.utc)

        mock_list.return_value = [c1]

        response = self.client.get("/api/v1/projects/7/conversations")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["conversations"]), 1)
        self.assertEqual(data["conversations"][0]["id"], 1)

    # ------------------------------------------------------------------ #
    # 3. Get conversation                                                #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.get_conversation")
    def test_get_conversation_endpoint(self, mock_get) -> None:
        c1 = MagicMock(spec=Conversation)
        c1.id = 42
        c1.project_id = 7
        c1.title = "RAG Questions"
        c1.created_at = datetime.now(timezone.utc)
        c1.updated_at = datetime.now(timezone.utc)
        mock_get.return_value = c1

        response = self.client.get("/api/v1/conversations/42?project_id=7")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], 42)
        mock_get.assert_called_once_with(42, project_id=7)

    # ------------------------------------------------------------------ #
    # 4. Add user message                                                #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.add_message")
    def test_add_user_message_endpoint(self, mock_add) -> None:
        msg = MagicMock(spec=ChatMessage)
        msg.id = 1001
        msg.conversation_id = 42
        msg.role = "user"
        msg.content = "Where is auth?"
        msg.sources = None
        msg.graph_context = None
        msg.created_at = datetime.now(timezone.utc)
        mock_add.return_value = msg

        response = self.client.post(
            "/api/v1/conversations/42/messages?project_id=7",
            json={"role": "user", "content": "Where is auth?"},
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["id"], 1001)
        self.assertEqual(data["role"], "user")
        self.assertEqual(data["content"], "Where is auth?")

    # ------------------------------------------------------------------ #
    # 5. Add assistant message                                           #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.add_message")
    def test_add_assistant_message_endpoint(self, mock_add) -> None:
        msg = MagicMock(spec=ChatMessage)
        msg.id = 1002
        msg.conversation_id = 42
        msg.role = "assistant"
        msg.content = "Auth is handled in auth.py."
        msg.sources = [{"file_path": "auth.py", "score": 0.95}]
        msg.graph_context = [{"file_path": "auth.py", "calls": ["login"]}]
        msg.created_at = datetime.now(timezone.utc)
        mock_add.return_value = msg

        response = self.client.post(
            "/api/v1/conversations/42/messages?project_id=7",
            json={
                "role": "assistant",
                "content": "Auth is handled in auth.py.",
                "sources": [{"file_path": "auth.py", "score": 0.95}],
                "graph_context": [{"file_path": "auth.py", "calls": ["login"]}],
            },
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["id"], 1002)
        self.assertEqual(data["role"], "assistant")
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(len(data["graph_context"]), 1)

    # ------------------------------------------------------------------ #
    # 6. Get messages in chronological order                             #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.get_messages")
    def test_get_messages_endpoint(self, mock_messages) -> None:
        m1 = MagicMock(spec=ChatMessage)
        m1.id = 1
        m1.conversation_id = 42
        m1.role = "user"
        m1.content = "Question 1"
        m1.sources = None
        m1.graph_context = None
        m1.created_at = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)

        m2 = MagicMock(spec=ChatMessage)
        m2.id = 2
        m2.conversation_id = 42
        m2.role = "assistant"
        m2.content = "Answer 1"
        m2.sources = []
        m2.graph_context = []
        m2.created_at = datetime(2026, 1, 1, 10, 1, tzinfo=timezone.utc)

        mock_messages.return_value = [m1, m2]

        response = self.client.get("/api/v1/conversations/42/messages?project_id=7")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["messages"]), 2)
        self.assertEqual(data["messages"][0]["id"], 1)
        self.assertEqual(data["messages"][1]["id"], 2)

    # ------------------------------------------------------------------ #
    # 7. Delete conversation                                             #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.delete_conversation")
    def test_delete_conversation_endpoint(self, mock_delete) -> None:
        mock_delete.return_value = True

        response = self.client.delete("/api/v1/conversations/42?project_id=7")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["conversation_id"], 42)

    # ------------------------------------------------------------------ #
    # 8. Unknown project returns 404                                     #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.list_conversations")
    def test_unknown_project_returns_404(self, mock_list) -> None:
        mock_list.side_effect = ProjectNotFoundError("Project 999 was not found.")

        response = self.client.get("/api/v1/projects/999/conversations")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Project 999 was not found.")

    # ------------------------------------------------------------------ #
    # 9. Unknown conversation returns 404                                #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.get_conversation")
    def test_unknown_conversation_returns_404(self, mock_get) -> None:
        mock_get.side_effect = ConversationNotFoundError("Conversation 888 was not found.")

        response = self.client.get("/api/v1/conversations/888")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Conversation 888 was not found.")

    # ------------------------------------------------------------------ #
    # 10. Cross-project conversation access is rejected                  #
    # ------------------------------------------------------------------ #
    @patch("app.api.v1.endpoints.conversations.ConversationService.get_conversation")
    def test_cross_project_conversation_access_rejected(self, mock_get) -> None:
        mock_get.side_effect = ConversationNotFoundError("Conversation 42 was not found.")

        # Requesting conversation 42 with mismatched project_id 999
        response = self.client.get("/api/v1/conversations/42?project_id=999")

        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------ #
    # 11. Conversation updated_at changes when a message is added       #
    # ------------------------------------------------------------------ #
    def test_conversation_updated_at_changes_service_logic(self) -> None:
        service = ConversationService()
        mock_session = MagicMock()

        conv = Conversation(
            id=10,
            project_id=1,
            title="New Conversation",
            created_at=datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc),
        )

        with patch("app.services.conversation_service.SessionLocal", return_value=mock_session), \
             patch.object(service, "get_conversation", return_value=conv):
            mock_session.__enter__.return_value = mock_session
            mock_session.get.return_value = conv

            old_updated_at = conv.updated_at
            service.add_message(
                conversation_id=10,
                role="user",
                content="What is this repository?",
                project_id=1,
            )

            self.assertGreater(conv.updated_at, old_updated_at)
            # Automatic title generation for New Conversation
            self.assertEqual(conv.title, "What is this repository?")


if __name__ == "__main__":
    unittest.main()
