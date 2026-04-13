# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 현황

이 저장소는 현재 **기획 단계**입니다. 코드는 아직 없으며, 아래 두 문서가 개발의 기준이 됩니다.

- `PRD_AI_영수증_지출관리.md` — 기능 요구사항, API 명세, DB 스키마, 화면 요구사항, 개발 일정
- `개요서_AI_영수증_지출관리.md` — 시스템 아키텍처, 기술 스택, 데이터 흐름

---

## 계획된 아키텍처

```
React (Vite)  ──Axios──▶  FastAPI  ──▶  LangChain + Upstage Vision LLM
                               │
                           SQLite (SQLAlchemy)
```

- **프론트엔드**: `frontend/` — React 18 + Vite 5 + TailwindCSS + Recharts + lucide-react
- **백엔드**: `backend/app/` — FastAPI 0.110+ + SQLAlchemy 2.0 + Pydantic
- **OCR 서비스**: `backend/app/services/ocr_service.py` — LangChain Upstage를 통해 영수증 이미지를 JSON으로 변환
- **DB**: SQLite 단일 파일 (`backend/receipt.db`), 테이블 2개 (`receipts`, `receipt_items`)

백엔드 레이어 순서: `routers/` → `services/` → `models/`

---

## 계획된 실행 명령어

코드 생성 후 사용할 명령어입니다.

```bash
# 백엔드
cd backend && uvicorn app.main:app --reload --port 8000
# API 문서: http://localhost:8000/docs

# 프론트엔드
cd frontend && npm run dev
# 기본 포트: http://localhost:5173

# 백엔드 테스트
cd backend && pytest tests/
```

---

## 환경 변수

| 파일 | 변수 | 설명 |
|------|------|------|
| `backend/.env` | `UPSTAGE_API_KEY` | Upstage Vision LLM 인증 키 |
| `backend/.env` | `UPLOAD_DIR` | 업로드 파일 저장 경로 (기본: `uploads`) |
| `frontend/.env` | `VITE_API_BASE_URL` | 백엔드 URL (기본: `http://localhost:8000`) |

---

## 핵심 설계 결정 사항

PRD에서 확정된 내용으로, 임의로 변경하지 않는다.

**API 응답 형식** — 모든 엔드포인트는 아래 형식을 따른다.
```json
{ "success": true,  "data": {},    "message": "처리 완료" }
{ "success": false, "error": { "code": "OCR_FAILED", "message": "..." } }
```

**파일 업로드** — `jpg`, `jpeg`, `png`, `pdf`만 허용. MIME 타입 + 확장자 이중 검증. 최대 10MB.

**영수증 삭제** — `receipts` 삭제 시 `receipt_items`를 CASCADE 삭제한다.

**이미지 저장** — `uploads/` 디렉토리에 UUID 파일명으로 저장. `git`에서 제외.

**검색 디바운스** — 상호명 검색은 300ms 디바운스 후 자동 실행.

**카테고리 기본값** — `식료품`, `외식`, `쇼핑`, `교통`, `의료`, `문화/여가`, `통신`, `기타`

---

## MVP 범위 외

아래 항목은 구현하지 않는다. 요청받더라도 MVP 이후로 미룬다.

- 사용자 인증/로그인 (단일 사용자 전제)
- 다국어 지원 (한국어 전용)
- 데이터 내보내기 (Excel/CSV)
- 예산 설정 및 알림
- OCR 실패 시 수동 입력 폴백 UI
