from datetime import datetime

from sqlalchemy import DateTime, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImportMapping(Base):
    __tablename__ = "import_mappings"
    __table_args__ = (
        UniqueConstraint(
            "source_category",
            "source_subcategory",
            name="uq_import_mapping_source_pair",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_category: Mapped[str] = mapped_column(String(120), nullable=False)
    source_subcategory: Mapped[str] = mapped_column(String(160), nullable=False)
    mapping: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
