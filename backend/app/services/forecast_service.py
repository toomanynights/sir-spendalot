from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.excluded_day import ExcludedDay
from app.models.prediction import PredictionInstance
from app.models.settings import Settings
from app.models.transaction import Transaction
from app.schemas.prediction import (
    ForecastDayResponse,
    ForecastResponse,
    PerilResponse,
    PerilsResponse,
)


# ------------------------------------------------------------------ #
# Internal helpers                                                     #
# ------------------------------------------------------------------ #


def _resolve_account(db: Session, account_id: Optional[int]) -> Account:
    """
    Return the Account to forecast for. If account_id is not provided, fall back to
    the primary account from settings, then to the first account with is_primary=True.
    Raises 422 if nothing can be resolved.
    """
    if account_id is not None:
        account = db.get(Account, account_id)
        if not account:
            raise HTTPException(status_code=422, detail=f"Account {account_id} not found.")
        return account

    settings_row = db.query(Settings).filter(Settings.id == 1).first()
    if settings_row and settings_row.primary_account_id:
        account = db.get(Account, settings_row.primary_account_id)
        if account:
            return account

    account = db.query(Account).filter(Account.is_primary.is_(True)).first()
    if account:
        return account

    raise HTTPException(
        status_code=422,
        detail="No account_id provided and no primary account is configured.",
    )


def _get_settings(db: Session) -> Settings:
    row = db.query(Settings).filter(Settings.id == 1).first()
    if row:
        return row
    # Return a transient defaults object if the settings row hasn't been seeded yet
    return Settings(prediction_horizon_days=90, rolling_average_days=30)


def _get_excluded_dates(db: Session) -> set[date]:
    return set(row[0] for row in db.query(ExcludedDay.excluded_date).all())


def _get_actual_balance(db: Session, account: Account, today: date) -> Decimal:
    """
    True balance: initial_balance minus the net of all non-deleted transactions up to today.
    (positive transaction amount = expense = reduces balance)
    """
    total = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.account_id == account.id,
        Transaction.transaction_date <= today,
        Transaction.deleted_at.is_(None),
    ).scalar()
    return account.initial_balance - Decimal(str(total))


def _get_overdue_pending_debt(db: Session, account_id: int, today: date) -> Decimal:
    """
    Sum of pending prediction instances scheduled before today that were never confirmed
    or skipped. These represent expenses expected to have occurred but not yet recorded —
    "ghost debt" that must be deducted from the forecast starting balance.
    """
    total = db.query(func.coalesce(func.sum(PredictionInstance.amount), 0)).filter(
        PredictionInstance.account_id == account_id,
        PredictionInstance.scheduled_date < today,
        PredictionInstance.status == "pending",
    ).scalar()
    return Decimal(str(total))


def _calculate_rolling_average(
    db: Session,
    account_id: int,
    rolling_days: int,
    today: date,
    excluded_dates: set[date],
) -> Decimal:
    """
    Average of daily-type net spending over the last `rolling_days` non-excluded days.
    Window runs back from yesterday (last complete day).
    Only type='daily' transactions count — unplanned/predicted/transfers are excluded
    to avoid distorting the background spending baseline.
    """
    window: list[date] = []
    current = today - timedelta(days=1)
    # Safety cap: don't scan more than rolling_days * 10 + 365 days back
    limit = today - timedelta(days=rolling_days * 10 + 365)

    while len(window) < rolling_days and current >= limit:
        if current not in excluded_dates:
            window.append(current)
        current -= timedelta(days=1)

    if not window:
        return Decimal("0")

    total = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.account_id == account_id,
        Transaction.transaction_date.in_(window),
        Transaction.deleted_at.is_(None),
        Transaction.type == "daily",
    ).scalar()

    return Decimal(str(total)) / len(window)


