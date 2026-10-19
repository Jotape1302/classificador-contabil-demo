"""Configuração tipada da API a partir do ambiente."""

import os
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_DB_HOST = "db" if os.path.exists("/.dockerenv") else "localhost"
DEFAULT_DB_URL = f"postgresql://{DEFAULT_DB_HOST}:5432/zaeron_production"
_DEVELOPMENT_SECRET = "development-only-change-this-jwt-secret"


class Settings(BaseSettings):
    """Contrato canônico das variáveis consumidas pela nova API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(default="Zaeron API", validation_alias="ZAERON_APP_NAME")
    environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="ZAERON_ENVIRONMENT",
    )
    database_url: str = Field(default=DEFAULT_DB_URL, validation_alias="DATABASE_URL")
    jwt_secret: SecretStr = Field(
        default=SecretStr(_DEVELOPMENT_SECRET),
        validation_alias="ZAERON_JWT_SECRET",
    )
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = Field(
        default="HS256",
        validation_alias="ZAERON_JWT_ALGORITHM",
    )
    session_ttl_minutes: int = Field(
        default=480,
        ge=1,
        le=43_200,
        validation_alias="ZAERON_SESSION_TTL_MINUTES",
    )
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        validation_alias="ZAERON_CORS_ORIGINS",
    )
    allowed_hosts: str = Field(
        default="localhost,127.0.0.1,testserver",
        validation_alias="ZAERON_ALLOWED_HOSTS",
    )
    max_free_processes: int = Field(
        default=5,
        ge=1,
        validation_alias="MAX_FREE_PROCESSES",
    )
    max_free_transactions: int = Field(
        default=100,
        ge=1,
        validation_alias="MAX_FREE_TRANSACTIONS",
    )
    log_level: str = Field(default="INFO", validation_alias="ZAERON_LOG_LEVEL")
    rate_limit_enabled: bool = Field(
        default=True,
        validation_alias="ZAERON_RATE_LIMIT_ENABLED",
    )
    # E-mail transacional (Resend & SMTP)
    resend_api_key: str | None = Field(
        default=None,
        validation_alias="RESEND_API_KEY",
    )
    smtp_host: str | None = Field(
        default=None,
        validation_alias="SMTP_HOST",
    )
    smtp_port: int = Field(
        default=587,
        validation_alias="SMTP_PORT",
    )
    smtp_user: str | None = Field(
        default=None,
        validation_alias="SMTP_USER",
    )
    smtp_password: str | None = Field(
        default=None,
        validation_alias="SMTP_PASSWORD",
    )
    smtp_from_email: str = Field(
        default="suporte@zaeron.example",
        validation_alias="SMTP_FROM_EMAIL",
    )
    smtp_from_name: str = Field(
        default="Zaeron Contábil",
        validation_alias="SMTP_FROM_NAME",
    )
    smtp_use_tls: bool = Field(
        default=True,
        validation_alias="SMTP_USE_TLS",
    )

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        value = value.strip()
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql://", 1)
        # Fora do Docker: se a URL apontar para "@db:", redireciona para "@127.0.0.1:"
        if not os.path.exists("/.dockerenv") and "@db:" in value:
            value = value.replace("@db:", "@127.0.0.1:")
        # Dentro do Docker: se a URL apontar para localhost/127.0.0.1, redireciona para "@db:"
        elif os.path.exists("/.dockerenv"):
            if "@localhost:" in value:
                value = value.replace("@localhost:", "@db:")
            elif "@127.0.0.1:" in value:
                value = value.replace("@127.0.0.1:", "@db:")
        return value

    @field_validator("cors_origins", "allowed_hosts")
    @classmethod
    def reject_wildcards(cls, value: str) -> str:
        values = [item.strip() for item in value.split(",") if item.strip()]
        if not values or "*" in values:
            raise ValueError("wildcards não são permitidos nesta configuração")
        return ",".join(values)

    @model_validator(mode="after")
    def require_production_secret(self) -> "Settings":
        secret = self.jwt_secret.get_secret_value()
        if len(secret) < 32:
            raise ValueError("ZAERON_JWT_SECRET deve ter ao menos 32 caracteres")
        if self.environment == "production" and secret == _DEVELOPMENT_SECRET:
            raise ValueError("ZAERON_JWT_SECRET deve ser definido em produção")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return self.cors_origins.split(",")

    @property
    def allowed_host_list(self) -> list[str]:
        return self.allowed_hosts.split(",")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

