from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TransactionType(str, Enum):
    daily = "daily"
    unplanned = "unplanned"
    predicted = "predicted"
    transfer = "transfer"
    correction = "correction"


class TransactionCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    subcategory: Optional[str] = Field(None, max_length=100)
    # Positive = expense (reduces balance), negative = income (increases balance)
    amount: Decimal = Field(..., decimal_places=2)
    transaction_date: date
    type: TransactionType
    description: Optional[str] = Field(None, max_length=500)
    payment_method_id: Optional[int] = None
    confirmed: bool = True


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    subcategory: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, decimal_places=2)
    transaction_date: Optional[date] = None
    type: Optional[TransactionType] = None
    description: Optional[str] = Field(None, max_length=500)
    payment_method_id: Optional[int] = None
    confirmed: Optional[bool] = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    category_id: Optional[int]
    subcategory_id: Optional[int] = None
    subcategory: Optional[str]
    amount: Decimal
    transaction_date: date
    type: str
    description: Optional[str]
    payment_method_id: Optional[int]
    payment_method_name: Optional[str] = None
    category_name: Optional[str] = None
    top_category_name: Optional[str] = None
    confirmed: bool

    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]


class TransactionBatchCreate(BaseModel):
    """Wraps multiple transactions into a single atomic insert."""

    transactions: list[TransactionCreate] = Field(..., min_length=1)
