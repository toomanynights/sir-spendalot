from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.excluded_day import ExcludedDay
from app.models.prediction import PredictionInstance, PredictionTemplate
from app.models.settings import Settings
from app.models.transaction import Transaction
from app.schemas.stats import (
    AnalyticsInsightsResponse,
    CategorySpendingResponse,
    CategorySpendingRow,
    CategorySubcategoryResponse,
    CategoryTrendRow,
    DailyTrendResponse,
    DailyTrendRow,
    MonthlyComparisonResponse,
    MonthlyComparisonRow,
    SpendingByTypeResponse,
    SpendingTodayResponse,
    SpendingTypeRow,
    SubcategorySpendingRow,
    TodayStatsResponse,
)
from app.services import account_checkup_service, forecast_service


def _sum_type(db: Session, account_id: int, today: date, transaction_type: str) -> Decimal:
    result = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.account_id == account_id,
        Transaction.transaction_date == today,
        Transaction.deleted_at.is_(None),
        Transaction.type == transaction_type,
    ).scalar()
    return Decimal(str(result))


def get_today_stats(db: Session, *, account_id: Optional[int] = None) -> TodayStatsResponse:
    today = date.today()

    # Reuse forecast_service for actual + predicted balance (horizon=1 is enough for today)
    forecast_data = forecast_service.get_forecast(db, account_id=account_id, horizon_days=1)
    resolved_account_id = forecast_data.account_id

    # Day 0 of the forecast IS today's predicted balance
    predicted_balance = forecast_data.forecast[0].predicted_balance

    spending = SpendingTodayResponse(
        daily=_sum_type(db, resolved_account_id, today, "daily"),
        unplanned=_sum_type(db, resolved_account_id, today, "unplanned"),
        predicted=_sum_type(db, resolved_account_id, today, "predicted"),
    )

    today_excluded = (
        db.query(ExcludedDay)
        .filter(ExcludedDay.excluded_date == today)
        .first()
    ) is not None

    settings_row = db.query(Settings).filter(Settings.id == 1).first()
    rolling_average_days = settings_row.rolling_average_days if settings_row else 30
    prediction_horizon_days = settings_row.prediction_horizon_days if settings_row else 90
    daily_high_threshold = settings_row.daily_high_threshold if settings_row else 110
    daily_low_threshold = settings_row.daily_low_threshold if settings_row else 90
    checkup_notification_days = (
        settings_row.checkup_notification_days if settings_row else 30
    )

    last_checkup_date, days_since_last_checkup = (
        account_checkup_service.get_last_checkup_info(db, resolved_account_id)
    )

    return TodayStatsResponse(
        account_id=resolved_account_id,
        actual_balance=forecast_data.actual_balance,
        predicted_balance=predicted_balance,
        overdue_pending_debt=forecast_data.overdue_pending_debt,
        flexible_daily=forecast_data.flexible_daily,
        today_pending_total=forecast_data.today_pending_total,
        spending_today=spending,
        today_excluded=today_excluded,
        rolling_avg_daily_spend=forecast_data.rolling_avg_daily_spend,
        rolling_average_days=rolling_average_days,
        prediction_horizon_days=prediction_horizon_days,
        daily_high_threshold=daily_high_threshold,
        daily_low_threshold=daily_low_threshold,
        last_checkup_date=last_checkup_date,
        days_since_last_checkup=days_since_last_checkup,
        checkup_notification_days=checkup_notification_days,
    )


def _resolve_account_id(db: Session, account_id: Optional[int]) -> int:
    if account_id is not None:
        account = db.get(Account, account_id)
        if not account:
            raise HTTPException(status_code=422, detail=f"Account {account_id} not found.")
        return account.id

    settings_row = db.query(Settings).filter(Settings.id == 1).first()
    if settings_row and settings_row.primary_account_id:
        account = db.get(Account, settings_row.primary_account_id)
        if account:
            return account.id

    account = db.query(Account).filter(Account.is_primary.is_(True)).first()
    if account:
        return account.id

    account = db.query(Account).first()
    if account:
        return account.id

    raise HTTPException(
        status_code=422,
        detail="No account_id provided and no primary account is configured.",
    )


def _base_spending_query(db: Session, account_id: int, date_from: date, date_to: date):
    return (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account_id,
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
            Transaction.deleted_at.is_(None),
            Transaction.type.in_(["daily", "unplanned", "predicted"]),
            Transaction.amount > 0,
        )
    )


def _normalized_spending_type(tx_type: Optional[str]) -> Optional[str]:
    if tx_type is None:
        return None
    t = str(tx_type).strip().lower()
    return t if t in {"daily", "unplanned", "predicted"} else None


