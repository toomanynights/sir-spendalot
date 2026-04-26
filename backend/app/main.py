from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    accounts,
    auth,
    categories,
    excluded_days,
    importer,
    payment_methods,
    predictions,
    settings as settings_api,
    stats,
    transactions,
    transfers,
)
from app.config import settings
from app.database import SessionLocal
from app.scheduler import start_scheduler, stop_scheduler
from app.services import payment_method_service, prediction_instance_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db = SessionLocal()
    try:
        payment_method_service.ensure_defaults(db)
        prediction_instance_service.generate_all_instances(db)
    finally:
        db.close()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title="Sir Spendalot API",
    description="Thy finances, foretold!",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(payment_methods.router)
app.include_router(transactions.router)
app.include_router(predictions.router)
app.include_router(stats.router)
app.include_router(settings_api.router)
app.include_router(excluded_days.router)
app.include_router(transfers.router)
app.include_router(importer.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Hark! Sir Spendalot stands ready to serve!",
        "environment": settings.ENVIRONMENT,
    }
