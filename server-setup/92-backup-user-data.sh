#!/bin/bash
# Sir Spendalot - Backup user data (including import mappings)
#
# Usage:
#   ./92-backup-user-data.sh [optional-output-file]

set -euo pipefail

OUTPUT_FILE="${1:-/home/basil/sir-spendalot/backups/user-data-$(date +%Y%m%d-%H%M%S).json}"

echo "Creating backup at: $OUTPUT_FILE"

cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate

python - <<'PY' "$OUTPUT_FILE"
import json
import sys

from app.database import SessionLocal
from app.services.importer_service import build_backup_payload

output_file = sys.argv[1]
db = SessionLocal()
try:
    payload = build_backup_payload(db)
finally:
    db.close()

with open(output_file, "w", encoding="utf-8") as f:
    json.dump({"payload": payload}, f, ensure_ascii=False, indent=2)

print(f"✅ Backup saved to {output_file}")
PY
