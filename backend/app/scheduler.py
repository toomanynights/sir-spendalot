import logging
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


def _daily_generate_job() -> None:
    """Run by APScheduler at 00:05 every day in its own thread."""
    from app.database import SessionLocal
    from app.services.prediction_instance_service import generate_all_instances

    db = SessionLocal()
    try:
        logger.info("Scheduler: generating prediction instances for all active templates")
        generate_all_instances(db)
        logger.info("Scheduler: instance generation complete")
    except Exception:
        logger.exception("Scheduler: error during daily instance generation")
    finally:
        db.close()


def _push_notification_job() -> None:
    """Send Web Push notifications for pending predictions and overdue checkups."""
    from app.database import SessionLocal
    from app.models.account import Account
    from app.models.account_checkup import AccountCheckup
    from app.models.prediction import PredictionInstance
    from app.models.settings import Settings
    from app.services import push_service

    db = SessionLocal()
    try:
        settings_row = db.query(Settings).filter(Settings.id == 1).first()
        if not settings_row:
            return

        predictions_on = settings_row.prediction_notifications_enabled
        checkups_on = settings_row.checkup_notifications_enabled
        if not predictions_on and not checkups_on:
            return

        today = date.today()
        accounts = db.query(Account).all()
        account_name_by_id = {a.id: a.name for a in accounts}

        # --- Pending / overdue predictions grouped by account ---
        if predictions_on:
            from sqlalchemy import func as sqlfunc
            pending = (
                db.query(PredictionInstance)
                .filter(
                    PredictionInstance.status == "pending",
                    PredictionInstance.scheduled_date <= today,
                )
                .all()
            )
            by_account: dict[int, list] = {}
            for inst in pending:
                by_account.setdefault(inst.account_id, []).append(inst)

            for account_id, instances in by_account.items():
                account_name = account_name_by_id.get(account_id, f"Account {account_id}")
                due_today = [i for i in instances if i.scheduled_date == today]
                overdue = [i for i in instances if i.scheduled_date < today]

                if overdue and due_today:
                    body = f"{len(due_today)} due today, {len(overdue)} overdue"
                elif overdue:
                    word = "prophecy" if len(overdue) == 1 else "prophecies"
                    body = f"{len(overdue)} overdue {word}"
                elif due_today:
                    if len(due_today) <= 2:
                        names = ", ".join(i.template_name for i in due_today if i.template_name)
                        body = f"{names} pending today" if names else f"{len(due_today)} pending today"
                    else:
                        body = f"{len(due_today)} prophecies pending today"
                else:
                    continue

                push_service.broadcast_notification(db, f"@{account_name}", body)

        # --- Overdue checkups per account ---
        if checkups_on:
            threshold = settings_row.checkup_notification_days or 30
            for account in accounts:
                last = (
                    db.query(AccountCheckup.checkup_date)
                    .filter(AccountCheckup.account_id == account.id)
                    .order_by(AccountCheckup.checkup_date.desc())
                    .first()
                )
                last_date = last[0] if last else None

                if last_date is None:
                    body = "Hath never been reconciled — a checkup is due."
                else:
                    days = (today - last_date).days
                    if days <= threshold:
                        continue
                    body = f"{days} days since last reconciliation. A checkup is due."

                push_service.broadcast_notification(db, f"@{account.name}", body)

    except Exception:
        logger.exception("Scheduler: error during push notification job")
    finally:
        db.close()


def _reschedule_push_job() -> None:
    """Re-read notification time from DB and reschedule the push job."""
    from app.database import SessionLocal
    from app.models.settings import Settings

    db = SessionLocal()
    try:
        row = db.query(Settings).filter(Settings.id == 1).first()
        time_str = row.prediction_notifications_time if row else "09:00"
    finally:
        db.close()

    try:
        hour, minute = (int(x) for x in time_str.split(":"))
    except Exception:
        hour, minute = 9, 0

    _scheduler.add_job(
        _push_notification_job,
        trigger=CronTrigger(hour=hour, minute=minute),
        id="daily_push_notifications",
        replace_existing=True,
    )
    logger.info("Push notification job scheduled at %02d:%02d", hour, minute)


def start_scheduler() -> None:
    _scheduler.add_job(
        _daily_generate_job,
        trigger=CronTrigger(hour=0, minute=5),
        id="daily_generate_instances",
        replace_existing=True,
    )
    _reschedule_push_job()
    _scheduler.start()
    logger.info("APScheduler started")


def reschedule_push_notifications() -> None:
    """Call this when the user saves a new notification time in settings."""
    _reschedule_push_job()


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
