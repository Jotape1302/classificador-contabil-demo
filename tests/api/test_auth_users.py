"""Autenticação, cadastro, sessão e perfil."""

import datetime

from api.zaeron_api.core.security import (
    create_session_token,
    verify_password,
)
from api.zaeron_api.models.users import OfficeProfile, UsageLog, User


def test_login_accepts_existing_legacy_bcrypt_hash(client, legacy_user):
    response = client.post(
        "/api/auth/login",
        json={"email": "LEGADA@ZAERON.TEST", "password": "senha-legada"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["id"] == legacy_user.id
    assert "password_hash" not in response.text
    cookie = response.headers["set-cookie"]
    assert "zaeron_session=" in cookie
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=lax" in cookie
    assert "Path=/api" in cookie


def test_login_failure_is_generic_for_unknown_email_and_wrong_password(
    client, legacy_user
):
    wrong_password = client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "errada"},
    )
    unknown_email = client.post(
        "/api/auth/login",
        json={"email": "inexistente@zaeron.test", "password": "errada"},
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {
        "detail": "E-mail ou senha inválidos.",
        "code": "invalid_credentials",
    }


def test_register_creates_user_and_office_profile_in_one_transaction(
    client, session_factory
):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Nova Contadora",
            "email": "nova@zaeron.test",
            "password": "senha-forte-12",
            "document_number": "529.982.247-25",
            "office_name": "Nova Contabilidade",
        },
    )

    assert response.status_code == 201
    assert "password_hash" not in response.text
    assert response.json()["user"]["is_verified"] is True
    assert response.json()["user"]["document_number"] == "52998224725"
    session = session_factory()
    try:
        user = session.query(User).filter_by(email="nova@zaeron.test").one()
        profile = (
            session.query(OfficeProfile)
            .filter_by(user_id=user.id)
            .one()
        )
        assert verify_password("senha-forte-12", user.password_hash)
        assert user.is_verified is True
        assert user.document_number == "52998224725"
        assert profile.erp_system == "Domínio Sistemas"
        assert profile.client_range == "1-20"
    finally:
        session.close()


def test_register_succeeds_without_office_name(client, session_factory):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Contador Sem Escritorio",
            "email": "solo@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "11.222.333/0001-81",
        },
    )

    assert response.status_code == 201
    assert response.json()["user"]["name"] == "Contador Sem Escritorio"
    assert response.json()["user"]["is_verified"] is True
    assert not response.json()["user"]["office_name"]


def test_register_rejects_password_shorter_than_twelve_characters(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Nome",
            "email": "curta@zaeron.test",
            "password": "12345",
            "document_number": "52998224725",
            "office_name": "Escritório",
        },
    )
    assert response.status_code == 422
    assert "12345" not in response.text


def test_register_rejects_invalid_document_number(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Nome Teste",
            "email": "invalido@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "11111111111",
        },
    )
    assert response.status_code == 422
    assert "CPF ou CNPJ inválido." in response.text


def test_register_prevents_duplicate_email_and_document(client):
    first = client.post(
        "/api/auth/register",
        json={
            "name": "Primeiro Usuário",
            "email": "duplicado@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "123.456.789-09",
        },
    )
    assert first.status_code == 201

    # Tentativa com mesmo e-mail e documento diferente
    duplicate_email = client.post(
        "/api/auth/register",
        json={
            "name": "Outro Usuário",
            "email": "duplicado@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "11.222.333/0001-81",
        },
    )
    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["code"] == "email_already_registered"
    assert "Este e-mail já está cadastrado." in duplicate_email.json()["detail"]

    # Tentativa com e-mail diferente e mesmo documento
    duplicate_doc = client.post(
        "/api/auth/register",
        json={
            "name": "Terceiro Usuário",
            "email": "terceiro@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "12345678909",
        },
    )
    assert duplicate_doc.status_code == 409
    assert duplicate_doc.json()["code"] == "document_already_registered"
    assert "Este CPF/CNPJ já está cadastrado." in duplicate_doc.json()["detail"]


def test_authenticated_me_returns_profile_quotas_and_onboarding_without_hash(
    client, legacy_user, session_factory
):
    session = session_factory()
    try:
        session.add(
            UsageLog(
                user_id=legacy_user.id,
                file_name="agosto.ofx",
                transactions_count=17,
            )
        )
        session.commit()
    finally:
        session.close()

    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["profile"]["erp_system"] == "Domínio Sistemas"
    assert payload["quotas"]["monthly_processes"] == 1
    assert payload["quotas"]["monthly_transactions"] == 17
    assert payload["onboarding_completed"] is True
    assert "password_hash" not in response.text


def test_expired_token_is_rejected(client, legacy_user):
    old_now = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)
    expired = create_session_token(legacy_user.id, legacy_user.password_hash, now=old_now)
    client.cookies.set(
        "zaeron_session",
        expired.token,
        path="/api",
    )

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_session"


def test_profile_patch_updates_only_current_office_data(client, legacy_user):
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )
    response = client.patch(
        "/api/users/me/profile",
        json={
            "office_name": "Escritório Atualizado",
            "erp_system": "Questor",
            "client_range": "51 a 100",
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["office_name"] == "Escritório Atualizado"
    assert response.json()["profile"]["erp_system"] == "Questor"
    assert response.json()["profile"]["client_range"] == "51 a 100"


def test_logout_invalidates_browser_cookie(client, legacy_user):
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )
    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"message": "Sessão encerrada com sucesso."}
    assert client.get("/api/auth/me").status_code == 401


def test_user_patch_updates_user_and_profile(client, legacy_user):
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )
    response = client.patch(
        "/api/users/me",
        json={
            "name": "Novo Nome Contador",
            "office_name": "Novo Escritório Contábil",
            "erp_system": "Omie",
            "client_range": "21-50",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["name"] == "Novo Nome Contador"
    assert payload["user"]["office_name"] == "Novo Escritório Contábil"
    assert payload["profile"]["erp_system"] == "Omie"
    assert payload["profile"]["client_range"] == "21-50"


def test_change_password_flow(client, legacy_user):
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )

    old_token = client.cookies.get("zaeron_session")

    # Erro de senha atual errada
    bad_response = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "senha-errada",
            "new_password": "nova-senha-segura-123",
            "confirm_password": "nova-senha-segura-123",
        },
    )
    assert bad_response.status_code == 400

    # Sucesso na troca de senha
    ok_response = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "senha-legada",
            "new_password": "nova-senha-segura-123",
            "confirm_password": "nova-senha-segura-123",
        },
    )
    assert ok_response.status_code == 200
    assert ok_response.json()["message"] == "Senha alterada com sucesso."
    new_token = client.cookies.get("zaeron_session")
    assert new_token and new_token != old_token
    client.cookies.set("zaeron_session", old_token, path="/api")
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set("zaeron_session", new_token, path="/api")

    # Login subsequente com a nova senha
    client.post("/api/auth/logout")
    login_new = client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "nova-senha-segura-123"},
    )
    assert login_new.status_code == 200

