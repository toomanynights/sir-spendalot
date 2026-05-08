from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stats import (
    AnalyticsInsightsResponse,
    CategorySpendingResponse,
    CategorySubcategoryResponse,
    DailyTrendResponse,
    MonthlyComparisonResponse,
    SpendingByTypeResponse,
    TodayStatsResponse,
)
from app.services.auth_service import require_auth
from app.services import stats_service

router = APIRouter(
    prefix="/api/stats",
    tags=["stats"],
    dependencies=[Depends(require_auth)],
)


@router.get("/today", response_model=TodayStatsResponse)
def get_today_stats(
    account_id: Optional[int] = Query(None, description="Defaults to primary account"),
    today: Optional[date] = Query(None, description="Client's local date (YYYY-MM-DD); defaults to server UTC date"),
    db: Session = Depends(get_db),
):
    return stats_service.get_today_stats(db, account_id=account_id, today=today)


@router.get("/spending-by-category", response_model=CategorySpendingResponse)
def get_spending_by_category(
    date_from: date = Query(...),
    date_to: date = Query(...),
    tx_type: Optional[str] = Query(None, description="daily|unplanned|predicted"),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_spending_by_category(
        db,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
        tx_type=tx_type,
    )


@router.get("/spending-by-subcategory", response_model=CategorySubcategoryResponse)
def get_spending_by_subcategory(
    category_name: str = Query(...),
    date_from: date = Query(...),
    date_to: date = Query(...),
    tx_type: Optional[str] = Query(None, description="daily|unplanned|predicted"),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_spending_by_subcategory(
        db,
        category_name=category_name,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
        tx_type=tx_type,
    )


@router.get("/spending-by-type", response_model=SpendingByTypeResponse)
def get_spending_by_type(
    date_from: date = Query(...),
    date_to: date = Query(...),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_spending_by_type(
        db,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
    )


@router.get("/daily-trend", response_model=DailyTrendResponse)
def get_daily_trend(
    days: int = Query(30, ge=7, le=365),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_daily_trend(db, days=days, account_id=account_id)


@router.get("/monthly-comparison", response_model=MonthlyComparisonResponse)
def get_monthly_comparison(
    months: int = Query(6, ge=1, le=24),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_monthly_comparison(db, account_id=account_id, months=months)


@router.get("/insights", response_model=AnalyticsInsightsResponse)
def get_insights(
    date_from: date = Query(...),
    date_to: date = Query(...),
    account_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return stats_service.get_analytics_insights(
        db,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
    )
