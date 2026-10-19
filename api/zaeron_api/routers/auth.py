"""Endpoints de autenticação, cadastro qualificado e verificação OTP."""

import datetime
import logging
import secrets

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from api.zaeron_api.core.config import get_settings
from api.zaeron_api.core.errors import APIError
from api.zaeron_api.core.ratelimit import rate_limit
from api.zaeron_api.core.security import create_session_token, hash_password, verify_password
from api.zaeron_api.dependencies.auth import CurrentUser, SESSION_COOKIE_NAME
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.repositories.users import (
    DocumentAlreadyRegistered,
    EmailAlreadyRegistered,
    UserRepository,
)
from api.zaeron_api.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ConsentRequest,
    LoginRequest,
    RegisterRequest,
    RegisterStartRequest,
    RegisterStartResponse,
    ResendCodeRequest,
    VerifyCodeRequest,
)
from api.zaeron_api.schemas.common import MessageResponse
from api.zaeron_api.schemas.users import CurrentUserResponse, OfficeProfileRead, QuotaRead
from api.zaeron_api.services import mailer as mailer_service

logger = logging.getLogger("zaeron_api.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str, expires_at: datetime.datetime) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.session_ttl_minutes * 60,
        expires=expires_at,
        path="/api",
        secure=True,
        httponly=True,
        samesite="lax",
    )


async def _send_otp_email(email: str, code: str) -> bool:
    """Wrapper para disparo do e-mail transacional com o código OTP de 6 dígitos."""
    return await mailer_service.send_otp_email(email, code)


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    repository = UserRepository(db)
    user = repository.get_by_email(payload.email)
    password_is_valid = verify_password(
        payload.password,
        user.password_hash if user is not None else None,
    )
    if user is None or not user.is_active or not password_is_valid:
        raise APIError(401, "E-mail ou senha inválidos.", "invalid_credentials")

    session_token = create_session_token(user.id, user.password_hash)
    _set_session_cookie(response, session_token.token, session_token.expires_at)
    return AuthResponse(user=user, session_expires_at=session_token.expires_at)


@router.post(
    "/register-start",
    response_model=RegisterStartResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))],
)
async def register_start(
    payload: RegisterStartRequest,
    db: Session = Depends(get_db),
):
    if not payload.terms_accepted:
        raise APIError(
            400,
            "O aceite dos Termos de Uso e Política de Privacidade é obrigatório.",
            "consent_required",
        )
    repository = UserRepository(db)
    try:
        user = repository.create_or_update_unverified_user(
            name=payload.name,
            email=payload.email,
            password=payload.password,
            document_number=payload.document_number,
            postal_code=payload.postal_code,
            street=payload.street,
            neighborhood=payload.neighborhood,
            city=payload.city,
            state=payload.state,
            number=payload.number,
            complement=payload.complement,
            office_name=payload.office_name,
        )
    except DocumentAlreadyRegistered as exc:
        logger.warning("registration_conflict type=document")
        raise APIError(
            409,
            "Documento já cadastrado.",
            "document_already_registered",
        ) from exc
    except EmailAlreadyRegistered as exc:
        logger.warning("registration_conflict type=email")
        raise APIError(
            409,
            "Não foi possível concluir o cadastro com este e-mail.",
            "email_unavailable",
        ) from exc
    except Exception as exc:
        logger.error("registration_start_failed type=%s", type(exc).__name__)
        raise APIError(
            500,
            "Erro interno ao processar cadastro. Tente novamente mais tarde.",
            "registration_failed",
        ) from exc

    # Gera código OTP numérico de 6 dígitos
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    repository.save_otp_verification(
        email=payload.email,
        code_hash=hash_password(otp_code),
        expires_at=expires_at,
    )
    try:
        await mailer_service.send_otp_email(payload.email, otp_code)
    except Exception as exc:
        logger.error("otp_delivery_failed type=%s", type(exc).__name__)

    return RegisterStartResponse(
        message="Código de verificação enviado para seu e-mail.",
        email=payload.email,
    )


