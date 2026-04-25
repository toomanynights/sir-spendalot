from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.prediction import PredictionInstance
from app.models.transaction import Transaction
from app.services import settings_service
from app.schemas.transaction import (
    TransactionBatchCreate,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)


# ------------------------------------------------------------------ #
# Internal helpers                                                     #
# ------------------------------------------------------------------ #


def _get_or_404(db: Session, transaction_id: int) -> Transaction:
    tx = db.get(Transaction, transaction_id)
    if not tx or tx.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


def _realm_deed_requirements(db: Session) -> tuple[bool, bool]:
    s = settings_service.get_settings(db)
    return s.require_payment_method, s.require_subcategory


def _validate_deed_requirements(
    db: Session,
    *,
    tx_type: str,
    payment_method_id: Optional[int],
    subcategory: Optional[str],
) -> None:
    """Realm Settings toggles apply to user-entered daily/unplanned deeds only."""
    if tx_type not in ("daily", "unplanned"):
        return
    req_pm, req_sub = _realm_deed_requirements(db)
    if req_pm and payment_method_id is None:
        raise HTTPException(
            status_code=422,
            detail="Payment method is required by realm settings.",
        )
    sub_ok = subcategory is not None and str(subcategory).strip() != ""
    if req_sub and not sub_ok:
        raise HTTPException(
            status_code=422,
            detail="Subcategory is required by realm settings.",
        )


def _validate_fks(
    db: Session,
    account_id: Optional[int],
    category_id: Optional[int],
    payment_method_id: Optional[int],
) -> None:
    if account_id is not None and not db.get(Account, account_id):
        raise HTTPException(
            status_code=422, detail=f"Account {account_id} not found."
        )
    if category_id is not None and not db.get(Category, category_id):
        raise HTTPException(
            status_code=422, detail=f"Category {category_id} not found."
        )
    if payment_method_id is not None and not db.get(PaymentMethod, payment_method_id):
        raise HTTPException(
            status_code=422, detail=f"Payment method {payment_method_id} not found."
        )


def _build_transaction(data: TransactionCreate) -> Transaction:
    return Transaction(
        account_id=data.account_id,
        category_id=data.category_id,
        subcategory=data.subcategory,
        amount=data.amount,
        transaction_date=data.transaction_date,
        type=data.type,
        description=data.description,
        payment_method_id=data.payment_method_id,
        confirmed=data.confirmed,
    )


# ------------------------------------------------------------------ #
# Public service functions                                             #
# ------------------------------------------------------------------ #


def get_transactions(
    db: Session,
    *,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory: Optional[str] = None,
    transaction_type: Optional[str] = None,
    payment_method_id: Optional[int] = None,
    include_deleted: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> list[TransactionResponse]:
    q = db.query(Transaction)

    if not include_deleted:
        q = q.filter(Transaction.deleted_at.is_(None))

    if date_from:
        q = q.filter(Transaction.transaction_date >= date_from)
    if date_to:
        q = q.filter(Transaction.transaction_date <= date_to)
    if account_id is not None:
        q = q.filter(Transaction.account_id == account_id)
    if category_id is not None:
        category_ids = db.scalars(
            select(Category.id).where(
                or_(Category.id == category_id, Category.parent_id == category_id)
            )
        ).all()
        if category_ids:
            q = q.filter(Transaction.category_id.in_(category_ids))
        else:
            q = q.filter(Transaction.category_id == category_id)
    if subcategory is not None:
        q = q.filter(Transaction.subcategory.ilike(f"%{subcategory}%"))
    if transaction_type is not None:
        q = q.filter(Transaction.type == transaction_type)
    if payment_method_id is not None:
        q = q.filter(Transaction.payment_method_id == payment_method_id)

    transactions = (
        q.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return [TransactionResponse.model_validate(tx) for tx in transactions]


def get_transaction(db: Session, transaction_id: int) -> TransactionResponse:
    return TransactionResponse.model_validate(_get_or_404(db, transaction_id))


def create_transaction(db: Session, data: TransactionCreate) -> TransactionResponse:
    _validate_fks(db, data.account_id, data.category_id, data.payment_method_id)
    _validate_deed_requirements(
        db,
        tx_type=data.type.value,
        payment_method_id=data.payment_method_id,
        subcategory=data.subcategory,
    )
    tx = _build_transaction(data)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


def create_transactions_batch(
    db: Session, data: TransactionBatchCreate
) -> list[TransactionResponse]:
    for item in data.transactions:
        _validate_fks(db, item.account_id, item.category_id, item.payment_method_id)
        _validate_deed_requirements(
            db,
            tx_type=item.type.value,
            payment_method_id=item.payment_method_id,
            subcategory=item.subcategory,
        )

    transactions = [_build_transaction(item) for item in data.transactions]
    db.add_all(transactions)
    db.commit()
    for tx in transactions:
        db.refresh(tx)
    return [TransactionResponse.model_validate(tx) for tx in transactions]


def update_transaction(
    db: Session, transaction_id: int, data: TransactionUpdate
) -> TransactionResponse:
    tx = _get_or_404(db, transaction_id)

    updates = data.model_dump(exclude_unset=True)
    _validate_fks(
        db,
        account_id=None,
        category_id=updates.get("category_id"),
        payment_method_id=updates.get("payment_method_id"),
    )

    merged_type = str(updates["type"]) if "type" in updates else str(tx.type)
    merged_pm = (
        updates["payment_method_id"] if "payment_method_id" in updates else tx.payment_method_id
    )
    merged_sub = updates["subcategory"] if "subcategory" in updates else tx.subcategory
    _validate_deed_requirements(
        db,
        tx_type=merged_type,
        payment_method_id=merged_pm,
        subcategory=merged_sub,
    )

    for key, value in updates.items():
        setattr(tx, key, value)

    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


def delete_transaction(db: Session, transaction_id: int) -> None:
    tx = _get_or_404(db, transaction_id)
    if tx.type == "predicted":
        instance = (
            db.query(PredictionInstance)
            .filter(PredictionInstance.transaction_id == tx.id)
            .first()
        )
        if instance and instance.status == "confirmed":
            instance.status = "pending"
            instance.confirmed_date = None
            instance.confirmed_amount = None
    tx.deleted_at = datetime.now(timezone.utc)
    db.commit()


def restore_transaction(db: Session, transaction_id: int) -> TransactionResponse:
    tx = db.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.deleted_at is None:
        raise HTTPException(status_code=409, detail="Transaction is not deleted.")

    if tx.type == "predicted":
        instance = (
            db.query(PredictionInstance)
            .filter(PredictionInstance.transaction_id == tx.id)
            .first()
        )
        if instance and instance.status == "pending":
            instance.status = "confirmed"
            instance.confirmed_date = tx.transaction_date
            instance.confirmed_amount = tx.amount

    tx.deleted_at = None
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


def get_subcategories(db: Session) -> list[str]:
    rows = (
        db.execute(
            select(Transaction.subcategory)
            .where(
                Transaction.subcategory.is_not(None),
                Transaction.deleted_at.is_(None),
            )
            .distinct()
            .order_by(Transaction.subcategory)
        )
        .scalars()
        .all()
    )
    return list(rows)
