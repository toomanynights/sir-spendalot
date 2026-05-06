from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import (
    TransactionBatchCreate,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.auth_service import require_auth
from app.services import transaction_service

router = APIRouter(
    prefix="/api/transactions",
    tags=["transactions"],
    dependencies=[Depends(require_auth)],
)


# NOTE: /subcategories must be declared before /{transaction_id} so FastAPI
# does not treat the literal string "subcategories" as an integer ID.
@router.get("/subcategories", response_model=list[str])
def list_subcategories(db: Session = Depends(get_db)):
    return transaction_service.get_subcategories(db)


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    subcategory: Optional[str] = Query(None, description="Partial match"),
    subcategory_id: Optional[int] = Query(None, description="Exact match by subcategory entity ID"),
    transaction_type: Optional[str] = Query(None, alias="type"),
    payment_method_id: Optional[int] = Query(None),
    include_deleted: bool = Query(False),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return transaction_service.get_transactions(
        db,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
        category_id=category_id,
        subcategory=subcategory,
        subcategory_id=subcategory_id,
        transaction_type=transaction_type,
        payment_method_id=payment_method_id,
        include_deleted=include_deleted,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    return transaction_service.create_transaction(db, data)


@router.post("/batch", response_model=list[TransactionResponse], status_code=201)
def create_transactions_batch(
    data: TransactionBatchCreate, db: Session = Depends(get_db)
):
    return transaction_service.create_transactions_batch(db, data)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    return transaction_service.get_transaction(db, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int, data: TransactionUpdate, db: Session = Depends(get_db)
):
    return transaction_service.update_transaction(db, transaction_id, data)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction_service.delete_transaction(db, transaction_id)


@router.post("/{transaction_id}/restore", response_model=TransactionResponse)
def restore_transaction(transaction_id: int, db: Session = Depends(get_db)):
    return transaction_service.restore_transaction(db, transaction_id)