def get_spending_by_category(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    account_id: Optional[int] = None,
    tx_type: Optional[str] = None,
) -> CategorySpendingResponse:
    resolved = _resolve_account_id(db, account_id)
    normalized_type = _normalized_spending_type(tx_type)
    q = _base_spending_query(db, resolved, date_from, date_to)
    if normalized_type:
        q = q.filter(Transaction.type == normalized_type)
    rows = q.all()
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    counts: dict[str, int] = defaultdict(int)

    for tx in rows:
        # Use the concrete transaction category for analytics readability.
        label = tx.category_name or tx.top_category_name or "Uncategorized"
        totals[label] += Decimal(str(tx.amount))
        counts[label] += 1

    categories = [
        CategorySpendingRow(category_name=name, total=total, tx_count=counts[name])
        for name, total in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]
    total_spending = sum((r.total for r in categories), Decimal("0"))
    return CategorySpendingResponse(
        account_id=resolved,
        date_from=date_from,
        date_to=date_to,
        total_spending=total_spending,
        categories=categories,
    )


def get_spending_by_subcategory(
    db: Session,
    *,
    category_name: str,
    date_from: date,
    date_to: date,
    account_id: Optional[int] = None,
    tx_type: Optional[str] = None,
) -> CategorySubcategoryResponse:
    resolved = _resolve_account_id(db, account_id)
    normalized_type = _normalized_spending_type(tx_type)
    q = _base_spending_query(db, resolved, date_from, date_to)
    if normalized_type:
        q = q.filter(Transaction.type == normalized_type)
    rows = q.all()
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    counts: dict[str, int] = defaultdict(int)

    for tx in rows:
        top = tx.category_name or tx.top_category_name or "Uncategorized"
        if top != category_name:
            continue
        label = tx.subcategory.strip() if tx.subcategory and tx.subcategory.strip() else "Unspecified"
        totals[label] += Decimal(str(tx.amount))
        counts[label] += 1

    subcategories = [
        SubcategorySpendingRow(subcategory=name, total=total, tx_count=counts[name])
        for name, total in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]
    total_spending = sum((r.total for r in subcategories), Decimal("0"))
    return CategorySubcategoryResponse(
        account_id=resolved,
        category_name=category_name,
        date_from=date_from,
        date_to=date_to,
        total_spending=total_spending,
        subcategories=subcategories,
    )


def get_spending_by_type(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    account_id: Optional[int] = None,
) -> SpendingByTypeResponse:
    resolved = _resolve_account_id(db, account_id)
    rows = _base_spending_query(db, resolved, date_from, date_to).all()
    predicted_tx_ids = [tx.id for tx in rows if str(tx.type) == "predicted"]
    template_name_by_tx_id: dict[int, str] = {}
    if predicted_tx_ids:
        template_links = (
            db.query(PredictionInstance.transaction_id, PredictionTemplate.name)
            .join(PredictionTemplate, PredictionTemplate.id == PredictionInstance.template_id)
            .filter(PredictionInstance.transaction_id.in_(predicted_tx_ids))
            .all()
        )
        for tx_id, template_name in template_links:
            if tx_id and template_name and template_name.strip():
                template_name_by_tx_id[int(tx_id)] = template_name.strip()
    type_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    type_category_totals: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: Decimal("0")))
    type_category_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for tx in rows:
        tx_type = str(tx.type)
        if tx_type == "predicted":
            top = template_name_by_tx_id.get(tx.id)
            if not top and tx.description and tx.description.strip():
                desc = tx.description.strip()
                top = desc[len("Confirmed: ") :].strip() if desc.startswith("Confirmed: ") else desc
            if not top:
                top = "Scheduled"
        else:
            top = tx.category_name or tx.top_category_name or "Uncategorized"
        amount = Decimal(str(tx.amount))
        type_totals[tx_type] += amount
        type_category_totals[tx_type][top] += amount
        type_category_counts[tx_type][top] += 1

    ordered_types = ["daily", "unplanned", "predicted"]
    result_rows: list[SpendingTypeRow] = []
    for tx_type in ordered_types:
        cat_totals = type_category_totals.get(tx_type, {})
        categories = [
            CategorySpendingRow(
                category_name=name,
                total=total,
                tx_count=type_category_counts[tx_type][name],
            )
            for name, total in sorted(cat_totals.items(), key=lambda item: item[1], reverse=True)
        ]
        if not categories and type_totals.get(tx_type, Decimal("0")) <= 0:
            continue
        result_rows.append(
            SpendingTypeRow(
                tx_type=tx_type,
                total=type_totals.get(tx_type, Decimal("0")),
                categories=categories,
            )
        )

    return SpendingByTypeResponse(
        account_id=resolved,
        date_from=date_from,
        date_to=date_to,
        types=result_rows,
    )


