# Sir Spendalot - Development Plan
## Actionable Step-by-Step Guide for Cursor

**Project:** Self-hosted financial tracker with predictive budgeting  
**Domain:** sir-spendalot.tmn.name  
**Server Path:** `/home/basil/sir-spendalot`  
**Local Path:** `D:\basil\Documents\!Coding\sir-spendalot`

---

## 📋 Global Checklist

### Phase 0: Server Setup ✅ / ❌
- [x] 0.1 - System dependencies installed
- [x] 0.2 - PostgreSQL database created
- [x] 0.3 - Project directories created
- [x] 0.4 - Caddy configuration prepared

### Phase 1: Backend Foundation ✅ / ❌
- [x] 1.1 - FastAPI project structure
- [x] 1.2 - Database models (accounts, categories, transactions)
- [x] 1.3 - Pydantic schemas
- [x] 1.4 - Database connection and migrations

### Phase 2: Core API Endpoints ✅ / ❌
- [x] 2.1 - Account CRUD endpoints
- [x] 2.2 - Category CRUD endpoints
- [x] 2.3 - Transaction CRUD endpoints (incl. batch + subcategory autocomplete)
- [x] 2.4 - Transfer endpoints
- [x] 2.5 - Balance correction endpoint + JWT authentication
  - ⚠️ `AUTH_USERNAME` and `AUTH_PASSWORD` live in `.env` only — never commit to git
- [x] 2.6 - Payment method CRUD endpoints

### Phase 3: Prediction Engine ✅ / ❌
- [x] 3.1 - Prediction template CRUD (incl. pause/resume)
- [x] 3.2 - Prediction instance generation service + APScheduler daily job
- [x] 3.3 - Forecast calculation algorithm
- [x] 3.4 - Stats endpoints (today, lowest points)
- [x] 3.5 - Instance confirm/skip endpoints

### Phase 4: Frontend Foundation ✅ / ❌
- [x] 4.1 - React project setup with medieval theme (see D:\basil\Documents\!Coding\sir-spendalot\spendalot-dashboard.jsx) 
- [x] 4.2 - API client and React Query setup
- [x] 4.3 - Routing and layout components
- [x] 4.3b - Login page (username/password → JWT, stored in localStorage, redirect to dashboard)
- [x] 4.4 - Reusable UI components (Card, Button, Input)

### Phase 5: Dashboard Implementation ✅ / ❌
- [x] 5.1 - Account switcher and primary/non-primary views
- [x] 5.2 - Today's Fortune card
- [x] 5.3 - Lowest Fortune card (dual display)
- [x] 5.4 - Record Thy Deed form
- [x] 5.5 - Recent Chronicles list
- [x] 5.6 - Future Prophecies list
- [x] 5.7 - Floating Sir Spendalot advisor

### Phase 6: Quick entry & other pages ✅ / ❌
- [x] 6.1 - Quick entry page
- [x] 6.2 - Transaction management page (filters by date/account/type/subtype, edit, soft-delete)
- [x] 6.3 - Prediction management page (incl. per-template pause/resume)
- [x] 6.3b - Universal sticky page topbar (title/subtitle/account row)
- [x] 6.4 - Settings page (realm prefs, excluded days, decimals sync, horizon/instance regen; master data → 6.4a Treasury)
- [x] 6.4a - Treasury page (`/treasury`: accounts, categories, payment methods)
- [x] 6.5 - Analytics page (`/analytics`)

### Phase 7: Additional Features ✅ / ❌
- [x] 7.2 - Enforce auth (swap optional_auth → require_auth on all routes; verify login page redirects correctly)
- [x] 7.3 - Data migration tool (from Google Sheets)
- [x] 7.4 - UI improvements (see specs)
- [x] 7.5 - Default payment method — add to Treasury; make selected by default when submitting via dashboard block / Quick entry (per account)
- [x] 7.7 - Chronicles improvement
- [ ] 7.8 - Explicit income/expense control (and filter categories everywhere: Record Thy Deed, Quick entry...) (and add category type to Unplanned - income/expense)
- [ ] 7.9 - Components reuse
- [ ] 7.10 - Browser notifications for predictions about to go overdue / already overdue (with setting: on/off + time)

### Phase 8: Deployment (some may already be implemented - check) ✅ / ❌
- [ ] 8.1 - Systemd services
- [ ] 8.2 - Caddy reverse proxy
- [ ] 8.3 - Production environment configuration
- [ ] 8.4 - Backup automation (performed by user)
- [x] 8.5 - Prepare & upload to git

### Phase 9: Post-release improvements ✅ / ❌
- [ ] 9.1 - Soft-delete + restore for accounts, categories, and payment methods (align with transactions; optional “Show deleted” on Treasury lists)
- [ ] 9.2 - Dashboard analytics charts block (compact spending-by-type bar chart — deferred from Phase 7.1)
- [ ] 9.3 - Edit / soft-delete in “Recent Chronicles” dashboard block (deferred from Phase 7.6)
- [ ] 9.4 - Add "past instances" to Prophecies (needs design work)
- [ ] 9.5 - Analytics overhaul
- [ ] 9.6 - add an optional line on top of "Thy Lowest Fortunes" block, showing the date when the account will go below zero (if present)
- [ ] 9.7 - make "Show predictive features on non-primary accounts" setting actualy work (dashboard + analytics with the same logic as in dashboard)
- [ ] 9.8 - Implement PWA support
- [ ] 9.9 - Optional normalized subcategory model (`subcategory_id`) with backward-compatible text fallback
- [ ] 9.10 - Color-code (expenses vs earnings) "Future Prophecies" block (Dashboard) + Prophecies Awaiting (Quick entry)

### Phase 10: Rolling predictions ✅ / ❌
- [ ] 10.0 - Feature initiation (see specs)

### Phase 11: Mobile layout (note: for every page, analyze if it's possible/worthwhile to transition the page into responsive design, or alternatives preferrable - hide the whole page/parts of content/suggest using desktop/customized mobile view... Some pages/elements already adapted to mobile - "no change needed" is also a valid answer) ✅ / ❌
- [ ] 11.1 - General components (sidear, topbar, general page content) - make sure a case with many accounts in topbar doesn't break UI
- [ ] 11.2 - Dashboard page  (make sure the order of cards is the same on mobile as left-to-right on desktop), floating assistant (make sure a tap on activated assistant deactivates it)
- [ ] 11.3 - Quick Entry page
- [ ] 11.4 - Chronicles page
- [ ] 11.5 - Prophecies page
- [ ] 11.6 - Analytics page
- [ ] 11.7 - Treasury page
- [ ] 11.8 - Settings page

---

## Phase 0: Server Setup

**Purpose:** Prepare the Linux server environment for Sir Spendalot

---

### Task 0.1: Install System Dependencies

**What:** Install Python, PostgreSQL, Node.js, and other required packages

**Instructions for Cursor:**

Generate a shell script that installs:
- Python 3.11+
- PostgreSQL
- Node.js 20+
- pip and npm
- build-essential
- git

**Deliverable:**

File: `server-setup/00-install-dependencies.sh`

```bash
#!/bin/bash
# Sir Spendalot - System Dependencies Installation

set -e

echo "🗡️ Installing system dependencies for Sir Spendalot..."

# Update package list
sudo apt update

# Install Python 3.11+
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials
sudo apt install -y build-essential libpq-dev

# Install git
sudo apt install -y git

echo "✅ Dependencies installed successfully!"
echo "Python version: $(python3.11 --version)"
echo "PostgreSQL version: $(psql --version)"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
```

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name

# Make script executable
chmod +x /home/basil/sir-spendalot/server-setup/00-install-dependencies.sh

# Run installation
/home/basil/sir-spendalot/server-setup/00-install-dependencies.sh
```

**Verification:**

```bash
python3.11 --version  # Should show 3.11+
psql --version        # Should show PostgreSQL 14+
node --version        # Should show v20+
```

**Mark complete:** `[x] 0.1 - System dependencies installed`

---

### Task 0.2: Create PostgreSQL Database

**What:** Set up the PostgreSQL database and user for Sir Spendalot

**Instructions for Cursor:**

Generate a shell script that:
1. Creates database `sir_spendalot`
2. Creates user `basil` with password
3. Grants all privileges
4. Enables necessary extensions

**Deliverable:**

File: `server-setup/01-setup-database.sh`

```bash
#!/bin/bash
# Sir Spendalot - Database Setup

set -e

echo "🗡️ Setting up PostgreSQL database for Sir Spendalot..."

# Generate a random password
DB_PASSWORD=$(openssl rand -base64 32)

# Create database and user
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE sir_spendalot;

-- Create user
CREATE USER basil WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sir_spendalot TO basil;

-- Connect to database and grant schema privileges
\c sir_spendalot
GRANT ALL ON SCHEMA public TO basil;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO basil;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO basil;
EOF

echo "✅ Database created successfully!"
echo ""
echo "📝 Save these credentials:"
echo "Database: sir_spendalot"
echo "User: basil"
echo "Password: $DB_PASSWORD"
echo ""
echo "⚠️  Add to /home/basil/sir-spendalot/backend/.env:"
echo "DATABASE_URL=postgresql://basil:$DB_PASSWORD@localhost/sir_spendalot"
```

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name

# Run database setup
/home/basil/sir-spendalot/server-setup/01-setup-database.sh

# IMPORTANT: Copy the password shown in output!
# You'll need it for the .env file
```

**Verification:**

```bash
# Test database connection
psql -U basil -d sir_spendalot -c "SELECT version();"

# Should connect without errors
```

**Mark complete:** `[x] 0.2 - PostgreSQL database created`

---

### Task 0.3: Create Project Directories

**What:** Set up the folder structure on the server

**Instructions for Cursor:**

Generate a shell script that creates all necessary directories with proper permissions.

**Deliverable:**

File: `server-setup/02-create-directories.sh`

