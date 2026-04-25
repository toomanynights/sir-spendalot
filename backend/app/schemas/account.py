from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AccountType(str, Enum):
    current = "current"
    savings = "savings"


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    is_primary: bool = False
    initial_balance: Decimal = Field(default=Decimal("0"), decimal_places=2)
    default_payment_method_id: Optional[int] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_type: Optional[AccountType] = None
    is_primary: Optional[bool] = None
    initial_balance: Optional[Decimal] = Field(None, decimal_places=2)
    default_payment_method_id: Optional[int] = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    account_type: str
    is_primary: bool
    initial_balance: Decimal
    default_payment_method_id: Optional[int] = None
    current_balance: Decimal
    created_at: datetime


class BalanceCorrectionCreate(BaseModel):
    """
    Adjusts an account balance to target_balance as of correction_date.
    correction_date is required — it determines where in the timeline the
    correction lands and affects all subsequent balance calculations and forecasts.
    """

    target_balance: Decimal = Field(..., decimal_places=2)
    correction_date: date = Field(
        ..., description="Date the correction applies to. Required."
    )
    note: Optional[str] = Field(None, max_length=255)
