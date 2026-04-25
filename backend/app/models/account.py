from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.payment_method import PaymentMethod
    from app.models.transaction import Transaction
    from app.models.prediction import PredictionTemplate, PredictionInstance
    from app.models.transfer import Transfer


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)  # current/savings (extensible)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    default_payment_method_id: Mapped[int | None] = mapped_column(
        ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="account", foreign_keys="Transaction.account_id"
    )
    prediction_templates: Mapped[list["PredictionTemplate"]] = relationship(
        back_populates="account"
    )
    prediction_instances: Mapped[list["PredictionInstance"]] = relationship(
        back_populates="account"
    )
    transfers_out: Mapped[list["Transfer"]] = relationship(
        back_populates="from_account", foreign_keys="Transfer.from_account_id"
    )
    transfers_in: Mapped[list["Transfer"]] = relationship(
        back_populates="to_account", foreign_keys="Transfer.to_account_id"
    )
    default_payment_method: Mapped["PaymentMethod | None"] = relationship(
        foreign_keys=[default_payment_method_id]
    )
