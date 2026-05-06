from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.category import Category
    from app.models.payment_method import PaymentMethod


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    subcategory_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True
    )
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    # daily / unplanned / predicted / transfer / correction
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_method_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("payment_methods.id"), nullable=True
    )
    confirmed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    account: Mapped["Account"] = relationship(
        back_populates="transactions", foreign_keys=[account_id]
    )
    category: Mapped[Optional["Category"]] = relationship(
        back_populates="transactions", foreign_keys=[category_id]
    )
    subcategory_category: Mapped[Optional["Category"]] = relationship(
        foreign_keys=[subcategory_id]
    )
    payment_method: Mapped[Optional["PaymentMethod"]] = relationship(
        back_populates="transactions"
    )

    @property
    def payment_method_name(self) -> Optional[str]:
        return self.payment_method.name if self.payment_method else None

    @property
    def category_name(self) -> Optional[str]:
        return self.category.name if self.category else None

    @property
    def top_category_name(self) -> Optional[str]:
        """Root (parent-less) category name — walks up one level if the stored
        category is a child. Assumes max two levels of depth."""
        if not self.category:
            return None
        if self.category.parent_id and self.category.parent:
            return self.category.parent.name
        return self.category.name
