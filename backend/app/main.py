import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.models.receipt import Receipt, ReceiptItem  # noqa: F401 — 테이블 생성 트리거
from app.routers import categories, receipts, stats

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI 영수증 지출 관리 시스템",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# uploads 디렉토리 정적 파일 서빙
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# 라우터 등록
app.include_router(receipts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(categories.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "AI 영수증 지출 관리 시스템 API"}
