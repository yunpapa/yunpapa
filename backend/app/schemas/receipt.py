from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class ReceiptItemCreate(BaseModel):
    item_name: str
    quantity: int = 1
    unit_price: float
    total_price: float


class ReceiptItemResponse(ReceiptItemCreate):
    id: int
    receipt_id: int

    model_config = ConfigDict(from_attributes=True)


class ReceiptCreate(BaseModel):
    store_name: str
    date: str  # YYYY-MM-DD
    total_amount: float
    category: str = "기타"
    items: List[ReceiptItemCreate] = []


class ReceiptUpdate(BaseModel):
    store_name: Optional[str] = None
    date: Optional[str] = None
    total_amount: Optional[float] = None
    category: Optional[str] = None
    items: Optional[List[ReceiptItemCreate]] = None


class ReceiptResponse(BaseModel):
    id: int
    store_name: str
    date: str
    total_amount: float
    category: Optional[str]
    image_path: Optional[str]
    created_at: datetime
    items: List[ReceiptItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ReceiptListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReceiptResponse]


class MonthlyTotal(BaseModel):
    month: str  # YYYY-MM
    total: float


class CategoryTotal(BaseModel):
    category: str
    total: float
    count: int


class DailyTotal(BaseModel):
    date: str  # YYYY-MM-DD
    total: float


class StatsResponse(BaseModel):
    monthly_totals: List[MonthlyTotal]
    category_totals: List[CategoryTotal]
    daily_totals: List[DailyTotal]
    period_total: float
    receipt_count: int


class ErrorDetail(BaseModel):
    code: str
    message: str


class CommonResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[ErrorDetail] = None