def _build_forecast(
    db: Session,
    account: Account,
    horizon_days: int,
    rolling_avg: Decimal,
    actual_balance: Decimal,
    overdue_debt: Decimal,
) -> tuple[list[ForecastDayResponse], Decimal, Decimal]:
    """
    Build the forecast array starting from today.

    Today (day 0):
      predicted_balance = actual_balance
                        − overdue_debt          (past-day pending instances never resolved)
                        − pending prediction instances for today
                        − flexible_daily
      where flexible_daily = max(0, rolling_avg − daily_type_spent_today)

    Days 1..N:
      balance = prev_balance − rolling_avg − sum(pending instances for that day)

    Returns:
      (forecast, flexible_daily, today_pending_total)
    """
    today = date.today()

    # ── Today's flexible daily ────────────────────────────────────────
    today_daily_spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.account_id == account.id,
        Transaction.transaction_date == today,
        Transaction.deleted_at.is_(None),
        Transaction.type == "daily",
    ).scalar()
    today_daily_spent = Decimal(str(today_daily_spent))
    flexible_daily = max(Decimal("0"), rolling_avg - today_daily_spent)

    # ── Load all pending instances in the window (today..today+horizon) ──
    all_instances = (
        db.query(PredictionInstance)
        .filter(
            PredictionInstance.account_id == account.id,
            PredictionInstance.scheduled_date >= today,
            PredictionInstance.scheduled_date <= today + timedelta(days=horizon_days),
            PredictionInstance.status == "pending",
        )
        .all()
    )

    instances_by_date: dict[date, list[PredictionInstance]] = {}
    for inst in all_instances:
        instances_by_date.setdefault(inst.scheduled_date, []).append(inst)

    # ── Day 0: today ──────────────────────────────────────────────────
    today_pending_total = sum(
        (inst.amount for inst in instances_by_date.get(today, [])),
        Decimal("0"),
    )
    today_forecast_balance = actual_balance - overdue_debt - flexible_daily - today_pending_total

    forecast = [ForecastDayResponse(date=today, predicted_balance=today_forecast_balance)]
    balance = today_forecast_balance

    # ── Days 1..N ─────────────────────────────────────────────────────
    for i in range(1, horizon_days + 1):
        day = today + timedelta(days=i)
        balance -= rolling_avg
        for inst in instances_by_date.get(day, []):
            balance -= inst.amount
        forecast.append(ForecastDayResponse(date=day, predicted_balance=balance))

    return forecast, flexible_daily, today_pending_total


def _find_perils(forecast: list[ForecastDayResponse], count: int) -> list[PerilResponse]:
    """
    Sequentially find the lowest balance points in the forecast.
    Peril N+1 is the minimum balance in all days AFTER peril N's date.
    """
    perils: list[PerilResponse] = []
    remaining = list(forecast)

    for _ in range(count):
        if not remaining:
            break
        nadir = min(remaining, key=lambda d: d.predicted_balance)
        perils.append(PerilResponse(date=nadir.date, predicted_balance=nadir.predicted_balance))
        remaining = [d for d in remaining if d.date > nadir.date]

    return perils


# ------------------------------------------------------------------ #
# Public service functions                                             #
# ------------------------------------------------------------------ #


def get_forecast(
    db: Session,
    *,
    account_id: Optional[int] = None,
    horizon_days: Optional[int] = None,
) -> ForecastResponse:
    account = _resolve_account(db, account_id)
    settings = _get_settings(db)
    horizon = horizon_days if horizon_days is not None else settings.prediction_horizon_days
    excluded = _get_excluded_dates(db)
    today = date.today()

    actual_balance = _get_actual_balance(db, account, today)
    overdue_debt = _get_overdue_pending_debt(db, account.id, today)
    rolling_avg = _calculate_rolling_average(
        db, account.id, settings.rolling_average_days, today, excluded
    )
    forecast, flexible_daily, today_pending_total = _build_forecast(
        db, account, horizon, rolling_avg, actual_balance, overdue_debt
    )

    return ForecastResponse(
        account_id=account.id,
        actual_balance=actual_balance,
        rolling_avg_daily_spend=rolling_avg,
        overdue_pending_debt=overdue_debt,
        flexible_daily=flexible_daily,
        today_pending_total=today_pending_total,
        forecast=forecast,
    )


def get_lowest_perils(
    db: Session,
    *,
    account_id: Optional[int] = None,
    count: int = 2,
    horizon_days: Optional[int] = None,
) -> PerilsResponse:
    forecast_data = get_forecast(db, account_id=account_id, horizon_days=horizon_days)
    perils = _find_perils(forecast_data.forecast, count)

    return PerilsResponse(account_id=forecast_data.account_id, perils=perils)
