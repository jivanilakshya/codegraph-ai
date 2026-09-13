"""Unit and API tests for Step 6.1: Qwen LLM Integration via Ollama."""

import io
import os
import sys
import unittest
from urllib.error import HTTPError, URLError
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.llm import LLMGenerateRequest, LLMGenerateResponse
from app.services.llm_service import LLMService


class TestLLMSchemas(unittest.TestCase):
    """Test suite for LLM Pydantic schemas."""

    def test_valid_request(self):
        """Test valid LLMGenerateRequest with prompt."""
        req = LLMGenerateRequest(prompt="Explain what a Python function is.")
        self.assertEqual(req.prompt, "Explain what a Python function is.")
        self.assertIsNone(req.model)

    def test_empty_prompt_validation(self):
        """Test that empty prompt raises ValidationError."""
        with self.assertRaises(ValidationError):
            LLMGenerateRequest(prompt="")

    def test_whitespace_prompt_validation(self):
        """Test that whitespace-only prompt raises ValidationError."""
        with self.assertRaises(ValidationError):
            LLMGenerateRequest(prompt="   \t\n  ")

    def test_model_override(self):
        """Test LLMGenerateRequest with explicit model override."""
        req = LLMGenerateRequest(
            prompt="Write a hello world function",
            model="custom-coder:7b",
        )
        self.assertEqual(req.prompt, "Write a hello world function")
        self.assertEqual(req.model, "custom-coder:7b")


class TestLLMService(unittest.TestCase):
    """Test suite for LLMService business logic and Ollama HTTP integration."""

    def setUp(self):
        self.service = LLMService(
            base_url="http://ollama:11434",
            default_model="qwen2.5-coder:7b",
            timeout=5.0,
        )

    @patch("app.services.llm_service.urlopen")
    def test_successful_ollama_response(self, mock_urlopen):
        """Test successful LLM text generation from Ollama HTTP response."""
        mock_response = MagicMock()
        mock_response.read.return_value = (
            b'{"model": "qwen2.5-coder:7b", "response": "A Python function is a block of reusable code.", "done": true}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = self.service.generate(prompt="Explain what a Python function is.")

        self.assertIsInstance(res, LLMGenerateResponse)
        self.assertEqual(res.response, "A Python function is a block of reusable code.")
        self.assertEqual(res.model, "qwen2.5-coder:7b")
        mock_urlopen.assert_called_once()

    @patch("app.services.llm_service.urlopen")
    def test_ollama_connection_failure(self, mock_urlopen):
        """Test clear RuntimeError raising on connection failure."""
        mock_urlopen.side_effect = URLError("Connection refused")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate(prompt="Explain Python functions.")

        self.assertIn("Could not connect to Ollama service", str(ctx.exception))

    def test_empty_prompt_raises_value_error(self):
        """Test empty prompt raises ValueError."""
        with self.assertRaises(ValueError):
            self.service.generate(prompt="")

    def test_whitespace_only_prompt_raises_value_error(self):
        """Test whitespace-only prompt raises ValueError."""
        with self.assertRaises(ValueError):
            self.service.generate(prompt="   \n\t  ")

    @patch("app.services.llm_service.urlopen")
    def test_configured_model_fallback(self, mock_urlopen):
        """Test fallback to default configured model when model override is not provided."""
        mock_response = MagicMock()
        mock_response.read.return_value = (
            b'{"model": "qwen2.5-coder:7b", "response": "Generated response."}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = self.service.generate(prompt="Explain recursion.")
        self.assertEqual(res.model, "qwen2.5-coder:7b")

    @patch("app.services.llm_service.urlopen")
    def test_explicit_model_override(self, mock_urlopen):
        """Test explicit model override is sent in request payload."""
        mock_response = MagicMock()
        mock_response.read.return_value = (
            b'{"model": "override-model:latest", "response": "Override response."}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = self.service.generate(
            prompt="Explain recursion.",
            model="override-model:latest",
        )
        self.assertEqual(res.model, "override-model:latest")

    @patch("app.services.llm_service.urlopen")
    def test_response_parsing_missing_field(self, mock_urlopen):
        """Test RuntimeError raised when response JSON is missing 'response' field."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"model": "qwen2.5-coder:7b", "done": true}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate(prompt="Explain loops.")

        self.assertIn("missing 'response' field", str(ctx.exception))

    @patch("app.services.llm_service.urlopen")
    def test_http_error_handling(self, mock_urlopen):
        """Test RuntimeError raised on HTTP error from Ollama service."""
        mock_urlopen.side_effect = HTTPError(
            url="http://ollama:11434/api/generate",
            code=500,
            msg="Internal Server Error",
            hdrs={},
            fp=io.BytesIO(b"Internal Error"),
        )

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate(prompt="Explain OOP.")

        self.assertIn("Ollama service error: HTTP 500", str(ctx.exception))

    @patch("app.services.llm_service.urlopen")
    def test_invalid_json_response(self, mock_urlopen):
        """Test RuntimeError raised on non-JSON response."""
        mock_response = MagicMock()
        mock_response.read.return_value = b"<html>502 Bad Gateway</html>"
        mock_urlopen.return_value.__enter__.return_value = mock_response

        with self.assertRaises(RuntimeError) as ctx:
            self.service.generate(prompt="Explain decorators.")

        self.assertIn("failed to parse JSON", str(ctx.exception))


class TestLLMAPI(unittest.TestCase):
    """Integration test suite for POST /api/v1/llm/generate endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.llm.LLMService")
    def test_generate_endpoint_success(self, mock_service_cls):
        """Test successful POST /api/v1/llm/generate request."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.generate.return_value = LLMGenerateResponse(
            response="A Python function is defined using the def keyword.",
            model="qwen2.5-coder:7b",
        )

        response = self.client.post(
            "/api/v1/llm/generate",
            json={"prompt": "Explain what a Python function is."},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["response"], "A Python function is defined using the def keyword.")
        self.assertEqual(data["model"], "qwen2.5-coder:7b")

    def test_generate_endpoint_validation_error(self):
        """Test request payload validation errors (422)."""
        # Missing prompt
        r1 = self.client.post("/api/v1/llm/generate", json={})
        self.assertEqual(r1.status_code, 422)

        # Empty prompt
        r2 = self.client.post("/api/v1/llm/generate", json={"prompt": ""})
        self.assertEqual(r2.status_code, 422)

        # Whitespace prompt
        r3 = self.client.post("/api/v1/llm/generate", json={"prompt": "   \n "})
        self.assertEqual(r3.status_code, 422)

    @patch("app.api.v1.endpoints.llm.LLMService")
    def test_generate_endpoint_service_error_500(self, mock_service_cls):
        """Test that internal service errors return 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.generate.side_effect = RuntimeError("Could not connect to Ollama service")

        response = self.client.post(
            "/api/v1/llm/generate",
            json={"prompt": "Explain decorators."},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Could not connect to Ollama service", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