```bash
#!/bin/bash
# Sir Spendalot - Directory Structure Setup

set -e

echo "🗡️ Creating project directories..."

BASE_DIR="/home/basil/sir-spendalot"

# Create main directories
mkdir -p "$BASE_DIR"/{backend,frontend,server-setup,docs,backups}

# Backend subdirectories
mkdir -p "$BASE_DIR/backend"/{app,alembic/versions,logs}
mkdir -p "$BASE_DIR/backend/app"/{models,schemas,api,services,utils}

# Frontend subdirectories
mkdir -p "$BASE_DIR/frontend"/{src,public}
mkdir -p "$BASE_DIR/frontend/src"/{components,pages,api,hooks,styles}

# Set ownership
sudo chown -R basil:basil "$BASE_DIR"

# Set permissions
chmod -R 755 "$BASE_DIR"

echo "✅ Directory structure created!"
tree -L 3 "$BASE_DIR" || ls -la "$BASE_DIR"
```

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name

# Run directory setup
/home/basil/sir-spendalot/server-setup/02-create-directories.sh
```

**Verification:**

```bash
ls -la /home/basil/sir-spendalot
# Should show: backend, frontend, server-setup, docs, backups
```

**Mark complete:** `[x] 0.3 - Project directories created`

---

### Task 0.4: Prepare Caddy Configuration

**What:** Create Caddy configuration for reverse proxy and static file serving

**Instructions for Cursor:**

Generate Caddyfile configuration for:
- Serve frontend from `/home/basil/sir-spendalot/frontend/dist`
- Reverse proxy `/api/*` to `localhost:8000`
- Handle SPA routing
- Enable gzip compression

**Deliverable:**

File: `server-setup/Caddyfile`

```
sir-spendalot.tmn.name {
    # Root directory for static files
    root * /home/basil/sir-spendalot/frontend/dist
    
    # API reverse proxy
    handle /api/* {
        reverse_proxy localhost:8000
    }
    
    # Serve static files
    file_server
    
    # SPA routing - fallback to index.html
    try_files {path} /index.html
    
    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy no-referrer-when-downgrade
        X-XSS-Protection "1; mode=block"
    }
    
    # Enable compression
    encode gzip
    
    # Logging
    log {
        output file /var/log/caddy/sir-spendalot.log
        format json
    }
}
```

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name

# Install Caddy if not already installed
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Add as a dedicated site snippet (do NOT overwrite /etc/caddy/Caddyfile on multi-app servers)
sudo mkdir -p /etc/caddy/sites-enabled
sudo cp /home/basil/sir-spendalot/server-setup/Caddyfile /etc/caddy/sites-enabled/sir-spendalot.caddy

# Ensure main Caddyfile imports snippets (one-time)
if ! sudo grep -q "import /etc/caddy/sites-enabled/*.caddy" /etc/caddy/Caddyfile; then
  echo "" | sudo tee -a /etc/caddy/Caddyfile
  echo "import /etc/caddy/sites-enabled/*.caddy" | sudo tee -a /etc/caddy/Caddyfile
fi

# Validate and reload safely
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

echo "✅ Caddy configuration prepared (will be activated in Phase 8)"
```

**Verification:**

```bash
# Confirm Sir Spendalot site is loaded in live config
sudo caddy adapt --config /etc/caddy/Caddyfile --pretty | grep -i "sir-spendalot.tmn.name"
```

**Mark complete:** `[x] 0.4 - Caddy configuration prepared` (only after validate+reload succeeds)

---

## Phase 1: Backend Foundation

**Purpose:** Set up FastAPI project with database models and migrations

---

### Task 1.1: FastAPI Project Structure

**What:** Create the initial FastAPI application with basic configuration

**Instructions for Cursor:**

Create the following files:

1. `backend/requirements.txt` - All Python dependencies
2. `backend/app/main.py` - FastAPI application with health check
3. `backend/app/config.py` - Settings management with pydantic-settings
4. `backend/app/database.py` - SQLAlchemy database connection
5. `backend/.env.example` - Environment variable template
6. `backend/alembic.ini` - Alembic configuration

**Deliverables:**

**File: `backend/requirements.txt`**

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
python-multipart==0.0.6
```

**File: `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="Sir Spendalot API",
    description="Guardian of Thy Treasury - Predictive Budget Tracking",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://sir-spendalot.tmn.name", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint - Verily, the server doth live!"""
    return {
        "status": "healthy",
        "message": "Hark! Sir Spendalot stands ready to serve!",
        "environment": settings.ENVIRONMENT
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Sir Spendalot API",
        "docs": "/docs",
        "health": "/api/health"
    }
```

**File: `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str
    
    # Application
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://sir-spendalot.tmn.name"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()
```

**File: `backend/app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development"
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for getting DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**File: `backend/.env.example`**

```bash
# Database Configuration
DATABASE_URL=postgresql://basil:YOUR_PASSWORD_HERE@localhost/sir_spendalot

# Application Settings
ENVIRONMENT=development
SECRET_KEY=GENERATE_RANDOM_SECRET_KEY_HERE

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://sir-spendalot.tmn.name,http://localhost:5173
```

**File: `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

sqlalchemy.url = postgresql://basil:password@localhost/sir_spendalot

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**File: `backend/alembic/env.py`**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import sys
from os.path import abspath, dirname

# Add parent directory to path
sys.path.insert(0, dirname(dirname(abspath(__file__))))

from app.database import Base
from app.config import settings

# Import all models here so Alembic can detect them
# from app.models import account, transaction, category, prediction

config = context.config

# Override sqlalchemy.url with the one from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend

source /home/basil/sir-spendalot/venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env from example (fill in DB password + generate SECRET_KEY)
cp .env.example .env
nano .env
# DATABASE_URL: use password from Task 0.2 output
# SECRET_KEY: openssl rand -hex 32

# Test the application
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Verification:**

```bash
# In another SSH session or browser
curl http://sir-spendalot.tmn.name:8000/api/health

# Expected output:
# {
#   "status": "healthy",
#   "message": "Hark! Sir Spendalot stands ready to serve!",
#   "environment": "development"
# }

# Also visit in browser:
# http://sir-spendalot.tmn.name:8000/docs
# Should see Swagger UI with health endpoint
```

**Mark complete:** `[x] 1.1 - FastAPI project structure`

---

### Task 1.2: Database Models

**What:** Create SQLAlchemy models for all core tables

**Instructions for Cursor:**

Create model files for:
- `app/models/account.py` - Account model
- `app/models/category.py` - Category model
- `app/models/transaction.py` - Transaction model
- `app/models/prediction.py` - Prediction template and instance models
- `app/models/transfer.py` - Transfer model
- `app/models/__init__.py` - Export all models

Schema reference:
- accounts: id, name, account_type (`current` | `savings`), is_primary, initial_balance, created_at
  - `account_type` represents a virtual vault concept, not a payment instrument. `current` = quick-access money (may aggregate bank + Revolut + cash mentally). Extensible via settings page later.
- categories: id, name, type, parent_id, created_at
  - Note: categories belong to the transaction domain only — predictions are separate and do not use this table
- transactions: id, account_id, category_id, subcategory, amount, transaction_date, type, description, payment_method_id, confirmed, created_at, updated_at, deleted_at
  - `payment_method_id`: optional FK to `payment_methods`. Records how the payment was made (Card, Cash, etc.) independently of which account it came from.
  - `deleted_at`: soft-delete timestamp — excluded from all queries when set, but record is preserved
- prediction_templates: id, name, account_id, amount, frequency, interval, day_of_month, start_date, paused, last_generated_at, created_at, updated_at
  - `name`: human label for the template (e.g. "Rent", "Payslip", "Netflix")
  - `frequency`: `every_n_days` | `monthly` | `yearly` | `once`
  - `interval`: step in days, required when frequency=`every_n_days` (e.g. 1=daily, 7=weekly, 14=biweekly); null for other frequencies
  - `day_of_month`: required when frequency=`monthly`; null for other frequencies
  - `yearly`: fires on `start_date.month` + `start_date.day` each year (no separate month column)
  - `once`: fires once on `start_date`; template naturally produces no further instances
  - No category_id — predictions are a separate domain from transactions
- prediction_instances: id, template_id, account_id, amount, scheduled_date, status, confirmed_date, confirmed_amount, created_at, updated_at
  - No category_id — inherited from template if needed at confirm time, not stored here
- transfers: id, from_account_id, to_account_id, amount, transfer_date, description
- settings: id, prediction_horizon_days (default 90), rolling_average_days (default 30), primary_account_id
- excluded_days: id, excluded_date, reason (optional text), created_at
  - Days in this table are excluded from the rolling average calculation and the stat window shifts back by 1 day per excluded day

Note: settings is a single-row config table. No multi-user support in MVP, but the model should not make adding user_id a breaking change later (i.e. don't hardcode assumptions that prevent it).

**Deliverables:**

[Cursor will generate all model files following SQLAlchemy best practices]

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate

# Generate initial migration
alembic revision --autogenerate -m "Create core tables"

# Review migration
cat alembic/versions/*_create_core_tables.py

# Apply migration
alembic upgrade head

# Verify tables created
psql -U basil -d sir_spendalot -c "\dt"
```

**Expected tables:**
- accounts
- categories
- payment_methods
- transactions
- prediction_templates
- prediction_instances
- transfers
- settings
- excluded_days
- alembic_version

**Mark complete:** `[x] 1.2 - Database models (accounts, categories, transactions)`

---

### Task 1.3: Pydantic Schemas

**What:** Create Pydantic schemas for request/response validation

**Instructions for Cursor:**

Create schema files:
- `app/schemas/account.py` - AccountCreate, AccountUpdate, AccountResponse
- `app/schemas/category.py` - CategoryCreate, CategoryUpdate, CategoryResponse
- `app/schemas/transaction.py` - TransactionCreate, TransactionUpdate, TransactionResponse
- `app/schemas/prediction.py` - PredictionTemplateCreate, etc.
- `app/schemas/__init__.py` - Export all schemas

Include:
- Proper validation (amounts > 0, required fields, etc.)
- Response models with computed fields
- Medieval error messages where appropriate

**Deliverables:**

[Cursor will generate schema files]

**Server Commands:**

No server commands needed - just validation that files are created.

**Verification:**

```bash
# Test import
python3 -c "from app.schemas import AccountCreate, TransactionCreate; print('✅ Schemas imported successfully')"
```

**Mark complete:** `[x] 1.3 - Pydantic schemas`

---

### Task 1.4: Database Connection Testing

**What:** Verify database connection and create seed data script

**Instructions for Cursor:**

Create `backend/seed_data.py` that:
1. Creates sample accounts (Royal Treasury, Dragon Hoard, Coin Purse)
2. Creates sample categories (Groceries, Transportation, etc.)
3. Creates sample transactions
4. Sets Royal Treasury as primary account

**Deliverables:**

**File: `backend/seed_data.py`**

[Cursor will generate seed script]

**Server Commands:**

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate

# Run seed script
python seed_data.py

# Verify data
psql -U basil -d sir_spendalot -c "SELECT * FROM accounts;"
psql -U basil -d sir_spendalot -c "SELECT * FROM categories;"
psql -U basil -d sir_spendalot -c "SELECT * FROM transactions;"
```

**Expected:** Should see sample accounts, categories, and transactions

**Mark complete:** `[x] 1.4 - Database connection and migrations`

---

## Phase 2: Core API Endpoints

**Purpose:** Build all REST endpoints. API is designed stateless + JWT-ready so a future Android app can consume it without changes.

---

### Task 2.1: Account CRUD Endpoints

**What:** Full CRUD for accounts, including primary account flag management.

**Endpoints:**
```
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/{id}
PATCH  /api/accounts/{id}
DELETE /api/accounts/{id}
```

**Deliverables:**
- `app/api/accounts.py`
- `app/services/account_service.py`

**Server Commands:**
```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
source /home/basil/sir-spendalot/venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify:**
```bash
curl http://localhost:8000/api/accounts
curl -X POST http://localhost:8000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"Royal Treasury","account_type":"current","is_primary":true,"initial_balance":1000}'
```

**Mark complete:** `[x] 2.1 - Account CRUD endpoints`

---

### Task 2.2: Category CRUD Endpoints

**What:** Full CRUD for categories, including parent/subcategory hierarchy.

**Endpoints:**
```
GET    /api/categories
POST   /api/categories
GET    /api/categories/{id}
PATCH  /api/categories/{id}
DELETE /api/categories/{id}
```

**Deliverables:**
- `app/api/categories.py`
- `app/services/category_service.py`

**Mark complete:** `[x] 2.2 - Category CRUD endpoints`

---

### Task 2.3: Transaction CRUD Endpoints

**What:** Full CRUD plus batch creation and subcategory autocomplete.

**Endpoints:**
```
GET    /api/transactions                  # filterable by date range, account, category (type), subcategory, transaction type
POST   /api/transactions                  # single transaction
POST   /api/transactions/batch            # multiple transactions in one request
GET    /api/transactions/{id}
PATCH  /api/transactions/{id}
DELETE /api/transactions/{id}             # soft-delete: sets deleted_at, record preserved
GET    /api/transactions/subcategories    # returns distinct used subcategory strings for autocomplete
```

**Notes:**
- `subcategory` is optional free text on each transaction
- `payment_method_id` is optional FK to `payment_methods` table; omit if not recorded
- Filters: `date_from`, `date_to`, `account_id`, `category_id` (type), `subcategory` (exact or contains), `transaction_type` (daily/unplanned/predicted/transfer), `payment_method_id`
- `/subcategories` returns a sorted list of distinct non-null values for datalist autocomplete in the frontend
- Soft-delete: `DELETE` sets `deleted_at` timestamp, never physically removes row. All GET queries exclude soft-deleted rows by default. Add `?include_deleted=true` for admin/audit use.
- Batch endpoint accepts an array and wraps all inserts in a single DB transaction

**Deliverables:**
- `app/api/transactions.py`
- `app/services/transaction_service.py`

**Mark complete:** `[x] 2.3 - Transaction CRUD endpoints (incl. batch + subcategory autocomplete)`

---

### Task 2.4: Transfer Endpoints

**What:** Transfer between accounts — creates a debit + credit transaction pair and a transfer record atomically.

**Endpoints:**
```
POST   /api/transfers
GET    /api/transfers
```

**Notes:**
- Transfers must NOT count toward expense stats (mark with type = "transfer")
- Wrap both transaction inserts and transfer record in one DB transaction

**Deliverables:**
- `app/api/transfers.py`
- `app/services/transfer_service.py`

**Mark complete:** `[x] 2.4 - Transfer endpoints`

---

### Task 2.5: Balance Correction + JWT Authentication

**What:** Two independent but related concerns — a balance correction endpoint, and JWT auth as the foundation for a future Android app.

**Balance correction endpoint:**
```
POST   /api/accounts/{id}/balance-correction
```
Body: `{ "target_balance": 1234.56, "correction_date": "2026-04-11", "note": "optional" }`

Creates a special adjustment transaction on the given `correction_date` that sets the running balance to `target_balance`. The date is required — it determines where in the timeline the correction lands and affects all subsequent forecasts. Useful when actual bank balance drifts from tracked balance.

**JWT Authentication:**
- Add `python-jose[cryptography]` and `passlib[bcrypt]` to requirements
- Add `POST /api/auth/token` — accepts username/password, returns JWT access token
- Add optional `Authorization: Bearer <token>` header checking via FastAPI dependency
- In MVP: token check is optional (single-user self-hosted), but the dependency is wired in so enabling it later is a one-line change
- Do NOT use session cookies — JWT only, so the Android app can authenticate identically to the web app

**Notes on Android-readiness:**
- All endpoints return JSON (no server-side rendering)
- Stateless API — no session state on server
- CORS configured to allow additional origins when Android WebView or native app is added
- JWT secret stored in `.env` — rotate to invalidate all sessions

**Deliverables:**
- `app/api/auth.py`
- `app/services/auth_service.py`
- Update `requirements.txt` with auth dependencies

**Mark complete:** `[x] 2.5 - Balance correction endpoint + JWT authentication`

---

### Task 2.6: Payment Method CRUD Endpoints

**What:** Simple CRUD for the user-managed payment method list (Card, Cash, etc.). Seeded with defaults; user can add/remove/rename via the settings page.

**Endpoints:**
```
GET    /api/payment-methods
POST   /api/payment-methods
PATCH  /api/payment-methods/{id}
DELETE /api/payment-methods/{id}
```

**Notes:**
- `name` must be unique — return 409 if duplicate
- `DELETE` should be blocked (422) if the method is referenced by any transaction — prompt the user to reassign first
- No pagination needed; the list will always be short

**Deliverables:**
- `app/api/payment_methods.py`
- `app/services/payment_method_service.py`

**Mark complete:** `[x] 2.6 - Payment method CRUD endpoints`

---

## Phase 3: Prediction Engine

**Purpose:** The forecasting core — templates drive instance generation, instances drive the daily balance forecast.

---

### Task 3.1: Prediction Template CRUD (incl. pause/resume)

**What:** CRUD for prediction templates plus pause/resume toggle per template.

**Domain clarification:** Prediction templates are their own entity (e.g. "Rent", "Payslip", "Netflix"). They are NOT linked to the transaction category system. Categories belong to transactions only.

**Frequency model:**
- `every_n_days` + `interval` (int ≥ 1): fires every N days from `start_date` (N=1 daily, N=7 weekly, N=14 biweekly, etc.)
- `monthly` + `day_of_month` (1–31): fires on that day every calendar month
- `yearly`: fires on `start_date.month` + `start_date.day` each year
- `once`: fires on `start_date` exactly once; no further instances generated

**Endpoints:**
```
GET    /api/predictions                       # list templates
POST   /api/predictions                       # create template
GET    /api/predictions/{id}
PATCH  /api/predictions/{id}
DELETE /api/predictions/{id}
POST   /api/predictions/{id}/pause            # pause: sets paused=true, deletes all future PENDING instances
POST   /api/predictions/{id}/resume           # resume: sets paused=false, triggers instance regeneration
```

**Pause behavior (important):**
- Pausing a template sets `paused = true` AND hard-deletes all future `pending` instances for that template
- Past instances (confirmed, skipped, or with `scheduled_date` in the past) are left completely untouched
- Resuming regenerates instances from today forward up to the forecast horizon
- Instance generation service skips templates where `paused = true`

**Deliverables:**
- `app/api/predictions.py`
- `app/services/prediction_template_service.py`

**Mark complete:** `[x] 3.1 - Prediction template CRUD (incl. pause/resume)`

---

### Task 3.2: Prediction Instance Generation Service + APScheduler

**What:** Service that generates `prediction_instances` for the next N days from active templates, plus a background job that reruns this daily.

**Logic:**
- On template create/update: regenerate instances for that template
- Daily at midnight: regenerate all instances for next `prediction_horizon_days` days
- Skip instances that are already confirmed or skipped

**APScheduler setup:**
- Add `apscheduler` to requirements
- Wire into FastAPI lifespan event (startup/shutdown)
- Job: `generate_prediction_instances()` runs daily at 00:05

**Deliverables:**
- `app/services/prediction_instance_service.py`
- `app/scheduler.py`
- Update `app/main.py` to start scheduler on startup

**Mark complete:** `[x] 3.2 - Prediction instance generation service + APScheduler daily job`

---

### Task 3.3: Forecast Calculation Algorithm

**What:** The core prediction math — daily balance projection for the next N days and "peril" identification.

**Algorithm:**
1. **Actual Balance:** `initial_balance` minus the sum of all non-deleted transactions up to today.
2. **Rolling Average:** Average of net spending for `type='daily'` transactions over the last `rolling_average_days` non-excluded days.
3. **Daily Projection:**
   - **Today (Day 0):** `actual_balance − flexible_daily − today_pending_instances`
     - `flexible_daily` = `max(0, rolling_avg − daily_spent_today)` (prevents double-counting if some of today's budget is already spent).
   - **Future Days (1..N):** `prev_balance − rolling_avg − sum(pending_instances_for_day)`
4. **Peril Identification:** Local minima are found sequentially. The first peril is the absolute minimum in the forecast; the second peril is the minimum of all days *after* the first peril.

**Endpoints:**
```
GET    /api/predictions/forecast?days=90     # full forecast array
GET    /api/predictions/lowest?count=2       # sequential peril points (next + following)
```

**Deliverables:**
- `app/services/forecast_service.py`
- Add forecast/lowest routes to `app/api/predictions.py`

**Mark complete:** `[x] 3.3 - Forecast calculation algorithm`

---

### Task 3.4: Stats Endpoints + Excluded Days API

**What:** Today's summary stats for the dashboard, plus the excluded days management API.

**Endpoints:**
```
GET    /api/stats/today                  # actual balance, predicted balance, spending breakdown by type

POST   /api/excluded-days                # mark a date as excluded from rolling average
DELETE /api/excluded-days/{date}         # un-exclude a date
GET    /api/excluded-days                # list all excluded dates
```

**Excluded days logic:**
- Excluded days are skipped when computing the rolling average window
- The window effectively shifts back by 1 day per excluded day to always collect the target N non-excluded days
- Example: if today is excluded, the rolling average uses the N days before yesterday instead
- Excluded days do NOT affect which prediction instances appear — only the rolling average baseline

**Response shape for /api/stats/today** (representative; numeric fields are decimals in JSON):
```json
{
  "account_id": 1,
  "actual_balance": "1234.56",
  "predicted_balance": "1180.00",
  "spending_today": {
    "daily": "45.00",
    "unplanned": "12.50",
    "predicted": "200.00"
  },
  "today_excluded": false,
  "rolling_avg_daily_spend": "18.91",
  "rolling_average_days": 30,
  "prediction_horizon_days": 90,
  "daily_high_threshold": 110,
  "daily_low_threshold": 90
}
```
The last four settings-echo fields mirror the **Settings** row so the **Today's Fortune** card can apply threshold styling and footer copy without a second request.

**Deliverables:**
- `app/api/stats.py`
- `app/api/excluded_days.py`
- `app/services/stats_service.py`
- `app/models/excluded_day.py`

**Mark complete:** `[x] 3.4 - Stats endpoints (today, lowest points)`

---

### Task 3.5: Instance Confirm/Skip Endpoints

**What:** Allow individual prediction instances to be confirmed (linked to an actual transaction) or skipped.

**Endpoints:**
```
POST   /api/predictions/instances/{id}/confirm   # mark as confirmed, optionally with actual amount + date
POST   /api/predictions/instances/{id}/skip      # mark as skipped, excluded from forecast
GET    /api/predictions/instances                # list instances (filterable by status, date range)
```

**Notes:**
- Confirming an instance should optionally create a real transaction record
- Skipped instances are excluded from forecast calculations
- Past unresolved instances (pending, past their scheduled date) should appear in the Quick Entry page

**Deliverables:**
- Add instance routes to `app/api/predictions.py`
- Add confirm/skip logic to `app/services/prediction_instance_service.py`

**Mark complete:** `[x] 3.5 - Instance confirm/skip endpoints`

---

## Phase 4: Frontend Foundation

**Purpose:** Build the React application shell, authentication, and core UI library.

---

### Task 4.1: React Project Setup with Medieval Theme

**What:** Initialise Vite + React + Tailwind CSS and configure the medieval visual identity.

**Implementation:**
- **Vite:** React with SWC for fast builds
- **Tailwind Config:** Custom color palette (Primary Gold: `#d4af37`, Dark Brown: `#1a0f0a`, etc.)
- **Fonts:** `Cinzel` for headers, `Crimson Text` for body (via Google Fonts)
- **Global Styles:** `index.css` with medieval utility classes (`.card`, `.btn-primary`, `.input-label`)

**Mark complete:** `[x] 4.1 - React project setup`

---

### Task 4.2: API Client and React Query Setup

**What:** Configure the communication layer between frontend and backend.

**Implementation:**
- **API Client:** `src/api/client.js` wrapping `fetch` with automatic JWT header injection and error handling
- **React Query:** Global `QueryClient` with default stale times and retry logic in `main.jsx`
- **Auth Hooks:** `useAuth.js` for login/logout and session persistence

**Mark complete:** `[x] 4.2 - API client and React Query setup`

---

### Task 4.3: Routing and Layout Components

**What:** Set up the application shell, navigation, and protected route logic.

**Implementation:**
- **Routing:** `App.jsx` using `react-router-dom` with a `ProtectedLayout` wrapper
- **Auth Guard:** `ProtectedRoute.jsx` redirects unauthenticated users to `/login`
- **Shell:** `Layout.jsx` with a responsive sidebar and main content area

**Mark complete:** `[x] 4.3 - Routing and layout components`

---

### Task 4.3b: Login Page

**What:** Authentication gateway with a medieval theme.

**Implementation:**
- **Page:** `src/pages/LoginPage.jsx`
- **Logic:** Exchanges credentials for JWT, stores in `localStorage`, redirects to original destination
- **UI:** Medieval motifs, gold icons, and "Hark! Credentials rejected" error messages

**Mark complete:** `[x] 4.3b - Login page`

---

### Task 4.4: Reusable UI Components

**What:** Core component library for consistent UI.

**Implementation:**
- **Card:** `.card` with parchment textures and shimmer effects
- **Button:** `.btn-primary` (gold), `.btn-ghost`, and `.btn-danger`
- **Input/Select:** Medieval-styled form controls with parchment backgrounds

**Mark complete:** `[x] 4.4 - Reusable UI components`

---

## Phase 5: Dashboard Implementation

**Purpose:** Build the core analytical and entry tools for the main dashboard.

---

### Task 5.1: Account Switcher and Context

**What:** Global account selection that drives all dashboard stats.

**Implementation:**
- **Context:** `AccountContext.jsx` manages `selectedAccountId` with `localStorage` persistence
- **Switcher:** `AccountSwitcher.jsx` renders tabs for each account (Primary, Savings, etc.)
- **Behavior:** Switching accounts invalidates relevant queries (Today's Fortune, Chronicles, Forecasts)

**Mark complete:** `[x] 5.1 - Account switcher and primary/non-primary views`

---

### Task 5.2: Today's Fortune Card

**What:** Summary of current financial status.

**Implementation:**
- **Component:** `TodayFortune.jsx`
- **Data:** `GET /api/stats/today` — current balance, end-of-day forecast (primary), spending breakdown (Daily, Unplanned, Scheduled), `today_excluded`, rolling average, plus **realm settings echo** on the same payload: `rolling_average_days`, `prediction_horizon_days`, `daily_high_threshold`, `daily_low_threshold` (so the card does not need a separate settings fetch for thresholds/copy).
- **Rolling average (backend):** Mean of **daily-type** net spend over the last `rolling_average_days` **non-excluded** calendar days ending at yesterday (unplanned / predicted / transfers excluded from the baseline).
- **Colour — Daily column only:** Positive daily spend vs `rolling_avg_daily_spend` using **settings percentages** as multipliers (e.g. high `110` → red at ≥110% of average; low `90` → green at ≤90%). Unplanned and Scheduled cells: expense red / refund green / zero muted (no rolling-average bands).
- **Today's Outgoings (total line):** Sum of the three types; when &gt; 0, shown as **expense red** only — **not** threshold-coloured vs average (total mixes types the average does not represent).
- **Copy:** Rolling-average footer reads **Daily average (N days)** using `rolling_average_days` from the stats response.

**Mark complete:** `[x] 5.2 - Today's Fortune card`

---

### Task 5.3: Lowest Fortune Card (Dual Display)

**What:** Early warning system for upcoming "perils" (lowest balance points).

**Implementation:**
- **Component:** `LowestFortune.jsx`
- **Data:** `GET /api/predictions/lowest` (forecast/perils use server **prediction horizon** from settings). Footer and empty-state copy reference **`prediction_horizon_days`** from `GET /api/settings` so UI text matches the configured window (not a hard-coded "90 days").
- **Behavior:** Displays the next two distinct dates where the predicted balance hits a local minimum within that horizon
- **Visibility:** Hidden by default on non-primary accounts

**Mark complete:** `[x] 5.3 - Lowest Fortune card (dual display)`

---

### Task 5.4: Record Thy Deed Form

**What:** Quick transaction entry tool.

**Implementation:**
- **Component:** `RecordDeed.jsx`
- **Features:** 
  - Toggle between "Daily" and "Unplanned"
  - Hierarchical category selection
  - Subcategory autocomplete (with auto-creation of new subcategories as child categories)
  - Expandable section for backdating and descriptions

**Mark complete:** `[x] 5.4 - Record Thy Deed form`

---

### Task 5.5: Recent Chronicles List

**What:** A dashboard card showing recent transactions for the selected account (all statuses), grouped by date, with previous/next page navigation.

**Display:**
- Card title: "Recent Chronicles" with a `BookOpen` icon
- Page size: **5 transactions per page**, newest first
- Grouped by `transaction_date` with a date label: "Today", "Yesterday", or formatted date (e.g. "14 Apr 2026")
- Within each date group: transactions sorted newest-first by creation time
- Prev / Next buttons at the bottom; Prev hidden on page 1, Next hidden when the last fetch returned fewer items than the page size
- While loading: 3 skeleton placeholder rows (pulsing opacity)

**Each transaction row** (`tx-row` CSS class):
- Left border colour: red (`tx-row-expense`) for positive amounts (expenses), green (`tx-row-income`) for negative amounts (income/refunds), gold for transfers/corrections
- Left side:
  - Primary line: `category_name` (bold); if type is `transfer` or `correction`, show the type label in title case instead
  - Secondary line (`.tx-meta`): subcategory if present · payment method name if present
- Right side (top): amount with sign — `−42.00` in red for expenses, `+42.00` in green for income/refunds
- Right side (bottom): transaction type badge (`.badge .badge-muted`) + if `confirmed === false`, a yellow "Unconfirmed" badge with a one-click **Confirm** button (calls `PATCH /api/transactions/{id}` with `{ confirmed: true }`)
- Rows are not otherwise clickable in this task (full edit/delete lives in Phase 6.2)

**Unconfirmed transactions:** shown in the list with slightly reduced opacity. A small "Confirm" button on the row confirms them inline (optimistic update via `useUpdateTransaction`). Note: there is currently no UI path to *create* unconfirmed transactions — that feature comes later.

**Empty state:** "Thy treasury holds no chronicles yet." in muted italic.

**Backend change required:**
- Add `category_name` property to `backend/app/models/transaction.py` (same pattern as `payment_method_name`: `return self.category.name if self.category else None`)
- Add `category_name: Optional[str] = None` field to `TransactionResponse` in `backend/app/schemas/transaction.py`
- No new endpoint needed — uses `GET /api/transactions?account_id=X&limit=10&offset=N`

**Frontend files:**
- `frontend/src/components/dashboard/RecentChronicles.jsx` ← new
- `frontend/src/pages/DashboardPage.jsx` ← add `<RecentChronicles />` to the grid (natural grid flow, no full-width span)

**No new hooks needed** — reuses `useTransactions(filters)` and `useUpdateTransaction` from `useTransactions.js`.

**Mark complete:** `[x] 5.5 - Recent Chronicles list`

---

### Task 5.6: Future Prophecies List

**What:** A dashboard card showing the next pending prediction instance per active template for the selected account, with one-click confirm or an expandable form for adjustments.

**Data source:** `GET /api/predictions/instances?status=pending&account_id=X&next_per_template=true`
- Returns one instance per template: the earliest pending `scheduled_date`
- Sorted ascending by `scheduled_date`
- All generated instances included (no date cutoff)

**Display:**
- Card title: "Future Prophecies" with a `Scroll` icon
- Page size: **5 per page**, paginated client-side (fetch all, slice in component)
- Each row: gold left border, template name (bold), date label + plain amount in secondary line
- Overdue badge (red "Overdue") on instances where `scheduled_date < today`
- Empty state: "Thy future holds no prophesied deeds."
- Loading: 3 skeleton rows

**Each row actions:**
- **Skip** button (ghost): calls `POST /api/predictions/instances/{id}/skip`
- **Confirm** button (gold, one-click): calls `POST /api/predictions/instances/{id}/confirm` with `create_transaction: true` and template defaults
- **Expand chevron**: reveals inline adjust form
  - Amount field (pre-filled from template amount as placeholder)
  - Date field (pre-filled to today)
  - Payment method dropdown (pre-filled from template's `payment_method_id`)
  - "Record & Confirm" submits `confirm` with all adjusted values

**Backend changes required:**
- Add `payment_method_id` (optional FK → `payment_methods`) to `prediction_templates` model + schema
- Add `payment_method_name` property to `PredictionTemplate` model (same pattern as transaction)
- Add `template_payment_method_id` and `template_payment_method_name` properties to `PredictionInstance` model (reads from `self.template`)
- Add `payment_method_id` to `PredictionInstanceConfirm` schema (passed to created transaction)
- Add `next_per_template: bool = False` query param to `GET /api/predictions/instances`; when true, return only the earliest pending instance per template via a SQL subquery
- Alembic migration: add `payment_method_id` column to `prediction_templates`

**Dashboard placement:**
- Primary accounts: Column 2, under `LowestFortune`
- Non-primary accounts: Column 2 (right column), under `RecordDeed`

**Files:**
- `backend/app/models/prediction.py` ← add FK + properties
- `backend/app/schemas/prediction.py` ← update all relevant schemas
- `backend/app/services/prediction_instance_service.py` ← add next_per_template + confirm payment_method
- `backend/app/services/prediction_template_service.py` ← pass payment_method_id on create
- `backend/app/api/predictions.py` ← add next_per_template param
- `frontend/src/components/dashboard/FutureProphecies.jsx` ← new component
- `frontend/src/pages/DashboardPage.jsx` ← add to grid

**Mark complete:** `[x] 5.6 - Future Prophecies list`

---

### Task 5.7: Floating advisor

  - Fixed position, bottom-right corner
  - Circular badge (placeholder div now; swap for real badge image on server)
  - Hover: rotates 5°, scales up, triggers speech bubble
  - Click: toggles bubble on/off (mobile-friendly alternative to hover)
  - Bubble: random tip from a medieval tip pool, with Info icon
  - Pulsing gold glow ring animation on the badge
  - Tip pool (should be easily editable, i.e., via json) includes spending warnings, balance observations, encouragement

**Mark complete:** `[x] 5.7 - Floating Sir Spendalot advisor`

---

## Phase 6: Quick entry & other pages

**Purpose:** Mobile-friendly bulk expense entry, full management pages for transactions/predictions/settings/treasury, and the dedicated analytics route. Uses the same `page-shell` / `page-container` rhythm as the dashboard; **Settings** and **Quick Entry** share the **`max-w-3xl`** main column width. The **compact analytics chart on the dashboard** is deferred to **Phase 9.2** (formerly 7.1) so the dashboard block and `/analytics` page are documented separately.

---

### Task 6.1: Quick entry page

**What:** One-stop page at `/quick-entry` to record many expenses in one submit and resolve pending prediction instances. Uses the same layout shell and sidebar as other app pages.

**Route & shell:**
- Route: `quick-entry` (protected). Nav: **Main → Quick Entry** (`Zap` icon).
- `PageContainer` matches dashboard; no extra horizontal padding overrides.
- **`AccountSwitcher`** — selected account drives instances and batch transactions.

**Layout (top → bottom):**
1. Page title + subtitle (includes selected account name).
2. **Prophecies Awaiting** — collapsible card, **collapsed by default**; header shows count and overdue count; chevron toggles expand.
3. **Record Thy Deeds** — multi-row form; submit button at bottom of form (not sticky).
4. **Max width:** The stack containing both cards uses **`max-w-3xl w-full`** (left-aligned, not centered) so the blocks stay readable on Full HD and wider without stretching full-bleed.

**Prophecies Awaiting (list):**
- **Data:** `GET /api/predictions/instances?status=pending&account_id={id}&next_per_template=true` (same semantics as dashboard “Future Prophecies”: one row per template, earliest pending; includes overdue past-dated pendings).
- **Actions:** **Skip** → `POST /skip`; **Add** → appends a **prediction-linked** row to the form and scrolls/focuses amount. Rows already added to the form show as dimmed / “Added ✓”.
- **Expanded body** uses explicit padding (`px-6 pt-6 pb-4`) so the first list row does not sit under the card header.

**Record Thy Deeds (form):**
- **Rows:** One or more rows. Each **plain** row: per-row **Daily / Unplanned** toggle (full-width two buttons; delete control on the **label row** so it does not squeeze the toggles). Fields: amount (id `qe-amount-{rowId}` for focus), date, category, subcategory (datalist + auto-create child category on submit, same pattern as dashboard `RecordDeed`). **Payment method** and optional **Description** sit under a **More details** collapsible (parity with dashboard `RecordDeed`); `description` and `payment_method_id` are sent on batch create.
- **Prediction-linked** rows: locked to “predicted”; show template name + scheduled due date; **no** category (confirm uses `POST /api/predictions/instances/{id}/confirm` with `create_transaction: true` — same backend behaviour as dashboard confirm).
- **Duplicate deed** — clones the **last plain** row (type, date, category, subcategory, payment, description, empty amount); **Add another deed** — new empty row. After add/duplicate, focus moves to the new row’s **amount** field (after ~10ms so the input exists).
- **Submit:** `noValidate` on `<form>`. Only rows with a **non-empty amount** are submitted. Category is **required only when a plain row has an amount** (empty trailing rows are ignored). Prediction confirms run sequentially; plain rows go in `POST /api/transactions/batch`. **409** on duplicate confirm → row-level error (backend message: already settled elsewhere).
- **Success:** toast shows count — “Thy deed is inscribed!” or “Thy {n} deeds are inscribed!”
- **Collapsed rows:** When valid, row can collapse to a one-line summary; **type pills** match **Recent Chronicles** (`Daily` / `Unplanned` muted vs primary, `Scheduled` for predicted). **Date** shown on the summary line; meta line includes date, optional “due …”, payment method; plain rows may show a **truncated description** preview when set.

**Key files:**
- `frontend/src/pages/QuickEntryPage.jsx`
- `frontend/src/components/quick-entry/QuickEntryForm.jsx`
- `frontend/src/components/quick-entry/ExpenseRow.jsx`
- `frontend/src/components/quick-entry/PendingProphecies.jsx`
- `frontend/src/components/quick-entry/rowUtils.js`
- `frontend/src/styles/quick-entry.css` (touch targets only)

**Backend:** `confirm_instance` returns **409** if instance is not pending (e.g. confirmed in another tab); message is user-facing.

**Mark complete:** `[x] 6.1 - Quick entry page`

---

### Task 6.2: Transaction management page

**What:** Full-featured transaction list with filters, inline edit, and soft-delete.

**Filters:**
- Date range (from / to)
- Account
- Category (type)
- Subcategory (free text contains)
- Transaction type (daily / unplanned / predicted / transfer)

**Features:**
- Paginated list, newest first
- Click row → edit modal (amount, date, category, subcategory, description)
- Delete → soft-delete with confirmation (`deleted_at` set, row hidden from list)
- Filter state reflected in URL query params (shareable/bookmarkable)

**Mark complete:** `[x] 6.2 - Transaction management page`

---

### Task 6.3: Prediction management page

**What:** Manage prediction templates and view/confirm/skip upcoming instances.

**Features:**
- List all prediction templates (name, amount, frequency, next scheduled date, status)
- Per-template pause/resume toggle — pausing immediately deletes future pending instances, resuming regenerates them
- Paused templates shown visually distinct (greyed out, "Paused" badge)
- Edit template (name, amount, frequency, day of month, start date)
- Delete template (confirmation dialog; cascades hard-delete on all future pending instances, leaves past instances)
- Expandable upcoming instances per template (next N instances with confirm/skip buttons)
- Template creation pop-up

**Mark complete:** `[x] 6.3 - Prediction management page`

---

### Task 6.3b: Universal sticky page topbar

**What:** Introduce a shared horizontal top context block used across app pages for consistent title/subtitle/account scope behavior.

**Goal:** Eliminate page-to-page inconsistency where account context is visible on some pages (Dashboard, Quick Entry) but absent on others (Chronicles, Prophecies, etc.).

**Core behavior:**
- Shared component (e.g. `PageContextHeader`) rendered near top of page content area
- Contains:
  - page title
  - page subtitle
  - optional account row (`AccountSwitcher`)
- Sticky at top of scrollable content area (horizontal equivalent of persistent context bar)
- Medieval styling consistent with current design language (gold accents, parchment text, subtle background)
- Selected account state is global (single source of truth) and persists while navigating between pages

**Visibility rules (initial scope):**
- **Show account row:** Dashboard, Quick Entry, Chronicles (`/transactions`), Prophecies (`/predictions`), Analytics
- **Hide account row:** Settings (`/settings`) for now (title/subtitle still shown)

**Filtering integration rules:**
- **Chronicles (`/transactions`):** remove the local "Account" filter control; page data is filtered by the currently selected account from the topbar account row
- **Prophecies (`/predictions`):** templates/instances are filtered by the currently selected account from the topbar account row
- Account changes in the topbar immediately refresh account-scoped queries on the current page
- Navigating to another page preserves the same selected account (until user explicitly changes it)

**Layout notes:**
- Keeps current sidebar shell unchanged
- Replaces duplicated per-page title/subtitle blocks to avoid divergence
- Works with existing page-specific content width rules (e.g. `max-w-3xl` stacks) without forcing all pages to same width

**Deliverables (representative):**
- `frontend/src/components/layout/PageContextHeader.jsx` (new shared component)
- Page updates to consume shared topbar:
  - `frontend/src/pages/DashboardPage.jsx`
  - `frontend/src/pages/QuickEntryPage.jsx`
  - `frontend/src/pages/TransactionsPage.jsx`
  - `frontend/src/pages/PredictionsPage.jsx`
  - `frontend/src/pages/AnalyticsPage.jsx`
  - `frontend/src/pages/SettingsPage.jsx`
- Optional supporting CSS tweaks in `frontend/src/index.css` (sticky spacing/z-index only)

**Acceptance criteria:**
- Header remains visible while scrolling each page’s content
- Account selection is available and consistent on all non-settings pages listed above
- No duplicate title/subtitle/account rows remain in migrated pages
- Chronicles account scope comes from topbar selection (no separate account dropdown on that page)
- Prophecies content reflects currently selected account
- Selected account persists across route changes within the app shell
- Mobile and desktop layouts remain usable with sidebar/topbar layering

**Mark complete:** `[x] 6.3b - Universal sticky page topbar`

---

### Task 6.4: Settings page

**What:** UI page at `/settings` for **application-level preferences only** (not master data). Accounts, categories, subcategories, and payment methods live on **Treasury** (Task 6.4a).

**Layout & shell:**
- Same **`page-shell` + `PageContextHeader`** as other pages; **account switcher hidden** on this page (`showAccountSwitcher=false`).
- **Content width:** Inner stack uses **`max-w-3xl w-full`** (same rhythm as Quick Entry) so forms do not full-bleed on wide monitors.

**Sections:**

**Forecast & Stats (card + save):**
- `prediction_horizon_days` — forecast + instance scheduling window (default **90**, min 7, max 365). Changing this value **after save** triggers backend **regeneration** of pending prediction instances for the new horizon (purge today-forward pendings per active template, prune any pending beyond the new end date, then rebuild). Frontend invalidates prediction instances, forecast, lowest-perils, and stats queries.
- `rolling_average_days` — how many **non-excluded** calendar days (ending yesterday) contribute to the **daily-only** rolling spend baseline (default **30**, min 3, max 180).
- `daily_high_threshold` / `daily_low_threshold` — integers treated as **percent of rolling average** for **Daily** spend heat on the dashboard **Today's Fortune** card only (defaults **110** / **90**; validated: low must be **strictly** less than high). Enforced server-side on `PATCH`.
- **Numeric inputs:** Stored as strings in form state so the user can **clear** a field; **placeholder** shows the default for that field. On save, empty or non-numeric values **coerce** to defaults (then clamp to min/max). Inline **"Low threshold must be lower than high threshold"** warning compares **coerced** values (empty counts as default), same as submit validation.
- **Checkboxes** (decimals, predictive on non-primary, require payment method, require subcategory): same styling as Chronicles filters — `inline-flex`, label **`text-gold-muted`**, input **`h-4 w-4 accent-gold`**.
- **Show decimals:** Persisted on `Settings`; **`DisplayFormatSync`** (in `Layout.jsx`) reads settings and updates **`format.js`** so `formatAmount` / `formatSigned` use 0 or 2 fraction digits app-wide after load/save.

**Excluded Days (card):**
- **Header row (Treasury pattern):** primary **Exclude today** aligned **`ml-auto`**; if today is already excluded, replace with inactive copy **Today excluded** (muted italic).
- **List:** Each row shows date, reason, remove; sorted newest-first; **pagination: 5 rows per page** with **Previous / Next** footer matching **Recent Chronicles** (chevrons + `border-t border-gold/10`).
- **Add row:** date picker + optional reason + **Add excluded day**.
- **Backend:** `GET/POST/DELETE /api/excluded-days` (create is idempotent for duplicate dates — handle gracefully in UI).

**Backend / API:**
```
GET/PATCH  /api/settings
GET/POST/DELETE /api/excluded-days
```
- **`Settings` model** (singleton row `id=1`): fields above plus `primary_account_id` (reserved for future use if not yet wired in UI).
- **`GET /api/stats/today`:** Response includes `rolling_average_days`, `prediction_horizon_days`, `daily_high_threshold`, `daily_low_threshold` so the dashboard fortune card stays one request.

**Representative files:**
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/hooks/useSettings.js`, `frontend/src/api/settings.js`
- `frontend/src/components/layout/Layout.jsx`, `frontend/src/components/layout/DisplayFormatSync.jsx`
- `frontend/src/utils/format.js`
- `backend/app/models/settings.py`, `backend/app/schemas/settings.py`, `backend/app/services/settings_service.py`, `backend/app/api/settings.py`
- `backend/app/services/prediction_instance_service.py` (horizon regeneration helpers)
- `backend/app/schemas/stats.py`, `backend/app/services/stats_service.py` (stats payload extensions)
- Migration: `alembic/versions/e3a1c4b9d2f0_expand_settings_for_phase_6_4.py` (and later revisions if any)

**Mark complete:** `[x] 6.4 - Settings page`

---

### Task 6.4a: Treasury page (`/treasury`)

**What:** Single **master data** page for **accounts**, **categories** (typed daily/unplanned), and **payment methods**. Same “content” class of information; no tabs — a **two-column layout** tuned for volume: **Categories** get the tall right column; the left column stacks **Accounts** (top) and **Payment methods** (underneath).

**Route & shell:**
- Route: `/treasury` (protected). Sidebar **Config** section: **Treasury** link **above** **Settings**, label **Treasury**, icon **`Landmark`**.
- Uses same **`page-shell` + `PageContextHeader`** pattern as other pages.
- **No account switcher on this page** (topbar `showAccountSwitcher=false`): the page is about configuring *all* accounts, not scoping the app to one account. Operational pages (Dashboard, Chronicles, Prophecies, etc.) keep the global account switcher.
- **Copy / punctuation:** Prefer plain ASCII in user-visible strings in source (e.g. hyphen instead of em dash) where tooling or SFTP encoding has caused mojibake for smart punctuation.

**Layout (desktop):**
- Grid: **two equal-width columns** (`1fr` / `1fr`).
- **Left column:** **Accounts** card (top) + **Payment methods** card (below).
- **Right column:** **Categories** card spans full column height (tall list area).
- Mobile: single column — order: Accounts → Categories → Payment methods.

**Accounts block (left, top):**
- Header: title + `[ + New account ]`.
- List of accounts (primary first, then stable sort e.g. by name/id). Each row shows: name, type (`current` / `savings`), **current balance** (from API), primary indicator (crown / badge).
- **Row actions** (Chronicles-style compact controls, not an overflow menu unless space is tight):
  - **Edit** — opens modal (see below).
  - **Balance correction** — separate modal only: row action uses **`Scale`** icon (tooltip “Balance correction”); **not** combined inside Edit modal.
  - **Delete** — **not shown for the primary account** (no “pick another primary first” flow in UI — simply hide the control). For non-primary: use **current** backend delete rules (hard delete blocked when transactions/templates/transfers exist — show error message with counts).
  - **Transfer** — opens transfer flow (existing API); not inside Edit modal.
- **Set primary:** no row shortcut — only inside **Edit account** modal for non-primary accounts (**checkbox** “Make this the primary account”); save applies `PATCH` with `is_primary: true` when checked.
- **Edit account modal:** name, account type; **default payment method** when backend supports it (align with Phase **7.5** — omit until then). **No** current balance here (see correction modal).
- **Balance correction modal (separate):** shows **current balance** with optional **Refresh from ledger**; fields `target_balance`, `correction_date`, optional note; **Apply correction** submits only `POST /api/accounts/{id}/balance-correction`. Saving the Edit modal must **never** imply a correction.
- **New account:** modal consistent with Edit for name/type/opening balance + optional primary checkbox; balance correction applies only after the account exists (via row action + correction modal).

**Categories block (right, tall):**
- **Type switch** at top of block: **`Daily` | `Unplanned`** — all listed categories are filtered by `category.type` (matches existing model: `daily` / `unplanned` only).
- List top-level categories for the selected type (parent rows). **Subcategories:** no separate CRUD in this task — for each parent category, show an **expandable** or secondary line listing **distinct subcategory strings** already used on transactions under that parent (read-only aggregate via **`GET /api/categories/subcategory-usage`**). Purpose: visibility of “what exists in the wild” without building full subcategory management yet.
- Actions per category: rename, delete (current backend rules: cannot delete if children or if referenced by transactions — keep as-is until Phase **9.1** soft-delete).
- `[ + New category ]` for the active type (parent categories only for MVP unless product expands).

**Payment methods block (left, under Accounts):**
- List methods with **`transaction_count`** on each row (API). Add, rename, delete per **current** API rules (hard delete blocked when in use).
- Seeded defaults remain backend concern (`Card`, `Cash`).

**Client cache:** After Treasury mutations, invalidate relevant TanStack Query keys (`accounts`, `categories`, `payment-methods`, `transactions`, `subcategories`, `stats`, `forecast`, `lowest-points`, prediction templates/instances) so Dashboard / Quick Entry / Prophecies reflect changes without a full reload.

**Delete / archive wording:**
- Use **Delete** in UI for consistency with Chronicles language; behavior follows **current** hard-delete + guards until Phase **9.1**.

**Backend endpoints (current — extend only if 7.5 needs new fields):**
```
GET/POST/PATCH/DELETE /api/accounts
POST /api/accounts/{id}/balance-correction
GET/POST/PATCH/DELETE /api/categories
GET/POST/PATCH/DELETE /api/payment-methods
GET /api/categories/subcategory-usage
```

**Mark complete:** `[x] 6.4a - Treasury page`

---

### Task 6.5: Analytics page (`/analytics`)

**What:** Dedicated analytics page (not the small dashboard widget), scoped by the topbar-selected account.

**Global behavior:**
- The selected account in the universal topbar is the analytics data source.
- Hide cards/charts that have empty datasets where possible; use compact helper text when a section has no rows for the selected period.
- Split page into sections by data type; each section can own its own filters.
- Use settings-driven periods and thresholds where applicable:
  - `rolling_average_days`
  - `daily_high_threshold`
  - `daily_low_threshold`
- Include **scheduled/predicted** spending where analytically appropriate (it is spending), while still excluding transfer/correction flows from spending-only aggregates unless explicitly labeled otherwise.

**Section A - Composition**
1. **Spending by type** (daily / unplanned / scheduled):
   - Donut chart for selected period with window switch (`30d | 60d | 90d`).
   - Expandable legend rows show per-type breakdown.
   - For **Scheduled**, category labels use prediction template names (fallback: parsed `Confirmed: ...` description), not "In lieu ..." subcategory notes.
2. **Spending by category (current month)**:
   - Top-level category distribution for the selected month anchor.
   - Header switch: `Daily | Unplanned`.
   - Previous/Next month navigation.
   - Select category to inspect subcategory breakdown list.

**Section B - Baseline behavior**
3. **Daily spending vs average**:
   - Trend view for the selected `rolling_average_days` window.
   - Baseline from rolling-average spending; visual status for above/below/in-range thresholds.

**Section C - Time trends**
4. **Monthly comparison**:
   - Calendar-month totals for recent months with spending and gains.
   - Pagination (5 items/page) with Previous/Next controls.
   - Month-over-month direction indicators (`↗`, `↘`, `→`) with spending/gains-specific coloring semantics.
5. **Account balance history**:
   - Deferred from this task; not implemented in 6.5 MVP.
   - Candidate follow-up in Phase 9 if needed.

**Section D - Insight blocks**
6. **Text achievements** (when data exists):
   - e.g. days above zero, longest streak without unplanned spend, days since last overdue prediction.
7. **Top expenses for chosen period**:
   - Most expensive single purchase
   - Biggest spending day
   - Most frequent category/subcategory/payment method
   - (No merchant/payee metric in this task; no dedicated merchant field)
8. **Category trends**:
   - Delta vs previous comparable period (percent up/down).
   - Optional tiny sparklines if data is already available; otherwise text+delta only for MVP.

**Backend endpoints (minimum for this task):**
```
GET /api/stats/spending-by-category?date_from=&date_to=&tx_type=&account_id=
GET /api/stats/spending-by-subcategory?category_name=&date_from=&date_to=&tx_type=&account_id=
GET /api/stats/spending-by-type?date_from=&date_to=&account_id=
GET /api/stats/daily-trend?days=30&account_id=
GET /api/stats/monthly-comparison?account_id=
GET /api/stats/insights?date_from=&date_to=&account_id=
```

**Implementation notes (completed in 6.5):**
- Analytics queries are account-scoped and refetch on topbar account change.
- Spending-by-category and subcategory endpoints accept optional `tx_type` (`daily|unplanned|predicted`) for filtered composition views.
- Scheduled breakdown labels are derived from prediction templates when available.
- Seed/demo analytics data supports both primary and secondary accounts for validation.

**Frontend / data notes:**
- Keep chart rendering resilient to sparse data.
- Use account-scoped query keys so topbar account changes refetch analytics cleanly.
- Reuse existing card and typography patterns from dashboard for consistency.

**Note:** The **compact “spending by type” bar chart on the dashboard** remains **Phase 9.2**; this task covers the dedicated `/analytics` page only.

**6.5 completion checklist:**
- [x] Composition section shipped (type + category views)
- [x] Baseline section shipped (daily spending vs average)
- [x] Monthly comparison shipped (with pagination + delta arrows)
- [x] Insight blocks shipped
- [x] Account-scoped analytics behavior verified

**Mark complete:** `[x] 6.5 - Analytics page`

---

## Phase 7: Additional Features

**Purpose:** Auth hardening, import tooling, polish, and UX defaults. **Dashboard-only analytics chart (old 7.1)** and **Recent Chronicles inline edit/delete (old 7.6)** are deferred to **Phase 9** — see Tasks **9.2** and **9.3**.

---

### Task 7.1: Analytics charts block (dashboard only) — deferred

**Status:** Moved to **Phase 9, Task 9.2** (post-release). No longer tracked in Phase 7 checklist.

---

### Task 7.2: Enforce authentication

**What:** Swap `optional_auth` → `require_auth` on all API routes; verify login page and redirects.

**Mark complete:** `[x] 7.2 - Enforce authentication`

---

### Task 7.3: Data migration tool (from Google Sheets)

**What:** Import historical data from exported table into Sir Spendalot with mapping + dry run.

**Input format (MVP):**
- **CSV upload** via UI (easiest setup; no Google API credentials required).
- Source columns:
  - `Date`
  - `Category`
  - `Subcategory`
  - `Sum`
  - `From bot` (ignored)
  - `Applied` (ignored)
  - `Delete`
- Parse rules from sample:
  - `Date` format: `DD/MM/YYYY`
  - `Sum` examples: `€50.0`, `"€3,068.0"` (strip currency symbol + thousands separators)
  - `Delete`: treat `TRUE` as deleted row (skip import)

**Location / UX:**
- Add link in **Settings** page: "Import historical data (CSV)".
- No dedicated sidebar navigation item.
- Open import wizard page/modal from Settings.

**Wizard flow:**
1. Upload CSV and parse rows
2. Validate rows and show preview/errors
3. Build unique source keys by `(Category, Subcategory)` and map each key
4. Dry-run summary (no writes): projected per-account balance after import
5. Confirm import and show results report

**Mapping rules (by source `Category`):**
- `💸 Daily`:
  - map to Sir Spendalot **daily** parent category, optionally with fixed subcategory
- `📉 Big expense`:
  - treat as **unplanned expense**
  - map to:
    - unplanned category/subcategory
    - OR transfer (source + target account)
    - OR correction (decreasing)
- `📈 Big earning`:
  - same options as big expense, but sign/direction is income/increase
- `🔮 Prediction`:
  - map to a prophecy template
  - import must create corresponding instances and immediately confirm them

**Import execution rules:**
- Ignore `From bot`, `Applied`
- Skip rows with `Delete=TRUE`
- Use existing creation flows where possible:
  - plain rows via transaction batch flow (same as Quick Entry path)
  - transfers via transfer flow
  - corrections via same balance-correction flow as Treasury
  - predictions via instance/template flow, with immediate confirmation
- Import targets currently selected account by default, except explicit transfer mappings which include source/target accounts.

**Mapping persistence:**
- Save mapping configuration so multiple imports can reuse mappings.
- Nuke script must also delete mapping data.
- Backup/restore flow must include mapping data.

**Create-on-the-spot capability:**
- During mapping, allow creating missing categories/subcategories without leaving importer.

**Error handling/reporting:**
- Before commit: show parse/mapping validation errors (invalid date/amount, unmapped keys, invalid account refs)
- After commit: show per-row success/failure report with reason
- No duplicate-import guard required in this task

**Deliverables (planned):**
- Backend:
  - import/mapping persistence models + migration(s)
  - import orchestration endpoints/services
  - nuke script update to include importer mapping tables
  - backup/restore script(s) including importer mapping tables
- Frontend:
  - Settings entry point for import
  - import wizard UI (upload, mapping, dry-run, commit, report)

**Mark complete:** `[x] 7.3 - Data migration tool (from Google Sheets)`

---

### Task 7.4: UI improvements

**What:** Cross-cutting UI polish.

- Dashboard: in This Day's Fortune, "Excluded Day" pill makes the title overflow to the second row
- prophecies: add filters (gain/expense, frequency, active/paused, by partial title match), collapsed by default, see filters style in Chronicles
- Sidebar collapsible
- Dashboard: Block positioning consistent between primary and secondary accounts
- Dashboard, Recent Chronicles: review pill coloring (Unplanned/Daily/etc)

**Mark complete:** `[x] 7.4 - UI improvements`

---

### Task 7.5: Default payment method (per account)

**What:** Default payment method selected when submitting a transaction from the dashboard **Record Thy Deed** block and **Quick entry**; configurable per account.

**Specs (implemented):**
- **Backend model/API:** `accounts.default_payment_method_id` (nullable FK → `payment_methods`, `ON DELETE SET NULL`) added and exposed in account create/update/response payloads.
- **Treasury UI:** Account create/edit modal includes **Default payment method** selector (`None` + available payment methods).
- **Dashboard (`Record Thy Deed`):** payment method field preselects selected account default.
- **Quick Entry (plain rows):** new rows (add/duplicate/reset) prefill payment method from selected account default.
- **Quick Entry (prediction-linked rows):** payment method uses template default first; if absent, falls back to selected account default.
- **Account switch behavior:** existing unsaved Quick Entry rows keep their current values; only newly added rows use the newly selected account default.

**Mark complete:** `[x] 7.5 - Default payment method (per account)`

---

### Task 7.6: Recent Chronicles edit / soft-delete (dashboard) — deferred

**Status:** Moved to **Phase 9, Task 9.3** (post-release). No longer tracked in Phase 7 checklist.

---

### Task 7.7: Chronicles improvement

**What:** Improve Chronicles filters/edit UX by moving category handling to parent categories and making subcategory selection guided.

**Specs:**
- **Category selection:** use **parent categories only** in Chronicles filters and edit modal.
- **Parent-category filtering behavior:** selecting a parent category includes transactions saved either directly on that parent or on its child categories.
- **Subcategory control (filters):** shown only when a parent category is selected.
- **Subcategory control (edit modal):** driven by selected parent category.
- **Subcategory options source:** use `GET /api/categories/subcategory-usage` mapping (`parent_id -> used subcategory list`) when available; do not add new backend endpoint for this feature.
- **Input mode:** dropdown + custom fallback (user can still type a custom subcategory when needed).
- **Dependent reset:** changing/clearing selected parent category clears selected subcategory filter/value to avoid stale combinations.

**Mark complete:** `[x] 7.7 - Chronicles improvement`

---

### Task 7.8: Explicit income/expense control

In both Quick entry page and Record Thy Deed dashboard block, user can provide negative amount to submit gain (rather than expense).
Instead, logic of "negative means gain" should remain on backend. For user, the system should only accept positive amounts in buth submitting spots; "Expense/Gain" should be a subtle toggle appearing only for unplanned expenses (daily should ONLY accept positive = expense). Submitting scheduled transaction via Future Prophecies dashboard block/Quick entry should only accept positive amounts; final decision on the sign should come from the template of the Prophecy.

**Mark complete:** `[ ] 7.8 - Explicit income/expense control`

---

### Task 7.9: Components reuse

Reuse components wherever possible for design unification:
- paging in Recent Chronicles is a separate component from that in Chronicles List; 
- in "Prophecies", action buttons Edit/Delete/Pause look different than they do in Treasury, Chronicles; 
- in Treasury, account type display (current/savings) is different from pill style as in topbar; 
- "whisper" in Thy Lowest Fortunes dashboard block (Forecasted over the next X days) seems to be used in that single place only;
- in Chronicles "Show deleted" is a checkbox inactive by default. In Proophecies it's a dropdown "Status" with "All" selected by default.
- etc...
Suggest replacements where appropriate before implementing.
After implementing and before moving to next feature, introduce rule change that will make the agent in future defelopment prioritize reusing components intead of creating new ones.

**Mark complete:** `[ ] 7.9 - Components reuse`

---

## Phase 8: Deployment

**Purpose:** Productionize the running service with systemd, proper Caddy config, and backup automation.

---

### Task 8.1: Systemd Services

**What:** Create and enable systemd service for the FastAPI backend.

**File: `/etc/systemd/system/spendalot-api.service`**
```ini
[Unit]
Description=Sir Spendalot API
After=network.target postgresql.service

[Service]
Type=simple
User=basil
WorkingDirectory=/home/basil/sir-spendalot/backend
Environment="PATH=/home/basil/sir-spendalot/venv/bin"
ExecStart=/home/basil/sir-spendalot/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**Server Commands:**
```bash
ssh basil@sir-spendalot.tmn.name
sudo nano /etc/systemd/system/spendalot-api.service
sudo systemctl daemon-reload
sudo systemctl enable spendalot-api
sudo systemctl start spendalot-api
sudo systemctl status spendalot-api
```

**Mark complete:** `[x] 8.1 - Systemd services`

---

### Task 8.2: Caddy Reverse Proxy

**What:** Confirm Sir Spendalot site snippet is active (already done in Phase 0.4).

At this point Caddy should already be serving the domain. This task is a final validation after frontend build is in place.

**Server Commands:**
```bash
ssh basil@sir-spendalot.tmn.name
sudo caddy adapt --config /etc/caddy/Caddyfile --pretty 2>/dev/null | rg "sir-spendalot"
curl https://sir-spendalot.tmn.name/api/health
curl -I https://sir-spendalot.tmn.name/api/docs
curl -I https://sir-spendalot.tmn.name/api/redoc
```

**Docs routing validation note:**
- API docs must be reachable at `/api/docs` and `/api/redoc` (200 OK).

**Mark complete:** `[x] 8.2 - Caddy reverse proxy`

---

### Task 8.3: Production Environment Configuration

**What:** Switch backend to production mode and tighten config.

```bash
ssh basil@sir-spendalot.tmn.name
cd /home/basil/sir-spendalot/backend
nano .env
# Set ENVIRONMENT=production
# Verify ALLOWED_ORIGINS only includes https://sir-spendalot.tmn.name
sudo systemctl restart spendalot-api
```

**Mark complete:** `[x] 8.3 - Production environment configuration`

---

### Task 8.4: Backup Automation

**What:** Automated database backup to restic.

```bash
# Add to cron (crontab -e):
0 3 * * * pg_dump -U basil sir_spendalot | gzip > /home/basil/sir-spendalot/backups/db-$(date +\%Y\%m\%d).sql.gz
5 3 * * * restic -r rclone:gdrive:backups backup /home/basil/sir-spendalot/backups/ /home/basil/sir-spendalot/backend/.env
```

**Mark complete:** `[x] 8.4 - Backup automation`

---

### Task 8.5: Prepare & upload to git

**What:** Ensure project files are versioned safely in a public repository and pushed from local machine.

**Checklist:**
- Initialize standalone git repo in project root.
- Add `.gitignore` before first full stage.
- Confirm secrets/local files are not staged (`backend/.env`, `.cursor/`, `.history/`, `.vscode/`, backups).
- Commit with concise message and push to remote.

**Mark complete:** `[x] 8.5 - Prepare & upload to git`

---

## Phase 9: Post-release improvements

**Purpose:** Items intentionally deferred until after core product ship: consistency upgrades (soft-delete parity), dashboard polish that duplicates full pages, and small UX enhancements that are not blocking for first release.

---

### Task 9.1: Soft-delete for accounts, categories, and payment methods

**What:** Align master-data entities with **transaction** soft-delete semantics: add `deleted_at` (or equivalent), hide deleted rows in default lists, optional **Show deleted** toggles on Treasury (and/or API `include_deleted`), and **restore** endpoints where appropriate. Update uniqueness constraints and foreign-key behavior so historical transactions keep valid references to “deleted” categories/methods/accounts as needed.

**Mark complete:** `[ ] 9.1 - Soft-delete master data (accounts, categories, payment methods)`

---

### Task 9.2: Dashboard analytics charts block (compact)

**What:** Compact spending visual **on the dashboard** (below main cards). **Does not** cover the full `/analytics` page (Phase 6.5).

- Spending by type bar chart (last 30 days: daily / unplanned / predicted)

**Backend:** May share stats endpoints with Phase 6.5 where applicable.

**Mark complete:** `[ ] 9.2 - Dashboard analytics charts block`

---

### Task 9.3: Edit / soft-delete in “Recent Chronicles” (dashboard block)

**What:** Bring Chronicles-style **edit** and **soft-delete** (and restore if applicable) into the **Recent Chronicles** dashboard card so users need not navigate to `/transactions` for quick fixes.

**Mark complete:** `[ ] 9.3 - Recent Chronicles dashboard edit/delete`

---

### Task 9.5: Analytics overhaul

Analytics page is... There. It's not quite good.
Start this task with detailed analysis of the page. See what works and what doesn't. Challenge design decisions where it makes sense.

A few things to start off (consider them to be discussion points rather than orders):

- Spending by type: Pie chart is good. But 30/60/90 day windows? Why that amount and not rolling average amount? Why composite if we could just switch to previous period, or better yet, combine (1/2/3 rolling averages, show what dates currently show, and give the option to step back one rolling average amount)?
- Spending by category: kind of awkward. Why calendar month instead of period like in Spending by type? Why not have both combined? Why not the usual regular horizontal bar chart?
- Daily spending vs average: again, awkward. This is the THIRD option of period choosing (lack thereof in this case), plus it begs for line grapph with average baseline.
- Monthly comparison (spending and gains): feels like lost opportunity. Can't even elaborate. It could be a line chart, bar chart, mixed chart, and instead, it's... What it is.
- Insights: description doesn't need to state it's "text". It's good otherwise, but "Category trends" feels like it belongs to a separate block + I feel some very useful info is missing.
- Balance-over-time analytics chart (see deferred from 6.5). It's not there. It could be.


**Mark complete:** `[ ] 9.5 -  Analytics overhaul`

---

### Task 9.9: Optional normalized subcategory model

**What:** Introduce optional `subcategory_id` linkage for transactions while preserving current free-text `subcategory` behavior for compatibility and import flexibility.

**Why:** Keep quick-entry friendliness and historical import tolerance, while enabling stricter taxonomy where desired.

**Scope (planned):**
- Add dedicated subcategory entities (child categories or separate table) and add nullable `transactions.subcategory_id` FK.
- Keep existing `transactions.subcategory` text column during transition.
- Write path:
  - when a known subcategory entity is selected, persist `subcategory_id` and keep mirrored text;
  - when user types custom text, persist text and optionally auto-create/link subcategory entity based on settings.
- Read/filter path supports both:
  - `subcategory_id` exact matching for normalized rows,
  - text fallback for legacy rows.
- Migration/backfill:
  - create subcategory entities from existing `(parent category, subcategory text)` usage;
  - backfill `subcategory_id` where unambiguous.
- Importer compatibility:
  - continue accepting raw text,
  - optionally resolve to existing/new subcategory entities.

**Mark complete:** `[ ] 9.9 - Optional normalized subcategory model`

---

## Phase 10: Rolling predictions

**Purpose:** Improve prediction engine so that it accounts not only for predictions created as "Prophecies", but also for unplanned patterns.

---

### Task 10.0: Feature initiation

Initiate feature's R&D, plan the implementation when the concept is locked.

Draft:
- Sometimes unplanned expenses show patterns 
- for example: cat food is, on the average, 2 transactions 50 EUR each
- it can't be a prediction: there is no exact range (sometimes food for one cat runs out, sometimes for other, sometimes for both...)
- Solution: rolling prediction
- There should be a tool allowing to track patterns over 1/2/3 rolling periods and suggest creating/adjusting rolling expenses
- For example: rolling prediction expects an average of 100 EUR per month for cat food
- if 0 spent on cat food, it expects -100 by the end of period. If 20 spent, it expects 80 more
- sometimes parent category (i.e. cats) can show no patterns while a subcategory (i.e. Cats -> Cat food) does. The system should account for both cases.
- it should track shifts and suggest adjustments (example: over past three rolling periods there were on the average 70/period spent, while rolling average expects 100 - suggest adjustments) 
- can use existing analytics methods 
- due to many variables, there should be a tooltip in dashboard showing how the predictions were calculated

Study the codebase, suggest technical solution, UI placement, UI/UX, etc. Plan the implementation accordingly.

DOD: feature is locked, described in specs, plan updated.

**Mark complete:** `[ ] 10.0 - Feature initiation (see specs)`

---

## How to Use This Plan

### For Basil:

Say: **"Proceed with the next step"** or **"Proceed with Phase X Task Y"**

### For Cursor:

1. Check the global checklist for the next uncompleted task
2. Read the task instructions
3. Generate all code files specified in "Deliverables"
4. Provide "Server Commands" in the standard format (see CURSOR_RULES.md)
5. Include verification steps
6. Mark the task as complete in the checklist

### Updating Progress:

After each completed task, update the global checklist:
```markdown
- [x] 1.1 - FastAPI project structure
- [ ] 1.2 - Database models
```

---

*Sir Spendalot Development Plan v1.0*  
*"He who guards his code, guards his glory" 🗡️*
