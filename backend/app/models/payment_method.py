from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.transaction import Transaction


class PaymentMethod(Base):
    """
    User-managed list of payment methods (e.g. Card, Cash, Revolut).
    Seeded with Card and Cash; new entries added via the settings page.
    """

    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="payment_method")
    default_for_accounts: Mapped[list["Account"]] = relationship(
        foreign_keys="Account.default_payment_method_id"
    )
