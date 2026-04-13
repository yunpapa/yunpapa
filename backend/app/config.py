from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    upstage_api_key: str = ""
    upload_dir: str = "uploads"
    database_url: str = "sqlite:///./receipt.db"
    # 허용 오리진: 쉼표 구분 문자열 → 리스트로 파싱
    # 예) ALLOWED_ORIGINS=https://my-app.vercel.app,https://my-app-git-main.vercel.app
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env"}


settings = Settings()
