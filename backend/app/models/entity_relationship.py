"""Persisted directed relationships between extracted code entities."""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class EntityRelationship(Base):
    """A semantic edge between two declarations in the same scanned project."""

    __tablename__ = "entity_relationships"
    __table_args__ = (
        UniqueConstraint(
            "source_entity_id", "target_entity_id", "relationship_type",
            name="uq_entity_relationships_source_target_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_entity_id: Mapped[int] = mapped_column(
        ForeignKey("code_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_entity_id: Mapped[int] = mapped_column(
        ForeignKey("code_entities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False)
