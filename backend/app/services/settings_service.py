from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.settings import Settings
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services import prediction_instance_service


def _get_or_create_settings(db: Session) -> Settings:
    row = db.query(Settings).filter(Settings.id == 1).first()
    if row:
        return row

    row = Settings(
        id=1,
        prediction_horizon_days=90,
        rolling_average_days=30,
        daily_high_threshold=110,
        daily_low_threshold=90,
        show_decimals=True,
        show_predictive_non_primary=False,
        require_payment_method=False,
        require_subcategory=False,
        prediction_notifications_enabled=False,
        prediction_notifications_time="09:00",
        checkup_notifications_enabled=False,
        checkup_notification_days=30,
        topbar_attention_dot_enabled=True,
        primary_account_id=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_settings(db: Session) -> SettingsResponse:
    row = _get_or_create_settings(db)
    return SettingsResponse.model_validate(row)


def update_settings(db: Session, data: SettingsUpdate) -> SettingsResponse:
    row = _get_or_create_settings(db)

    updates = data.model_dump(exclude_unset=True)
    old_horizon = row.prediction_horizon_days
    for key, value in updates.items():
        setattr(row, key, value)

    # Validate threshold relationship after merge with existing values.
    if row.daily_low_threshold >= row.daily_high_threshold:
        raise HTTPException(
            status_code=422,
            detail="daily_low_threshold must be lower than daily_high_threshold.",
        )

    db.commit()
    db.refresh(row)

    if "prediction_horizon_days" in updates and updates["prediction_horizon_days"] != old_horizon:
        prediction_instance_service.regenerate_all_instances_after_horizon_change(db)

    if "prediction_notifications_time" in updates:
        from app.scheduler import reschedule_push_notifications
        reschedule_push_notifications()

    return SettingsResponse.model_validate(row)
