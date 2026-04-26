#!/bin/bash
# Sir Spendalot - Nuke user-created data for final testing
#
# DANGER: This permanently deletes user data tables.
# Usage:
#   CONFIRM_NUKE=YES ./90-nuke-user-data.sh

set -euo pipefail

if [[ "${CONFIRM_NUKE:-}" != "YES" ]]; then
  echo "Refusing to run. Set CONFIRM_NUKE=YES to proceed."
  exit 1
fi

echo "⚠️  Nuking user-created data in Sir Spendalot..."

cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate

python - <<'PY'
from sqlalchemy import text

from app.database import engine

tables = [
    "prediction_instances",
    "prediction_templates",
    "transfers",
    "transactions",
    "excluded_days",
    "import_mappings",
    "categories",
    "payment_methods",
    "settings",
    "accounts",
]

stmt = "TRUNCATE TABLE " + ", ".join(tables) + " RESTART IDENTITY CASCADE;"
with engine.begin() as conn:
    conn.execute(text(stmt))

print("✅ User-created data removed and identities reset.")
PY

echo "Done."
