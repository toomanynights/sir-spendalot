import json
import logging

from sqlalchemy.orm import Session

from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


def get_all_subscriptions(db: Session) -> list[PushSubscription]:
    return db.query(PushSubscription).all()


def save_subscription(db: Session, endpoint: str, p256dh: str, auth: str) -> PushSubscription:
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
        db.commit()
        db.refresh(existing)
        return existing
    sub = PushSubscription(endpoint=endpoint, p256dh=p256dh, auth=auth)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def delete_subscription(db: Session, endpoint: str) -> bool:
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if not sub:
        return False
    db.delete(sub)
    db.commit()
    return True


def send_push_notification(subscription: PushSubscription, title: str, body: str) -> None:
    """Dispatch a single Web Push notification via pywebpush."""
    try:
        from pywebpush import webpush, WebPushException
        from app.config import settings

        if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_SUBJECT:
            logger.warning("VAPID keys not configured — skipping push notification")
            return

        payload = json.dumps({"title": title, "body": body})
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
    except Exception as exc:
        logger.warning("Push notification failed for endpoint %s: %s", subscription.endpoint[:60], exc)


def broadcast_notification(db: Session, title: str, body: str) -> None:
    """Send a push notification to all stored subscriptions."""
    subscriptions = get_all_subscriptions(db)
    for sub in subscriptions:
        send_push_notification(sub, title, body)
