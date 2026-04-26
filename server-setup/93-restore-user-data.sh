#!/bin/bash
# Sir Spendalot - Restore user data backup (including import mappings)
#
# Usage:
#   ./93-restore-user-data.sh /path/to/backup.json

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/backup.json"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  Restoring backup from: $BACKUP_FILE"

cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate

python - <<'PY' "$BACKUP_FILE"
import json
import sys

from app.database import SessionLocal
from app.services.importer_service import restore_from_payload

backup_file = sys.argv[1]

with open(backup_file, "r", encoding="utf-8") as f:
    raw = json.load(f)

payload = raw.get("payload", raw)

db = SessionLocal()
try:
    restore_from_payload(db, payload)
finally:
    db.close()

print("✅ Restore complete.")
PY
