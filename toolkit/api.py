"""HTTP client for the CodeGraph AI backend."""

from time import perf_counter
from typing import Any

import requests


class ApiError(RuntimeError):
    """An API request failed or returned an invalid response."""


class ApiClient:
    def __init__(self, base_url: str, timeout: float = 10) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(self, method: str, path: str, **kwargs: Any) -> tuple[Any, float, int]:
        started = perf_counter()
        try:
            response = requests.request(method, f"{self.base_url}{path}", timeout=self.timeout, **kwargs)
        except requests.RequestException as error:
            raise ApiError(str(error)) from error
        elapsed_ms = (perf_counter() - started) * 1000
        try:
            payload = response.json()
        except ValueError:
            payload = response.text
        if not response.ok:
            detail = payload.get("detail", payload) if isinstance(payload, dict) else payload
            raise ApiError(f"HTTP {response.status_code}: {detail}")
        return payload, elapsed_ms, response.status_code

    def health(self) -> tuple[Any, float, int]:
        return self.request("GET", "/health")

    def scan(self, project_id: int) -> tuple[Any, float, int]:
        return self.request("POST", f"/api/v1/projects/{project_id}/scan")

    def parse(self, file_id: int) -> tuple[Any, float, int]:
        return self.request("POST", f"/api/v1/files/{file_id}/parse")

    def ast(self, file_id: int) -> tuple[Any, float, int]:
        return self.request("GET", f"/api/v1/files/{file_id}/ast")
