from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.payment_method import PaymentMethod
from app.models.prediction import PredictionTemplate
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.schemas.account import (
    AccountCreate,
    AccountResponse,
    AccountUpdate,
    BalanceCorrectionCreate,
)


def _compute_balance(db: Session, account: Account) -> Decimal:
    """
    current_balance = initial_balance − Σ transaction amounts.

    Expenses are stored as positive amounts (they reduce the balance).
    Income is stored as negative amounts (they increase the balance).
    Transfers are included — each side already has the correct sign.
    Soft-deleted transactions are excluded.
    """
    total = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), Decimal("0"))).where(
            Transaction.account_id == account.id,
            Transaction.deleted_at.is_(None),
        )
    )
    return account.initial_balance - (total or Decimal("0"))


def _to_response(db: Session, account: Account) -> AccountResponse:
    return AccountResponse.model_validate(
        {
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type,
            "is_primary": account.is_primary,
            "initial_balance": account.initial_balance,
            "default_payment_method_id": account.default_payment_method_id,
            "current_balance": _compute_balance(db, account),
            "created_at": account.created_at,
        }
    )


def _clear_primary(db: Session, exclude_id: Optional[int] = None) -> None:
    """Unset is_primary on all accounts, optionally skipping one."""
    q = db.query(Account).filter(Account.is_primary.is_(True))
    if exclude_id is not None:
        q = q.filter(Account.id != exclude_id)
    q.update({"is_primary": False}, synchronize_session="fetch")


def _get_or_404(db: Session, account_id: int) -> Account:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _validate_default_payment_method(
    db: Session, payment_method_id: Optional[int]
) -> Optional[int]:
    if payment_method_id is None:
        return None
    exists = db.scalar(
        select(func.count()).select_from(PaymentMethod).where(PaymentMethod.id == payment_method_id)
    )
    if not exists:
        raise HTTPException(status_code=422, detail="Default payment method not found")
    return payment_method_id


# ------------------------------------------------------------------ #
# Public service functions                                             #
# ------------------------------------------------------------------ #


def get_accounts(db: Session) -> list[AccountResponse]:
    accounts = (
        db.query(Account)
        .order_by(Account.is_primary.desc(), Account.name)
        .all()
    )
    return [_to_response(db, a) for a in accounts]


def get_account(db: Session, account_id: int) -> AccountResponse:
    return _to_response(db, _get_or_404(db, account_id))


def create_account(db: Session, data: AccountCreate) -> AccountResponse:
    if data.is_primary:
        _clear_primary(db)

    account = Account(
        name=data.name,
        account_type=data.account_type,
        is_primary=data.is_primary,
        initial_balance=data.initial_balance,
        default_payment_method_id=_validate_default_payment_method(
            db, data.default_payment_method_id
        ),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_response(db, account)


def update_account(
    db: Session, account_id: int, data: AccountUpdate
) -> AccountResponse:
    account = _get_or_404(db, account_id)

    if data.is_primary is True:
        _clear_primary(db, exclude_id=account_id)

    payload = data.model_dump(exclude_unset=True)
    if "default_payment_method_id" in payload:
        payload["default_payment_method_id"] = _validate_default_payment_method(
            db, payload["default_payment_method_id"]
        )

    for key, value in payload.items():
        setattr(account, key, value)

    db.commit()
    db.refresh(account)
    return _to_response(db, account)


def delete_account(db: Session, account_id: int) -> None:
    account = _get_or_404(db, account_id)

    tx_count = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.account_id == account_id,
            Transaction.deleted_at.is_(None),
        )
    )
    if tx_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot delete: account has {tx_count} transaction(s). Remove them first.",
        )

    pred_count = db.scalar(
        select(func.count())
        .select_from(PredictionTemplate)
        .where(PredictionTemplate.account_id == account_id)
    )
    if pred_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot delete: account has {pred_count} prediction template(s). Remove them first.",
        )

    transfer_count = db.scalar(
        select(func.count())
        .select_from(Transfer)
        .where(
            or_(
                Transfer.from_account_id == account_id,
                Transfer.to_account_id == account_id,
            )
        )
    )
    if transfer_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot delete: account is referenced by {transfer_count} transfer(s).",
        )

    db.delete(account)
    db.commit()


def apply_balance_correction(
    db: Session, account_id: int, data: BalanceCorrectionCreate
) -> AccountResponse:
    """
    Creates a correction transaction so the running balance equals
    `target_balance` as of `correction_date`.

    correction_amount = balance_at_date - target_balance
      > 0 → expense (reduces balance toward target)
      < 0 → income (raises balance toward target)
      = 0 → no-op, but we still record the zero-amount correction for audit trail
    """
    account = _get_or_404(db, account_id)

    # Balance as of correction_date (transactions on that date are included)
    total_at_date = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), Decimal("0"))).where(
            Transaction.account_id == account_id,
            Transaction.deleted_at.is_(None),
            Transaction.transaction_date <= data.correction_date,
        )
    ) or Decimal("0")
    balance_at_date = account.initial_balance - total_at_date

    correction_amount = balance_at_date - data.target_balance

    correction_tx = Transaction(
        account_id=account_id,
        amount=correction_amount,
        transaction_date=data.correction_date,
        type="correction",
        description=data.note or "Balance correction",
        confirmed=True,
    )
    db.add(correction_tx)
    db.commit()
    db.refresh(correction_tx)
    return _to_response(db, account)
