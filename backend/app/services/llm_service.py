"""LLM service for interacting with local Ollama runtime and Qwen model."""

import json
import logging
from typing import Generator, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_ollama_base_url, get_ollama_model
from app.schemas.llm import LLMGenerateResponse

logger = logging.getLogger(__name__)


class LLMService:
    """Service to interact with local Ollama / Qwen LLM service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: float = 300.0,
    ):
        """Initialize the LLMService.

        Args:
            base_url: Optional base URL for Ollama service. Defaults to configured OLLAMA_BASE_URL.
            default_model: Optional default model name. Defaults to configured OLLAMA_MODEL.
            timeout: Timeout in seconds for HTTP requests to Ollama. Defaults to 60.0s.
        """
        self.base_url = (base_url or get_ollama_base_url()).rstrip("/")
        self.default_model = default_model or get_ollama_model()
        self.timeout = timeout

    def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
    ) -> LLMGenerateResponse:
        """Send prompt to Ollama LLM and return generated text.

        Args:
            prompt: Text prompt to generate completion for.
            model: Optional model override. Defaults to self.default_model.

        Returns:
            LLMGenerateResponse containing the generated response text and model name.

        Raises:
            ValueError: If prompt is empty or whitespace-only.
            RuntimeError: If Ollama service is unreachable, returns HTTP error, or returns invalid response.
        """
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt string cannot be empty or contain only whitespace.")

        clean_prompt = prompt.strip()
        target_model = (
            model.strip()
            if (model and isinstance(model, str) and model.strip())
            else self.default_model
        )

        endpoint_url = f"{self.base_url}/api/generate"
        payload = {
            "model": target_model,
            "prompt": clean_prompt,
            "stream": False,
        }

        logger.info(
            "Sending LLM generation request to '%s' using model '%s'",
            endpoint_url,
            target_model,
        )

        request_bytes = json.dumps(payload).encode("utf-8")
        req = Request(
            endpoint_url,
            data=request_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(req, timeout=self.timeout) as response:
                response_bytes = response.read()
        except HTTPError as error:
            logger.error("Ollama service returned HTTP error %s: %s", error.code, error.reason)
            raise RuntimeError(
                f"Ollama service error: HTTP {error.code} {error.reason}"
            ) from error
        except (URLError, TimeoutError, OSError) as error:
            logger.error("Failed to connect to Ollama at '%s': %s", self.base_url, str(error))
            raise RuntimeError(
                f"Could not connect to Ollama service at '{self.base_url}': {str(error)}"
            ) from error

        try:
            response_json = json.loads(response_bytes.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            logger.error("Failed to parse JSON response from Ollama: %s", str(error))
            raise RuntimeError(
                "Invalid response from Ollama service: failed to parse JSON."
            ) from error

        if (
            not isinstance(response_json, dict)
            or "response" not in response_json
            or not isinstance(response_json["response"], str)
        ):
            logger.error("Ollama response missing required 'response' string field: %r", response_json)
            raise RuntimeError(
                "Invalid response structure from Ollama service: missing 'response' field."
            )

        returned_text = response_json["response"]
        returned_model = response_json.get("model") or target_model

        return LLMGenerateResponse(
            response=returned_text,
            model=returned_model,
        )

    def generate_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """Send prompt to Ollama LLM and stream generated text chunks incrementally.

        Args:
            prompt: Text prompt to generate completion for.
            model: Optional model override. Defaults to self.default_model.

        Yields:
            Generated text chunks as they arrive from Ollama.

        Raises:
            ValueError: If prompt is empty or whitespace-only.
            RuntimeError: If Ollama service is unreachable, returns HTTP error, or returns stream error.
        """
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt string cannot be empty or contain only whitespace.")

        clean_prompt = prompt.strip()
        target_model = (
            model.strip()
            if (model and isinstance(model, str) and model.strip())
            else self.default_model
        )

        endpoint_url = f"{self.base_url}/api/generate"
        payload = {
            "model": target_model,
            "prompt": clean_prompt,
            "stream": True,
        }

        logger.info(
            "Sending streaming LLM generation request to '%s' using model '%s'",
            endpoint_url,
            target_model,
        )

        request_bytes = json.dumps(payload).encode("utf-8")
        req = Request(
            endpoint_url,
            data=request_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            response = urlopen(req, timeout=self.timeout)
        except HTTPError as error:
            logger.error("Ollama service returned HTTP error %s: %s", error.code, error.reason)
            raise RuntimeError(
                f"Ollama service error: HTTP {error.code} {error.reason}"
            ) from error
        except (URLError, TimeoutError, OSError) as error:
            logger.error("Failed to connect to Ollama at '%s': %s", self.base_url, str(error))
            raise RuntimeError(
                f"Could not connect to Ollama service at '{self.base_url}': {str(error)}"
            ) from error

        try:
            for raw_line in response:
                if not raw_line:
                    continue
                line = raw_line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except (json.JSONDecodeError, UnicodeDecodeError) as parse_err:
                    logger.warning("Failed to decode JSON stream line from Ollama: %s", parse_err)
                    continue

                if not isinstance(data, dict):
                    continue

                if "error" in data:
                    logger.error("Ollama streaming error event: %s", data["error"])
                    raise RuntimeError(f"Ollama stream error: {data['error']}")

                token = data.get("response")
                if token and isinstance(token, str):
                    yield token

                if data.get("done") is True:
                    break
        finally:
            response.close()
