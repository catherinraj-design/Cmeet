from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "School ERP - Video Conferencing Module (Cmeet)"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./cmeet.db"
    ASYNC_DATABASE_URL: str | None = None
    
    # Security / Auth (ERP JWT)
    SECRET_KEY: str = "school-erp-super-secret-key-change-in-production-32bytes-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # LiveKit Cloud / Server Configuration
    LIVEKIT_URL: str = "https://cmeet-test.livekit.cloud"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "cmeet_dev_livekit_secret_key_minimum_32_characters"
    LIVEKIT_TOKEN_TTL_MINUTES: int = 60
    LIVEKIT_WEBHOOK_SECRET: str = "cmeet_dev_livekit_secret_key_minimum_32_characters"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("DATABASE_URL")
    def assemble_db_connection(cls, v: str) -> str:
        # Normalize postgresql:// to postgresql+asyncpg:// if needed for async sqlalchemy
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
