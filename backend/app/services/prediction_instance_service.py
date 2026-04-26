import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload

from app.models.prediction import PredictionInstance, PredictionTemplate
from app.models.settings import Settings
from app.models.transaction import Transaction
from app.schemas.prediction import PredictionInstanceConfirm, PredictionInstanceResponse


# ------------------------------------------------------------------ #
# Schedule computation                                                 #
# ------------------------------------------------------------------ #


def _compute_scheduled_dates(template: PredictionTemplate, horizon_days: int) -> list[date]:
    """
    Return all dates in [today, today + horizon_days] on which this template should fire.
    Does not consult the DB — pure date arithmetic.
    """
    today = date.today()
    end_date = today + timedelta(days=horizon_days)
    freq = template.frequency
    dates: list[date] = []

    if freq == "every_n_days":
        n = template.interval or 1
        current = template.start_date
        # Advance to the first occurrence >= today without overshooting
        if current < today:
            elapsed = (today - current).days
            steps = elapsed // n
            current = current + timedelta(days=steps * n)
            if current < today:
                current += timedelta(days=n)
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=n)

    elif freq == "monthly":
        year, month = template.start_date.year, template.start_date.month
        # Defensive fallback for legacy/bad rows: monthly templates should have
        # day_of_month, but if it's missing use start_date.day.
        dom = template.day_of_month or template.start_date.day
        dom = max(1, min(31, int(dom)))
        while True:
            try:
                d = date(year, month, dom)
            except ValueError:
                # day_of_month exceeds days in this month (e.g. Jan 31 → Feb)
                last_day = calendar.monthrange(year, month)[1]
                d = date(year, month, last_day)
            if d > end_date:
                break
            if d >= template.start_date and d >= today:
                dates.append(d)
            month += 1
            if month > 12:
                month = 1
                year += 1

    elif freq == "yearly":
        anchor_month = template.start_date.month
        anchor_day = template.start_date.day
        year = template.start_date.year
        while True:
            try:
                d = date(year, anchor_month, anchor_day)
            except ValueError:
                # Feb 29 in a non-leap year — skip this year
                year += 1
                continue
            if d > end_date:
                break
            if d >= template.start_date and d >= today:
                dates.append(d)
            year += 1

    elif freq == "once":
        d = template.start_date
        if today <= d <= end_date:
            dates.append(d)

    return dates


def _get_horizon(db: Session) -> int:
    row = db.query(Settings).filter(Settings.id == 1).first()
    return row.prediction_horizon_days if row else 90


# ------------------------------------------------------------------ #
# Instance generation                                                  #
# ------------------------------------------------------------------ #


def generate_instances_for_template(
    db: Session, template_id: int, *, purge_pending: bool = False
) -> None:
    """
    Generate pending PredictionInstances for a single template.

    purge_pending=True: delete all future pending instances before regenerating.
      Use this when a template's schedule has been edited so stale instances
      on the old schedule are removed.
    purge_pending=False: only add instances for dates that have no entry yet.
      Safe to call repeatedly (idempotent for new dates).
    """
    template = db.get(PredictionTemplate, template_id)
    if not template or template.paused:
        return

    horizon_days = _get_horizon(db)

    if purge_pending:
        today = date.today()
        (
            db.query(PredictionInstance)
            .filter(
                PredictionInstance.template_id == template_id,
                PredictionInstance.status == "pending",
                PredictionInstance.scheduled_date >= today,
            )
            .delete(synchronize_session=False)
        )

    scheduled_dates = _compute_scheduled_dates(template, horizon_days)
    if not scheduled_dates:
        template.last_generated_at = datetime.now(timezone.utc)
        db.commit()
        return

    # Load existing dates for this template (any status) to avoid duplicates
    existing: set[date] = set(
        row[0]
        for row in db.query(PredictionInstance.scheduled_date)
        .filter(
            PredictionInstance.template_id == template_id,
            PredictionInstance.scheduled_date.in_(scheduled_dates),
        )
        .all()
    )

    new_rows = [
        {
            "template_id": template.id,
            "account_id": template.account_id,
            "amount": template.amount,
            "scheduled_date": d,
            "status": "pending",
        }
        for d in scheduled_dates
        if d not in existing
    ]

    if new_rows:
        # ON CONFLICT DO NOTHING guards against the race condition where two workers
        # both run startup generation simultaneously.
        stmt = pg_insert(PredictionInstance).values(new_rows).on_conflict_do_nothing(
            constraint="uq_prediction_instance_template_date"
        )
        db.execute(stmt)

    template.last_generated_at = datetime.now(timezone.utc)
    db.commit()


# ------------------------------------------------------------------ #
# Instance list / confirm / skip                                       #
# ------------------------------------------------------------------ #