@router.post(
    "/verify-code",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def verify_code(
    payload: VerifyCodeRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    repository = UserRepository(db)
    verification = repository.get_latest_otp(payload.email)
    if verification is None:
        raise APIError(400, "Nenhum código de verificação pendente encontrado.", "code_not_found")

    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = verification.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)

    if now > expires_at:
        raise APIError(400, "Código de verificação expirado. Solicite um novo código.", "code_expired")

    if verification.attempts >= 5:
        raise APIError(429, "Limite de 5 tentativas excedido. Solicite um novo código.", "too_many_attempts")

    if not verify_password(payload.code, verification.code_hash):
        repository.increment_otp_attempts(verification)
        raise APIError(400, "Código de verificação incorreto.", "invalid_code")

    user = repository.verify_user(payload.email)
    if user is None:
        raise APIError(404, "Usuário não encontrado.", "user_not_found")

    repository.clear_otps(payload.email)
    session_token = create_session_token(user.id, user.password_hash)
    _set_session_cookie(response, session_token.token, session_token.expires_at)
    return AuthResponse(user=user, session_expires_at=session_token.expires_at)


@router.post(
    "/resend-code",
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))],
)
async def resend_code(
    payload: ResendCodeRequest,
    db: Session = Depends(get_db),
):
    repository = UserRepository(db)
    user = repository.get_by_email(payload.email)
    if user is None:
        raise APIError(404, "Usuário não encontrado.", "user_not_found")

    latest = repository.get_latest_otp(payload.email)
    if latest is not None:
        now = datetime.datetime.now(datetime.timezone.utc)
        created_at = latest.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=datetime.timezone.utc)
        elapsed_seconds = (now - created_at).total_seconds()
        if elapsed_seconds < 60:
            remaining = int(60 - elapsed_seconds)
            raise APIError(
                429,
                f"Aguarde {remaining} segundos antes de solicitar um novo código.",
                "resend_cooldown",
            )

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
    repository.save_otp_verification(
        email=payload.email,
        code_hash=hash_password(otp_code),
        expires_at=expires_at,
    )
    try:
        await mailer_service.send_otp_email(payload.email, otp_code)
    except Exception as exc:
        logger.error("otp_redelivery_failed type=%s", type(exc).__name__)

    return MessageResponse(message="Novo código de verificação enviado com sucesso.")


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    if not payload.terms_accepted:
        raise APIError(
            400,
            "O aceite dos Termos de Uso e Política de Privacidade é obrigatório.",
            "consent_required",
        )
    repository = UserRepository(db)
    try:
        user = repository.create_user_direct(
            name=payload.name,
            email=payload.email,
            password=payload.password,
            document_number=payload.document_number,
            office_name=payload.office_name,
        )
    except EmailAlreadyRegistered as exc:
        logger.warning("registration_conflict type=email")
        raise APIError(
            409,
            "Este e-mail já está cadastrado.",
            "email_already_registered",
        ) from exc
    except DocumentAlreadyRegistered as exc:
        logger.warning("registration_conflict type=document")
        raise APIError(
            409,
            "Este CPF/CNPJ já está cadastrado.",
            "document_already_registered",
        ) from exc
    except Exception as exc:
        logger.error("registration_failed type=%s", type(exc).__name__)
        raise APIError(
            500,
            "Erro interno ao processar cadastro. Tente novamente mais tarde.",
            "registration_failed",
        ) from exc

    session_token = create_session_token(user.id, user.password_hash)
    _set_session_cookie(response, session_token.token, session_token.expires_at)
    return AuthResponse(user=user, session_expires_at=session_token.expires_at)


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: CurrentUser, db: Session = Depends(get_db)):
    repository = UserRepository(db)
    user = repository.check_and_reset_usage(current_user.id) or current_user
    profile = repository.get_profile(user.id)
    usage = repository.get_monthly_usage(user.id)
    return CurrentUserResponse(
        user=user,
        profile=OfficeProfileRead.model_validate(profile) if profile else None,
        quotas=QuotaRead(
            monthly_processes=usage.processes,
            max_monthly_processes=None,
            monthly_transactions=usage.transactions,
            max_monthly_transactions=None,
            plan_tier="unlimited",
            monthly_usage_count=user.monthly_usage_count or 0,
            max_monthly_usages=None,
            usage_reset_at=user.usage_reset_at,
        ),
        onboarding_completed=bool(profile and profile.erp_system),
        terms_accepted=bool(user.terms_accepted_at),
    )


@router.post(
    "/consent",
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def record_consent(
    payload: ConsentRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    if not payload.terms_accepted or not payload.privacy_accepted:
        raise APIError(400, "O aceite dos termos e privacidade é obrigatório.", "consent_required")
    repository = UserRepository(db)
    user = repository.record_consent(current_user.id, payload.version)
    if not user:
        raise APIError(404, "Usuário não encontrado.", "user_not_found")
    return MessageResponse(message="Consentimento e aceite de termos registrados com sucesso.")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    repository = UserRepository(db)
    try:
        user = repository.change_password(
            user_id=current_user.id,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except ValueError as exc:
        raise APIError(400, str(exc), "invalid_password_change") from exc

    session_token = create_session_token(user.id, user.password_hash)
    _set_session_cookie(response, session_token.token, session_token.expires_at)

    return MessageResponse(message="Senha alterada com sucesso.")


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/api",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return MessageResponse(message="Sessão encerrada com sucesso.")
