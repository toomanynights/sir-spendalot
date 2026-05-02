from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class PredictionFrequency(str, Enum):
    every_n_days = "every_n_days"  # fires every N days from start_date (interval=N)
    monthly = "monthly"            # fires on day_of_month every calendar month
    yearly = "yearly"              # fires on start_date.month/day every year
    once = "once"                  # fires once on start_date, never again


class PredictionType(str, Enum):
    income = "income"
    expense = "expense"


class PredictionStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    skipped = "skipped"


class PredictionTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_id: int
    # User always provides a positive amount; sign is applied internally based on type.
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    type: PredictionType
    frequency: PredictionFrequency
    # Required when frequency=every_n_days; ignored for all other frequencies.
    interval: Optional[int] = Field(None, ge=1)
    # Required when frequency=monthly (day of month 1-31); ignored for other frequencies.
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    start_date: date
    # Optional default payment method applied when confirming instances of this template.
    payment_method_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_frequency_fields(self) -> "PredictionTemplateCreate":
        if self.frequency == PredictionFrequency.every_n_days and self.interval is None:
            raise ValueError("interval is required for every_n_days frequency")
        if self.frequency == PredictionFrequency.monthly and self.day_of_month is None:
            raise ValueError("day_of_month is required for monthly frequency")
        return self


class PredictionTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_id: Optional[int] = None
    # amount and type must be provided together (can't change sign without knowing direction)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    type: Optional[PredictionType] = None
    frequency: Optional[PredictionFrequency] = None
    interval: Optional[int] = Field(None, ge=1)
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    start_date: Optional[date] = None
    # Send null explicitly to clear; omit field to leave unchanged.
    payment_method_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_update(self) -> "PredictionTemplateUpdate":
        if (self.amount is None) != (self.type is None):
            raise ValueError("amount and type must be provided together when updating")
        return self


class PredictionTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    account_id: int
    # Stored signed: positive = expense (reduces balance), negative = income (adds to balance)
    amount: Decimal
    frequency: str
    interval: Optional[int]
    day_of_month: Optional[int]
    start_date: date
    paused: bool
    payment_method_id: Optional[int]
    payment_method_name: Optional[str]
    last_generated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def type(self) -> str:
        return "income" if self.amount < 0 else "expense"


class PredictionInstanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    template_name: Optional[str]
    template_payment_method_id: Optional[int]
    template_payment_method_name: Optional[str]
    account_id: int
    amount: Decimal
    scheduled_date: date
    status: str
    confirmed_date: Optional[date]
    confirmed_amount: Optional[Decimal]
    transaction_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class ForecastDayResponse(BaseModel):
    date: date
    predicted_balance: Decimal


class ForecastResponse(BaseModel):
    account_id: int
    # Today's actual balance (all confirmed transactions up to today)
    actual_balance: Decimal
    # Rolling average of daily-type spending (positive = net expense drain per day)
    rolling_avg_daily_spend: Decimal
    # Sum of pending prediction instances whose scheduled_date is before today.
    # These represent "ghost debt" — expected expenses that were never confirmed or skipped.
    # The forecast starting balance is actual_balance − overdue_pending_debt.
    overdue_pending_debt: Decimal = Decimal("0")
    # Remaining expected daily spend for today: max(0, rolling_avg − daily_spent_today)
    flexible_daily: Decimal = Decimal("0")
    # Sum of pending prediction instances scheduled for today
    today_pending_total: Decimal = Decimal("0")
    # Starts from today (day 0 = today's forecast), then day 1..N projected
    forecast: list[ForecastDayResponse]


class PerilResponse(BaseModel):
    date: date
    predicted_balance: Decimal


class PerilsResponse(BaseModel):
    account_id: int
    # Sequential lowest balance points: peril[0] is the global min,
    # peril[1] is the min after peril[0]'s date, etc.
    perils: list[PerilResponse]


class PredictionInstanceConfirm(BaseModel):
    """
    Confirms a pending prediction instance.
    confirmed_date defaults to scheduled_date if omitted.
    confirmed_amount defaults to template amount if omitted.
    payment_method_id overrides the template's default payment method on the created transaction.
    create_transaction: if True, a real transaction record is also created.
    """

    confirmed_date: Optional[date] = None
    confirmed_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    payment_method_id: Optional[int] = None
    create_transaction: bool = True
