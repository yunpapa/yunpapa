from fastapi import APIRouter

router = APIRouter()

CATEGORIES = ["식료품", "외식", "쇼핑", "교통", "의료", "문화/여가", "통신", "기타"]


@router.get("/categories")
def get_categories():
    return {
        "success": True,
        "data": CATEGORIES,
        "message": "카테고리 목록 조회 완료",
    }
