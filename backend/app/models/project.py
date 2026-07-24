"""Project relational model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.metadata import Metadata


class Project(Base):
    """A source-code project tracked by CodeGraph AI."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    github_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    language: Mapped[str | None] = mapped_column(String(100), nullable=True)
    local_path: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    default_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cloned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    files: Mapped[list["File"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    metadata_entries: Mapped[list["Metadata"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
