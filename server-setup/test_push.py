#!/usr/bin/env python3
"""
Test Web Push dispatch to all stored subscriptions.

Run from the backend directory with the venv active:
    python3 ../server-setup/test_push.py
"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services import push_service

db = SessionLocal()
try:
    subs = push_service.get_all_subscriptions(db)
    print(f"Subscriptions in DB: {len(subs)}")
    if not subs:
        print("No subscriptions found. Enable push notifications in Settings first.")
        sys.exit(1)
    for s in subs:
        print(f"Sending to {s.endpoint[:70]}...")
        push_service.send_push_notification(s, "Sir Spendalot", "Hark! Push notifications work.")
        print("  -> sent (no exception)")
finally:
    db.close()
