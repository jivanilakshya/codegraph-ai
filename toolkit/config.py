"""Configuration for the developer toolkit."""

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    """Runtime settings, overridable through environment variables."""

    api_url: str
    database_url: str
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    compose_file: Path


def load_settings() -> Settings:
    """Load settings from the repository environment and local defaults."""
    root = Path(__file__).resolve().parents[1]
    load_dotenv(root / ".env")
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/codegraph_ai")
    if "@postgres:" in database_url:
        database_url = database_url.replace("@postgres:", "@localhost:")
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    if "//neo4j:" in neo4j_uri:
        neo4j_uri = neo4j_uri.replace("//neo4j:", "//localhost:")
    return Settings(
        api_url=os.getenv("TOOLKIT_API_URL", os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")).rstrip("/"),
        database_url=database_url,
        neo4j_uri=neo4j_uri,
        neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
        neo4j_password=os.getenv("NEO4J_PASSWORD", "password"),
        compose_file=Path(os.getenv("TOOLKIT_COMPOSE_FILE", root / "docker-compose.yml")),
    )
