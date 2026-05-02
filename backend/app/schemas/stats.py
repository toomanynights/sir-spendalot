from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class SpendingTodayResponse(BaseModel):
    # Net sum of today's transactions by type (positive = expense, negative = income/refund)
    daily: Decimal
    unplanned: Decimal
    predicted: Decimal


class TodayStatsResponse(BaseModel):
    account_id: int
    actual_balance: Decimal
    predicted_balance: Decimal
    # Sum of pending prediction instances scheduled before today (unresolved ghost debt).
    overdue_pending_debt: Decimal = Decimal("0")
    # Remaining expected daily spend for today: max(0, rolling_avg − daily_spent_today)
    flexible_daily: Decimal = Decimal("0")
    # Sum of pending prediction instances scheduled for today
    today_pending_total: Decimal = Decimal("0")
    spending_today: SpendingTodayResponse
    today_excluded: bool
    rolling_avg_daily_spend: Decimal
    # Mirrors Settings row for dashboard copy and threshold styling (no extra round-trip).
    rolling_average_days: int = 30
    prediction_horizon_days: int = 90
    daily_high_threshold: int = 110
    daily_low_threshold: int = 90
    # Per-account checkup state — null when the account has never been reconciled.
    last_checkup_date: date | None = None
    days_since_last_checkup: int | None = None
    checkup_notification_days: int = 30


class CategorySpendingRow(BaseModel):
    category_name: str
    total: Decimal
    tx_count: int


class CategorySpendingResponse(BaseModel):
    account_id: int
    date_from: date
    date_to: date
    total_spending: Decimal
    categories: list[CategorySpendingRow]


class SubcategorySpendingRow(BaseModel):
    subcategory: str
    total: Decimal
    tx_count: int


class CategorySubcategoryResponse(BaseModel):
    account_id: int
    category_name: str
    date_from: date
    date_to: date
    total_spending: Decimal
    subcategories: list[SubcategorySpendingRow]


class SpendingTypeRow(BaseModel):
    tx_type: str
    total: Decimal
    categories: list[CategorySpendingRow]


class SpendingByTypeResponse(BaseModel):
    account_id: int
    date_from: date
    date_to: date
    types: list[SpendingTypeRow]


class DailyTrendRow(BaseModel):
    date: date
    spending: Decimal
    rolling_average: Decimal
    status: str  # high / low / normal / zero


class DailyTrendResponse(BaseModel):
    account_id: int
    days: int
    threshold_high: int
    threshold_low: int
    points: list[DailyTrendRow]


class MonthlyComparisonRow(BaseModel):
    month: str  # YYYY-MM
    spending: Decimal
    gains: Decimal


class MonthlyComparisonResponse(BaseModel):
    account_id: int
    months: list[MonthlyComparisonRow]


class CategoryTrendRow(BaseModel):
    category_name: str
    current_total: Decimal
    previous_total: Decimal
    delta_percent: Decimal


class AnalyticsInsightsResponse(BaseModel):
    account_id: int
    date_from: date
    date_to: date
    days_above_zero: int
    longest_streak_without_unplanned: int
    days_since_last_overdue_prediction: int | None
    most_expensive_purchase_amount: Decimal | None
    most_expensive_purchase_label: str | None
    biggest_spending_day_amount: Decimal | None
    biggest_spending_day_date: date | None
    most_frequent_payment_method: str | None
    most_frequent_payment_method_count: int
    most_frequent_daily_category: str | None
    most_frequent_daily_category_count: int
    most_frequent_unplanned_category: str | None
    most_frequent_unplanned_category_count: int
    category_trends: list[CategoryTrendRow]
