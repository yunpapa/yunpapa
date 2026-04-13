import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# ── 테스트 전용 인메모리 DB ──────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite://"  # in-memory

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """각 테스트 전 테이블 초기화"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


# ── 테스트 케이스 ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_categories():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/categories")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    categories = body["data"]
    assert isinstance(categories, list)
    assert len(categories) == 8
    assert "식료품" in categories
    assert "기타" in categories


@pytest.mark.asyncio
async def test_get_receipts_empty():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/receipts")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["items"] == []
    assert body["data"]["total"] == 0


@pytest.mark.asyncio
async def test_get_receipt_not_found():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/receipts/9999")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RECEIPT_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_stats_summary():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/stats/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "monthly_totals" in data
    assert "category_totals" in data
    assert "daily_totals" in data
    assert "period_total" in data
    assert "receipt_count" in data
    assert data["receipt_count"] == 0
    assert data["period_total"] == 0
