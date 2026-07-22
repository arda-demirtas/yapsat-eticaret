from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings, loaded from environment variables and .env file."""
    PROJECT_NAME: str = "YapSat E-Commerce"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "yapsat"
    DATABASE_URL: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any, info: Any) -> Any:
        """Constructs the database connection string if not provided directly."""
        if isinstance(v, str) and v:
            return v
        
        # Access already validated attributes from validation info
        data = info.data
        user = data.get("POSTGRES_USER")
        password = data.get("POSTGRES_PASSWORD")
        server = data.get("POSTGRES_SERVER")
        db = data.get("POSTGRES_DB")
        return f"postgresql://{user}:{password}@{server}/{db}"

    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520  # 8 days

    REDIS_URL: str = "redis://localhost:6379/0"

    BACKEND_CORS_ORIGINS: list[str] = []
    BACKEND_HOST: str = "http://localhost:8000"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        """Parses CORS origins from a comma-separated string or a JSON array string."""
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Cloudinary Configs for Image Storage
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
