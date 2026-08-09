"""Persisted file-to-file relationships extracted during repository scans."""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class FileRelationship(Base):
    """A directed relationship between two files in the same project."""

    __tablename__ = "file_relationships"
    __table_args__ = (
        UniqueConstraint(
            "source_file_id", "target_file_id", "relationship_type",
            name="uq_file_relationships_source_target_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False)
