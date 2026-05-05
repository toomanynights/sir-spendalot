from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.schemas.transfer import TransferCreate, TransferResponse


# ------------------------------------------------------------------ #
# Internal helpers                                                     #
# ------------------------------------------------------------------ #


def _get_account_or_404(db: Session, account_id: int) -> Account:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found.")
    return account


def _build_leg(
    account_id: int,
    amount: Decimal,
    transfer_date: date,
    description: Optional[str],
    from_name: str,
    to_name: str,
) -> Transaction:
    """Build a single transaction leg for a transfer."""
    label = description or f"{from_name} → {to_name}"
    return Transaction(
        account_id=account_id,
        amount=amount,
        transaction_date=transfer_date,
        type="transfer",
        description=label,
        confirmed=True,
    )


# ------------------------------------------------------------------ #
# Public service functions                                             #
# ------------------------------------------------------------------ #


def create_transfer(db: Session, data: TransferCreate) -> TransferResponse:
    if data.from_account_id == data.to_account_id:
        raise HTTPException(
            status_code=422,
            detail="Hark! Thou canst not transfer to thine own account.",
        )

    from_account = _get_account_or_404(db, data.from_account_id)
    to_account = _get_account_or_404(db, data.to_account_id)

    # Debit leg: positive amount reduces source account balance
    debit = _build_leg(
        account_id=data.from_account_id,
        amount=data.amount,
        transfer_date=data.transfer_date,
        description=data.description,
        from_name=from_account.name,
        to_name=to_account.name,
    )

    # Credit leg: negative amount increases destination account balance
    credit = _build_leg(
        account_id=data.to_account_id,
        amount=-data.amount,
        transfer_date=data.transfer_date,
        description=data.description,
        from_name=from_account.name,
        to_name=to_account.name,
    )

    transfer = Transfer(
        from_account_id=data.from_account_id,
        to_account_id=data.to_account_id,
        amount=data.amount,
        transfer_date=data.transfer_date,
        description=data.description,
    )

    db.add_all([debit, credit, transfer])
    db.commit()
    db.refresh(transfer)
    return TransferResponse.model_validate(transfer)


def get_transfers(db: Session) -> list[TransferResponse]:
    transfers = (
        db.query(Transfer)
        .order_by(Transfer.transfer_date.desc(), Transfer.id.desc())
        .all()
    )
    return [TransferResponse.model_validate(t) for t in transfers]
