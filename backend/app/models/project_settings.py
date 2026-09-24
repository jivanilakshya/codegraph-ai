"""Project Settings relational model."""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectSettings(Base):
    """Configurable scanner, analysis, and AI settings for a project."""

    __tablename__ = "project_settings"

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # 1. Scan settings
    custom_exclusions: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    max_file_size_mb: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=5.0,
    )

    # 2. Code analysis settings
    enable_complexity: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    enable_dead_code: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    enable_circular_dependency: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # 3. AI settings
    ollama_model: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="qwen2.5-coder:7b",
    )
    use_graph_context: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    use_search_context: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    project: Mapped["Project"] = relationship(
        back_populates="settings",
    )
