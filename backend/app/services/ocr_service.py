import base64
import json
import re
from pathlib import Path
from langchain_upstage import ChatUpstage
from langchain_core.messages import HumanMessage

SYSTEM_PROMPT = """당신은 영수증 OCR 전문가입니다. 이미지에서 영수증 정보를 추출하여 반드시 아래 JSON 형식으로만 응답하세요.

{
  "date": "YYYY-MM-DD",
  "store_name": "상호명",
  "items": [
    {"name": "상품명", "quantity": 1, "price": 0}
  ],
  "total": 0,
  "category": "카테고리"
}

카테고리는 식료품/외식/쇼핑/교통/의료/문화/여가/통신/기타 중 하나.
날짜를 파악할 수 없으면 오늘 날짜를 사용하세요.
금액은 숫자만 (쉼표, 원 기호 제외).
JSON 외 다른 텍스트는 절대 출력하지 마세요."""


async def analyze_receipt(image_path: str, api_key: str) -> dict:
    """영수증 이미지를 분석하여 구조화된 JSON 반환"""
    path = Path(image_path)

    # 파일을 base64로 인코딩
    with open(path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    # MIME 타입 결정
    suffix = path.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
    }
    mime_type = mime_map.get(suffix, "image/jpeg")

    llm = ChatUpstage(api_key=api_key, model="solar-pro")

    message = HumanMessage(
        content=[
            {"type": "text", "text": SYSTEM_PROMPT},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{image_data}"},
            },
        ]
    )

    response = await llm.ainvoke([message])
    content = response.content.strip()

    # JSON 추출 (```json ... ``` 블록 처리)
    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())
    raise ValueError(f"OCR 응답에서 JSON을 파싱할 수 없습니다: {content}")