def get_daily_trend(
    db: Session, *, days: int = 30, account_id: Optional[int] = None
) -> DailyTrendResponse:
    resolved = _resolve_account_id(db, account_id)
    settings_row = db.query(Settings).filter(Settings.id == 1).first()
    threshold_high = settings_row.daily_high_threshold if settings_row else 110
    threshold_low = settings_row.daily_low_threshold if settings_row else 90
    baseline = get_today_stats(db, account_id=resolved).rolling_avg_daily_spend
    high_mult = Decimal(str(threshold_high)) / Decimal("100")
    low_mult = Decimal(str(threshold_low)) / Decimal("100")

    today = date.today()
    start = today - timedelta(days=max(1, days) - 1)
    points: list[DailyTrendRow] = []
    for i in range(max(1, days)):
        d = start + timedelta(days=i)
        spend = _sum_type(db, resolved, d, "daily")
        if spend <= 0:
            status = "zero"
        elif baseline > 0 and spend >= baseline * high_mult:
            status = "high"
        elif baseline > 0 and spend <= baseline * low_mult:
            status = "low"
        else:
            status = "normal"
        points.append(
            DailyTrendRow(
                date=d,
                spending=spend,
                rolling_average=baseline,
                status=status,
            )
        )

    return DailyTrendResponse(
        account_id=resolved,
        days=max(1, days),
        threshold_high=threshold_high,
        threshold_low=threshold_low,
        points=points,
    )


