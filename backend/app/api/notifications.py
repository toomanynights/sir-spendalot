from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import require_auth
from app.services import push_service

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
    dependencies=[Depends(require_auth)],
)


class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.post("/subscribe", status_code=201)
def subscribe(data: SubscribeRequest, db: Session = Depends(get_db)):
    push_service.save_subscription(db, data.endpoint, data.p256dh, data.auth)
    return {"message": "Subscription recorded."}


@router.post("/unsubscribe")
def unsubscribe(data: UnsubscribeRequest, db: Session = Depends(get_db)):
    removed = push_service.delete_subscription(db, data.endpoint)
    if not removed:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    return {"message": "Subscription removed."}