def get_instances(
    db: Session,
    *,
    account_id: Optional[int] = None,
    template_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    next_per_template: bool = False,
) -> list[PredictionInstanceResponse]:
    q = (
        db.query(PredictionInstance)
        .options(
            joinedload(PredictionInstance.template).joinedload(PredictionTemplate.payment_method)
        )
    )

    if account_id is not None:
        q = q.filter(PredictionInstance.account_id == account_id)
    if template_id is not None:
        q = q.filter(PredictionInstance.template_id == template_id)
    if status is not None:
        q = q.filter(PredictionInstance.status == status)
    if date_from is not None:
        q = q.filter(PredictionInstance.scheduled_date >= date_from)
    if date_to is not None:
        q = q.filter(PredictionInstance.scheduled_date <= date_to)

    if next_per_template:
        # Subquery: earliest pending scheduled_date per template_id.
        # When combined with status=pending in the outer query this returns exactly
        # one instance per template — the next upcoming one.
        min_subq = (
            db.query(
                PredictionInstance.template_id,
                func.min(PredictionInstance.scheduled_date).label("min_date"),
            )
            .filter(PredictionInstance.status == "pending")
            .group_by(PredictionInstance.template_id)
            .subquery()
        )
        q = q.join(
            min_subq,
            (PredictionInstance.template_id == min_subq.c.template_id)
            & (PredictionInstance.scheduled_date == min_subq.c.min_date),
        )

    instances = q.order_by(PredictionInstance.scheduled_date.asc()).all()
    return [PredictionInstanceResponse.model_validate(i) for i in instances]


def confirm_instance(
    db: Session, instance_id: int, data: PredictionInstanceConfirm
) -> PredictionInstanceResponse:
    instance = (
        db.query(PredictionInstance)
        .options(
            joinedload(PredictionInstance.template).joinedload(PredictionTemplate.payment_method)
        )
        .filter(PredictionInstance.id == instance_id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Prediction instance not found.")
    if instance.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=(
                "This prophecy was already settled elsewhere "
                f"(status: {instance.status}). Remove this row or refresh the list."
            ),
        )

    confirmed_date = data.confirmed_date or date.today()

    # Preserve sign from instance (positive=expense, negative=income).
    if data.confirmed_amount is not None:
        sign = Decimal("-1") if instance.amount < 0 else Decimal("1")
        final_amount = data.confirmed_amount * sign
    else:
        final_amount = instance.amount

    # Payment method: use override from request, then fall back to template default.
    effective_payment_method_id = (
        data.payment_method_id
        if data.payment_method_id is not None
        else instance.template_payment_method_id
    )

    if data.create_transaction:
        template_name = instance.template.name if instance.template else "Prediction"
        # Surface the originally scheduled date in the subcategory slot when the user
        # confirmed on a different day — shown in the meta line of Recent Chronicles.
        scheduled_note = (
            f"In lieu of {instance.scheduled_date.strftime('%-d %b %Y')}"
            if confirmed_date != instance.scheduled_date
            else None
        )
        tx = Transaction(
            account_id=instance.account_id,
            amount=final_amount,
            transaction_date=confirmed_date,
            type="predicted",
            description=f"Confirmed: {template_name}",
            subcategory=scheduled_note,
            payment_method_id=effective_payment_method_id,
            confirmed=True,
        )
        db.add(tx)
        db.flush()  # assign tx.id before setting FK on instance
        instance.transaction_id = tx.id
    else:
        instance.transaction_id = None

    instance.status = "confirmed"
    instance.confirmed_date = confirmed_date
    instance.confirmed_amount = final_amount

    db.commit()
    db.refresh(instance)
    return PredictionInstanceResponse.model_validate(instance)


def skip_instance(db: Session, instance_id: int) -> PredictionInstanceResponse:
    instance = (
        db.query(PredictionInstance)
        .options(
            joinedload(PredictionInstance.template).joinedload(PredictionTemplate.payment_method)
        )
        .filter(PredictionInstance.id == instance_id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Prediction instance not found.")
    if instance.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Instance is already {instance.status} and cannot be skipped.",
        )

    instance.status = "skipped"
    db.commit()
    db.refresh(instance)
    return PredictionInstanceResponse.model_validate(instance)


def generate_all_instances(db: Session) -> None:
    """
    Generate instances for every active (non-paused) template.
    Called by the daily scheduler job.
    """
    templates = (
        db.query(PredictionTemplate)
        .filter(PredictionTemplate.paused.is_(False))
        .all()
    )
    for template in templates:
        generate_instances_for_template(db, template.id)


def prune_pending_instances_beyond_horizon(db: Session) -> None:
    """Remove pending instances scheduled past the configured forecast horizon."""
    horizon_days = _get_horizon(db)
    end_date = date.today() + timedelta(days=horizon_days)
    (
        db.query(PredictionInstance)
        .filter(
            PredictionInstance.status == "pending",
            PredictionInstance.scheduled_date > end_date,
        )
        .delete(synchronize_session=False)
    )
    db.commit()


def regenerate_all_instances_after_horizon_change(db: Session) -> None:
    """
    After prediction_horizon_days changes: drop out-of-window pendings, then
    purge+rebuild pending rows for every active template so lists match the new window.
    """
    prune_pending_instances_beyond_horizon(db)
    templates = (
        db.query(PredictionTemplate)
        .filter(PredictionTemplate.paused.is_(False))
        .all()
    )
    for template in templates:
        generate_instances_for_template(db, template.id, purge_pending=True)
