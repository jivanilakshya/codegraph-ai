"""Persisted symbols extracted from a source file AST."""

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class CodeEntity(Base):
    """A function, class, variable, or exported symbol declared in one file."""

    __tablename__ = "code_entities"
    __table_args__ = (
        UniqueConstraint(
            "file_id", "name", "entity_type", "start_line",
            name="uq_code_entities_file_name_type_line",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
