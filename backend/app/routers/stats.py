from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.receipt import Receipt

router = APIRouter()


def _success(data, message: str = "처리 완료"):
    return {"success": True, "data": data, "message": message}


@router.get("/stats/summary")
def get_stats_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # 기간 기본값: 최근 6개월
    if not start_date and not end_date:
        today = datetime.now(timezone.utc).date()
        # 6개월 전 첫째 날
        month = today.month - 6
        year = today.year
        if month <= 0:
            month += 12
            year -= 1
        start_date = f"{year}-{month:02d}-01"
        end_date = today.strftime("%Y-%m-%d")

    query = db.query(Receipt)
    if start_date:
        query = query.filter(Receipt.date >= start_date)
    if end_date:
        query = query.filter(Receipt.date <= end_date)

    receipts = query.all()

    # ── period_total & receipt_count ────────────────────────────
    period_total = sum(r.total_amount for r in receipts)
    receipt_count = len(receipts)

    # ── monthly_totals ──────────────────────────────────────────
    monthly_map: dict[str, float] = {}
    for r in receipts:
        month_key = r.date[:7]  # YYYY-MM
        monthly_map[month_key] = monthly_map.get(month_key, 0) + r.total_amount
    monthly_totals = [
        {"month": k, "total": v}
        for k, v in sorted(monthly_map.items())
    ]

    # ── category_totals ─────────────────────────────────────────
    category_map: dict[str, dict] = {}
    for r in receipts:
        cat = r.category or "기타"
        if cat not in category_map:
            category_map[cat] = {"total": 0.0, "count": 0}
        category_map[cat]["total"] += r.total_amount
        category_map[cat]["count"] += 1
    category_totals = [
        {"category": k, "total": v["total"], "count": v["count"]}
        for k, v in sorted(category_map.items(), key=lambda x: -x[1]["total"])
    ]

    # ── daily_totals ────────────────────────────────────────────
    daily_map: dict[str, float] = {}
    for r in receipts:
        daily_map[r.date] = daily_map.get(r.date, 0) + r.total_amount
    daily_totals = [
        {"date": k, "total": v}
        for k, v in sorted(daily_map.items())
    ]

    data = {
        "monthly_totals": monthly_totals,
        "category_totals": category_totals,
        "daily_totals": daily_totals,
        "period_total": period_total,
        "receipt_count": receipt_count,
    }

    return _success(data, "통계 조회 완료")
