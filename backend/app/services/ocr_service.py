import json
import re
from datetime import date
from pathlib import Path

from langchain_upstage import ChatUpstage, UpstageDocumentParseLoader
from langchain_core.messages import HumanMessage, SystemMessage

EXTRACT_PROMPT = """아래는 영수증에서 추출한 텍스트입니다.
이 텍스트를 분석하여 반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트는 절대 출력하지 마세요.

{
  "date": "YYYY-MM-DD",
  "store_name": "상호명",
  "items": [
    {"name": "상품명", "quantity": 1, "price": 0}
  ],
  "total": 0,
  "category": "카테고리"
}

규칙:
- 날짜: YYYY-MM-DD 형식. 파악 불가 시 오늘 날짜 사용.
- 금액: 숫자만 (쉼표, 원 기호 제외).
- category: 식료품 / 외식 / 쇼핑 / 교통 / 의료 / 문화/여가 / 통신 / 기타 중 하나.
- 상품 항목이 없으면 items는 빈 배열 [].

영수증 텍스트:
"""


async def analyze_receipt(image_path: str, api_key: str) -> dict:
    """
    1단계: UpstageDocumentParseLoader로 영수증 이미지에서 텍스트 추출
    2단계: ChatUpstage(solar-pro)로 텍스트를 구조화된 JSON으로 변환
    """
    path = Path(image_path)
    today = date.today().isoformat()

    # ── 1단계: Document Parse ────────────────────────────────────────
    loader = UpstageDocumentParseLoader(
        file_path=str(path),
        api_key=api_key,
        split="none",
        output_format="text",
    )
    # load()는 동기 함수 — executor로 감싸지 않고 직접 호출
    docs = loader.load()
    extracted_text = "\n".join(doc.page_content for doc in docs).strip()

    if not extracted_text:
        extracted_text = "(텍스트 추출 실패 — 영수증 정보를 최대한 추정하세요)"

    # ── 2단계: ChatUpstage로 JSON 구조화 ────────────────────────────
    llm = ChatUpstage(api_key=api_key, model="solar-pro")

    messages = [
        SystemMessage(content=f"오늘 날짜는 {today}입니다."),
        HumanMessage(content=EXTRACT_PROMPT + extracted_text),
    ]

    response = await llm.ainvoke(messages)
    content = response.content.strip()

    # JSON 블록 추출 (```json ... ``` 포함 처리)
    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    raise ValueError(f"OCR 응답에서 JSON을 파싱할 수 없습니다: {content}")