def get_monthly_comparison(
    db: Session, *, account_id: Optional[int] = None, months: int = 6
) -> MonthlyComparisonResponse:
    resolved = _resolve_account_id(db, account_id)
    months = max(1, min(months, 24))
    today = date.today().replace(day=1)
    month_starts: list[date] = []
    for i in range(months - 1, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            y -= 1
            m += 12
        month_starts.append(date(y, m, 1))

    rows: list[MonthlyComparisonRow] = []
    for idx, month_start in enumerate(month_starts):
        if idx == len(month_starts) - 1:
            next_month = date(today.year + (1 if today.month == 12 else 0), 1 if today.month == 12 else today.month + 1, 1)
        else:
            next_month = month_starts[idx + 1]
        txs = (
            db.query(Transaction.amount)
            .filter(
                Transaction.account_id == resolved,
                Transaction.deleted_at.is_(None),
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date < next_month,
                Transaction.type.in_(["daily", "unplanned", "predicted"]),
            )
            .all()
        )
        spending = Decimal("0")
        gains = Decimal("0")
        for (amount,) in txs:
            n = Decimal(str(amount))
            if n > 0:
                spending += n
            elif n < 0:
                gains += -n
        rows.append(
            MonthlyComparisonRow(
                month=f"{month_start.year:04d}-{month_start.month:02d}",
                spending=spending,
                gains=gains,
            )
        )

    return MonthlyComparisonResponse(account_id=resolved, months=rows)


def get_analytics_insights(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    account_id: Optional[int] = None,
) -> AnalyticsInsightsResponse:
    if date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be <= date_to.")
    resolved = _resolve_account_id(db, account_id)
    account = db.get(Account, resolved)
    if not account:
        raise HTTPException(status_code=422, detail=f"Account {resolved} not found.")

    txs = (
        db.query(Transaction)
        .filter(
            Transaction.account_id == resolved,
            Transaction.deleted_at.is_(None),
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
            Transaction.type.in_(["daily", "unplanned", "predicted"]),
        )
        .all()
    )

    # Biggest spending day (sum positive amounts by date)
    day_totals: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
    for tx in txs:
        amount = Decimal(str(tx.amount))
        if amount > 0:
            day_totals[tx.transaction_date] += amount
    biggest_day_date = None
    biggest_day_amount = None
    if day_totals:
        biggest_day_date, biggest_day_amount = max(day_totals.items(), key=lambda item: item[1])

    # Most expensive unplanned purchase
    max_unplanned_tx = None
    for tx in txs:
        amount = Decimal(str(tx.amount))
        if amount <= 0 or tx.type != "unplanned":
            continue
        if max_unplanned_tx is None or amount > Decimal(str(max_unplanned_tx.amount)):
            max_unplanned_tx = tx

    # Most frequent payment method
    method_counts: dict[str, int] = defaultdict(int)
    for tx in txs:
        if tx.payment_method_name:
            method_counts[tx.payment_method_name] += 1
    most_freq_method = None
    most_freq_method_count = 0
    if method_counts:
        most_freq_method, most_freq_method_count = max(method_counts.items(), key=lambda item: item[1])

    # Most frequent categories by type (positive spend only)
    daily_cat_counts: dict[str, int] = defaultdict(int)
    unplanned_cat_counts: dict[str, int] = defaultdict(int)
    for tx in txs:
        amount = Decimal(str(tx.amount))
        if amount <= 0:
            continue
        name = tx.top_category_name or tx.category_name or "Uncategorized"
        if tx.type == "daily":
            daily_cat_counts[name] += 1
        elif tx.type == "unplanned":
            unplanned_cat_counts[name] += 1
    most_freq_daily_category = None
    most_freq_daily_category_count = 0
    if daily_cat_counts:
        most_freq_daily_category, most_freq_daily_category_count = max(
            daily_cat_counts.items(), key=lambda item: item[1]
        )
    most_freq_unplanned_category = None
    most_freq_unplanned_category_count = 0
    if unplanned_cat_counts:
        most_freq_unplanned_category, most_freq_unplanned_category_count = max(
            unplanned_cat_counts.items(), key=lambda item: item[1]
        )

    # Longest streak without unplanned spending (calendar days, scoped to selected period)
    unplanned_dates = {
        tx.transaction_date
        for tx in txs
        if tx.type == "unplanned" and Decimal(str(tx.amount)) > 0
    }
    longest_streak_without_unplanned = 0
    run = 0
    cursor = date_from
    while cursor <= date_to:
        if cursor in unplanned_dates:
            run = 0
        else:
            run += 1
            longest_streak_without_unplanned = max(longest_streak_without_unplanned, run)
        cursor += timedelta(days=1)

    # Days above zero (trailing streak up to today, from daily account balance)
    today = date.today()
    start_for_balance = max(date_from, today - timedelta(days=365))
    balance_txs = (
        db.query(Transaction.transaction_date, func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.account_id == resolved,
            Transaction.deleted_at.is_(None),
            Transaction.transaction_date <= today,
        )
        .group_by(Transaction.transaction_date)
        .all()
    )
    by_date = {d: Decimal(str(v)) for d, v in balance_txs}
    balance = Decimal(str(account.initial_balance))
    for d in sorted(k for k in by_date.keys() if k < start_for_balance):
        balance -= by_date[d]
    days_above_zero = 0
    cursor = start_for_balance
    while cursor <= today:
        balance -= by_date.get(cursor, Decimal("0"))
        if balance > 0:
            days_above_zero += 1
        else:
            days_above_zero = 0
        cursor += timedelta(days=1)

    # Days since last overdue prediction
    latest_overdue = (
        db.query(func.max(PredictionInstance.scheduled_date))
        .filter(
            PredictionInstance.account_id == resolved,
            PredictionInstance.status == "pending",
            PredictionInstance.scheduled_date < today,
        )
        .scalar()
    )
    days_since_last_overdue = None
    if latest_overdue:
        days_since_last_overdue = (today - latest_overdue).days

    # Category trends: current period vs immediately previous period (same length)
    period_days = max(1, (date_to - date_from).days + 1)
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=period_days - 1)

    current = get_spending_by_category(
        db,
        date_from=date_from,
        date_to=date_to,
        account_id=resolved,
    )
    previous = get_spending_by_category(
        db,
        date_from=prev_from,
        date_to=prev_to,
        account_id=resolved,
    )
    previous_map = {row.category_name: row.total for row in previous.categories}
    trends: list[CategoryTrendRow] = []
    for row in current.categories[:6]:
        prev = previous_map.get(row.category_name, Decimal("0"))
        if prev <= 0:
            # Insufficient comparison baseline; skip trend row for this category.
            continue
        delta = ((row.total - prev) / prev) * Decimal("100")
        trends.append(
            CategoryTrendRow(
                category_name=row.category_name,
                current_total=row.total,
                previous_total=prev,
                delta_percent=delta,
            )
        )

    return AnalyticsInsightsResponse(
        account_id=resolved,
        date_from=date_from,
        date_to=date_to,
        days_above_zero=days_above_zero,
        longest_streak_without_unplanned=longest_streak_without_unplanned,
        days_since_last_overdue_prediction=days_since_last_overdue,
        most_expensive_purchase_amount=Decimal(str(max_unplanned_tx.amount)) if max_unplanned_tx else None,
        most_expensive_purchase_label=(
            max_unplanned_tx.top_category_name
            or max_unplanned_tx.category_name
            or "Uncategorized"
        ) if max_unplanned_tx else None,
        biggest_spending_day_amount=biggest_day_amount,
        biggest_spending_day_date=biggest_day_date,
        most_frequent_payment_method=most_freq_method,
        most_frequent_payment_method_count=most_freq_method_count,
        most_frequent_daily_category=most_freq_daily_category,
        most_frequent_daily_category_count=most_freq_daily_category_count,
        most_frequent_unplanned_category=most_freq_unplanned_category,
        most_frequent_unplanned_category_count=most_freq_unplanned_category_count,
        category_trends=trends,
    )
