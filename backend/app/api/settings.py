from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings as app_config
from app.database import get_db
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.auth_service import require_auth
from app.services import settings_service

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    dependencies=[Depends(require_auth)],
)


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return settings_service.get_settings(db)


@router.patch("", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    return settings_service.update_settings(db, data)


@router.get("/vapid-public-key")
def vapid_public_key():
    """Return the VAPID public key for the frontend to use with pushManager.subscribe()."""
    return {"vapid_public_key": app_config.VAPID_PUBLIC_KEY or ""}
