"""Validação da sessão JWT transportada exclusivamente por cookie."""

import secrets
from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from api.zaeron_api.models.users import User
from api.zaeron_api.core.database import set_rls_user_context
from api.zaeron_api.core.errors import APIError
from api.zaeron_api.core.security import (
    InvalidSessionToken,
    decode_session_token,
    session_version,
)
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.repositories.users import UserRepository


SESSION_COOKIE_NAME = "zaeron_session"


def get_current_user(
    session_cookie: Annotated[
        str | None,
        Cookie(alias=SESSION_COOKIE_NAME),
    ] = None,
    db: Session = Depends(get_db),
) -> User:
    if not session_cookie:
        raise APIError(401, "Sessão inválida ou expirada.", "invalid_session")
    try:
        decoded_session = decode_session_token(session_cookie)
    except InvalidSessionToken as exc:
        raise APIError(
            401, "Sessão inválida ou expirada.", "invalid_session"
        ) from exc

    user = UserRepository(db).get_by_id(decoded_session.user_id)
    if user is None or not user.is_active:
        raise APIError(401, "Sessão inválida ou expirada.", "invalid_session")
    if not secrets.compare_digest(
        decoded_session.session_version, session_version(user.password_hash)
    ):
        raise APIError(401, "Sessão inválida ou expirada.", "invalid_session")
    set_rls_user_context(db, user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
