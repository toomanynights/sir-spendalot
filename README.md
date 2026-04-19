# Sir Spendalot

Self-hosted financial tracker with predictive budgeting, built with a medieval-themed UI.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, Vite, Tailwind CSS
- Runtime: Caddy + systemd on Linux server

## Project Structure

- `backend/` - API, models, schemas, services, migrations
- `frontend/` - app pages, components, API client, styles
- `docs/` - supporting documentation
- `DEVELOPMENT_PLAN.md` - step-by-step implementation checklist/spec

## Local Workflow (Windows)

- Code is edited locally in `D:\basil\Documents\!Coding\sir-spendalot`.
- The app runs on the Linux server at `/home/basil/sir-spendalot`.
- Avoid running backend/frontend runtime commands on Windows for this project.

## Server Workflow (Linux)

### Backend

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate
sudo systemctl restart spendalot-api
sudo journalctl -u spendalot-api -n 50
```

### Frontend

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/frontend
npm run build
```

## Database Migrations

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate
alembic upgrade head
```

## Security

- Never commit `backend/.env` or other secret files.
- Keep credentials and API keys in environment variables only.

## Notes

If development and plan details diverge, `DEVELOPMENT_PLAN.md` is the source of truth for task sequencing and completion tracking.
