from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    upstage_api_key: str = ""
    upload_dir: str = "uploads"
    database_url: str = "sqlite:///./receipt.db"

    model_config = {"env_file": ".env"}


settings = Settings()
