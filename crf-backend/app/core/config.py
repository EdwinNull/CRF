"""
配置管理 - 从环境变量读取配置
"""
from typing import Annotated, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    # 应用配置
    PROJECT_NAME: str = "荆防临床研究 CRF 系统"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # 数据库配置
    DATABASE_URL: str = "postgresql://crf_user:crf_pass@localhost:5432/crf_db"

    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8小时

    # CORS 配置（支持逗号分隔的字符串或JSON数组）。
    # NoDecode 阻止 pydantic-settings 在 validator 之前按 JSON 强制解析此字段，
    # 否则 "http://a,http://b" 会被当作 json.loads 输入而抛 JSONDecodeError。
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str] | Any:
        """解析 CORS origins - 支持逗号分隔字符串或列表"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]


settings = Settings()
