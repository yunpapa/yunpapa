import json
import os
import uuid
from datetime import datetime
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.receipt import Receipt, ReceiptItem
from app.schemas.receipt import (
    ReceiptCreate,
    ReceiptListResponse,
    ReceiptResponse,
    ReceiptUpdate,
)
from app.services.ocr_service import analyze_receipt

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def _success(data, message: str = "처리 완료"):
    return {"success": True, "data": data, "message": message}


def _error(code: str, message: str):
    return {"success": False, "error": {"code": code, "message": message}}


# ─────────────────────────────────────────────
# POST /api/receipts/upload
# ─────────────────────────────────────────────
@router.post("/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 파일 확장자 검증
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return _error("INVALID_FILE_TYPE", f"허용되지 않는 파일 형식입니다. (허용: jpg, jpeg, png, pdf)")

    # MIME 타입 검증
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return _error("INVALID_FILE_TYPE", f"허용되지 않는 MIME 타입입니다: {file.content_type}")

    # 파일 내용 읽기
    contents = await file.read()

    # 파일 크기 검증
    if len(contents) > MAX_FILE_SIZE:
        return _error("FILE_TOO_LARGE", "파일 크기는 최대 10MB까지 허용됩니다.")

    # UUID 파일명으로 저장
    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    # OCR 분석
    try:
        ocr_result = await analyze_receipt(file_path, settings.upstage_api_key)
    except Exception as e:
        # OCR 실패 시 저장된 파일 삭제
        if os.path.exists(file_path):
            os.remove(file_path)
        return _error("OCR_FAILED", f"영수증 분석에 실패했습니다: {str(e)}")

    # OCR 결과 → DB 저장
    items_data = ocr_result.get("items", [])

    receipt = Receipt(
        store_name=ocr_result.get("store_name", "알 수 없음"),
        date=ocr_result.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
        total_amount=float(ocr_result.get("total", 0)),
        category=ocr_result.get("category", "기타"),
        image_path=file_path,
        raw_json=json.dumps(ocr_result, ensure_ascii=False),
        created_at=datetime.utcnow(),
    )
    db.add(receipt)
    db.flush()  # receipt.id 확보

    for item in items_data:
        qty = int(item.get("quantity", 1))
        price = float(item.get("price", 0))
        db_item = ReceiptItem(
            receipt_id=receipt.id,
            item_name=item.get("name", "알 수 없음"),
            quantity=qty,
            unit_price=price,
            total_price=price * qty,
        )
        db.add(db_item)

    db.commit()
    db.refresh(receipt)

    return _success(
        ReceiptResponse.model_validate(receipt).model_dump(mode="json"),
        "영수증 분석이 완료되었습니다.",
    )


# ─────────────────────────────────────────────
# GET /api/receipts
# ─────────────────────────────────────────────
@router.get("/receipts")
def list_receipts(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    store_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Receipt)

    if start_date:
        query = query.filter(Receipt.date >= start_date)
    if end_date:
        query = query.filter(Receipt.date <= end_date)
    if category:
        query = query.filter(Receipt.category == category)
    if store_name:
        query = query.filter(Receipt.store_name.contains(store_name))

    total = query.count()
    receipts = (
        query.order_by(Receipt.date.desc(), Receipt.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = [ReceiptResponse.model_validate(r).model_dump(mode="json") for r in receipts]
    data = ReceiptListResponse(total=total, page=page, size=size, items=items).model_dump(
        mode="json"
    )
    return _success(data, "조회 완료")


# ─────────────────────────────────────────────
# GET /api/receipts/{id}
# ─────────────────────────────────────────────
@router.get("/receipts/{receipt_id}")
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return _error("RECEIPT_NOT_FOUND", f"영수증 ID {receipt_id}를 찾을 수 없습니다.")

    return _success(
        ReceiptResponse.model_validate(receipt).model_dump(mode="json"), "조회 완료"
    )


# ─────────────────────────────────────────────
# PUT /api/receipts/{id}
# ─────────────────────────────────────────────
@router.put("/receipts/{receipt_id}")
def update_receipt(
    receipt_id: int, body: ReceiptUpdate, db: Session = Depends(get_db)
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return _error("RECEIPT_NOT_FOUND", f"영수증 ID {receipt_id}를 찾을 수 없습니다.")

    if body.store_name is not None:
        receipt.store_name = body.store_name
    if body.date is not None:
        receipt.date = body.date
    if body.total_amount is not None:
        receipt.total_amount = body.total_amount
    if body.category is not None:
        receipt.category = body.category

    # items 교체
    if body.items is not None:
        # 기존 items 삭제
        db.query(ReceiptItem).filter(ReceiptItem.receipt_id == receipt_id).delete()
        for item in body.items:
            db_item = ReceiptItem(
                receipt_id=receipt_id,
                item_name=item.item_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            db.add(db_item)

    db.commit()
    db.refresh(receipt)

    return _success(
        ReceiptResponse.model_validate(receipt).model_dump(mode="json"), "수정이 완료되었습니다."
    )


# ─────────────────────────────────────────────
# DELETE /api/receipts/{id}
# ─────────────────────────────────────────────
@router.delete("/receipts/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return _error("RECEIPT_NOT_FOUND", f"영수증 ID {receipt_id}를 찾을 수 없습니다.")

    # 이미지 파일 삭제
    if receipt.image_path and os.path.exists(receipt.image_path):
        os.remove(receipt.image_path)

    db.delete(receipt)  # cascade → receipt_items 자동 삭제
    db.commit()

    return _success(None, "삭제가 완료되었습니다.")
