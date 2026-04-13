# Vercel Serverless 진입점
# Vercel Python Runtime은 이 파일의 `app` 변수를 ASGI 핸들러로 사용합니다.
import sys
import os

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: F401 — Vercel이 `app` 객체를 직접 참조
