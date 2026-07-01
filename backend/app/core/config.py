from typing import Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    JWT_SECRET: str
    GOOGLE_CLIENT_ID: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not (v.startswith("postgresql+asyncpg://") or v.startswith("postgres+asyncpg://")):
            raise ValueError(
                "DATABASE_URL must be a valid PostgreSQL async connection string "
                "starting with 'postgresql+asyncpg://' or 'postgres+asyncpg://'"
            )
        return v

    @model_validator(mode="after")
    def validate_api_keys(self) -> "Settings":
        if not self.OPENAI_API_KEY and not self.GOOGLE_API_KEY and not self.GEMINI_API_KEY:
            raise ValueError("At least one of OPENAI_API_KEY, GOOGLE_API_KEY or GEMINI_API_KEY must be provided")
        return self

settings = Settings()
