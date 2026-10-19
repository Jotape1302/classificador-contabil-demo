"""Bcrypt legado e tokens JWT de sessão da API."""

import datetime
import hashlib
import hmac
import secrets
from dataclasses import dataclass

import bcrypt
import jwt

from api.zaeron_api.core.config import Settings, get_settings


class InvalidSessionToken(ValueError):
    """Token ausente, inválido, adulterado ou expirado."""


@dataclass(frozen=True)
class DecodedSession:
    user_id: int
    session_version: str


@dataclass(frozen=True)
class SessionToken:
    token: str
    expires_at: datetime.datetime


# Evita diferença grosseira de tempo entre e-mail inexistente e senha incorreta.
_DUMMY_HASH = bcrypt.hashpw(b"zaeron-dummy-password", bcrypt.gensalt(rounds=12))


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("A senha não pode ser vazia.")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode(
        "utf-8"
    )


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password:
        return False
    encoded_hash = password_hash.encode("utf-8") if password_hash else _DUMMY_HASH
    try:
        return bcrypt.checkpw(password.encode("utf-8"), encoded_hash)
    except (TypeError, ValueError):
        return False


def consume_dummy_password_check(password: str) -> None:
    """Executa Bcrypt mesmo quando a conta consultada não existe."""
    verify_password(password, None)


def session_version(
    password_hash: str, *, settings: Settings | None = None
) -> str:
    active_settings = settings or get_settings()
    return hmac.new(
        active_settings.jwt_secret.get_secret_value().encode("utf-8"),
        password_hash.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_session_token(
    user_id: int,
    password_hash: str,
    *,
    settings: Settings | None = None,
    now: datetime.datetime | None = None,
) -> SessionToken:
    active_settings = settings or get_settings()
    issued_at = now or datetime.datetime.now(datetime.timezone.utc)
    expires_at = issued_at + datetime.timedelta(
        minutes=active_settings.session_ttl_minutes
    )
    payload = {
        "sub": str(user_id),
        "type": "session",
        "iat": issued_at,
        "exp": expires_at,
        "jti": secrets.token_urlsafe(16),
        "sv": session_version(password_hash, settings=active_settings),
    }
    token = jwt.encode(
        payload,
        active_settings.jwt_secret.get_secret_value(),
        algorithm=active_settings.jwt_algorithm,
    )
    return SessionToken(token=token, expires_at=expires_at)


def decode_session_token(
    token: str,
    *,
    settings: Settings | None = None,
) -> DecodedSession:
    active_settings = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            active_settings.jwt_secret.get_secret_value(),
            algorithms=[active_settings.jwt_algorithm],
            options={"require": ["sub", "iat", "exp", "jti", "type", "sv"]},
        )
        if payload.get("type") != "session":
            raise InvalidSessionToken("tipo de token inválido")
        user_id = int(payload["sub"])
        if user_id <= 0:
            raise ValueError
        return DecodedSession(user_id=user_id, session_version=str(payload["sv"]))
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise InvalidSessionToken("sessão inválida ou expirada") from exc

