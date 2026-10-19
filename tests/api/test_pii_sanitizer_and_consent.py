"""Testes de conformidade LGPD, sanitização de PII e persistência de consentimento."""

from api.zaeron_api.core.sanitizer import sanitize_accounting_text
from api.zaeron_api.core.sanitizer import sanitize_accounting_text as api_sanitize
from api.zaeron_api.models.users import User


# ==============================================================================
# 1. TESTES DE SANITIZAÇÃO DE DADOS PESSOAIS SENSÍVEIS (PII / LGPD)
# ==============================================================================

def test_sanitizer_masks_cpfs():
    # CPFs formatados
    assert sanitize_accounting_text("PIX TRANSF JOAO DA SILVA 123.456.789-00") == "PIX TRANSF JOAO DA SILVA [CPF_PROTEGIDO]"
    assert sanitize_accounting_text("TRANSF 123.456.789.00 CONTABIL") == "TRANSF [CPF_PROTEGIDO] CONTABIL"
    assert sanitize_accounting_text("DOC 123.456.789/00 HONORARIOS") == "DOC [CPF_PROTEGIDO] HONORARIOS"

    # CPFs rotulados
    assert sanitize_accounting_text("PAGTO CPF: 12345678900 JOSE") == "PAGTO CPF [CPF_PROTEGIDO] JOSE"
    assert sanitize_accounting_text("DOC: 123.456.789-00 REEMBOLSO") == "DOC [CPF_PROTEGIDO] REEMBOLSO"
    assert sanitize_accounting_text("DOCUMENTO 12345678900 CLIENTE") == "DOCUMENTO [CPF_PROTEGIDO] CLIENTE"

    # CPFs soltos com 11 dígitos
    assert sanitize_accounting_text("PIX RECEBIDO 12345678901 MERCADO") == "PIX RECEBIDO [CPF_PROTEGIDO] MERCADO"


def test_sanitizer_masks_emails():
    assert sanitize_accounting_text("PIX CHAVE EMAIL: usuario@empresa.com.br") == "PIX CHAVE EMAIL: [EMAIL_PROTEGIDO]"
    assert sanitize_accounting_text("CONTATO joao.silva+financeiro@dominio.com NF 123") == "CONTATO [EMAIL_PROTEGIDO] NF 123"
    assert sanitize_accounting_text("RECEBIMENTO contato@sub.empresa.com.br") == "RECEBIMENTO [EMAIL_PROTEGIDO]"


def test_sanitizer_masks_phone_numbers():
    # Telefones formatados com DDD
    assert sanitize_accounting_text("PIX TRANSF (11) 98765-4321 LOJA") == "PIX TRANSF [TEL_PROTEGIDO] LOJA"
    assert sanitize_accounting_text("CONTATO 11 98765-4321 FORNECEDOR") == "CONTATO [TEL_PROTEGIDO] FORNECEDOR"
    assert sanitize_accounting_text("PIX +55 11 99888-7766 RESTAURANTE") == "PIX [TEL_PROTEGIDO] RESTAURANTE"
    assert sanitize_accounting_text("WHATSAPP (11)987654321 ATENDIMENTO") == "WHATSAPP [TEL_PROTEGIDO] ATENDIMENTO"
    assert sanitize_accounting_text("TEL FIXO (11) 3344-5566 ESCRITORIO") == "TEL FIXO [TEL_PROTEGIDO] ESCRITORIO"

    # Telefones rotulados
    assert sanitize_accounting_text("TEL: 11987654321 SUPORTE") == "TEL [TEL_PROTEGIDO] SUPORTE"
    assert sanitize_accounting_text("WHATSAPP: +55 11 99999-9999") == "WHATSAPP [TEL_PROTEGIDO]"
    assert sanitize_accounting_text("CELULAR: (21) 98888-7777 VENDEDOR") == "CELULAR [TEL_PROTEGIDO] VENDEDOR"


def test_sanitizer_masks_pix_keys():
    # UUID / EVP
    assert sanitize_accounting_text("PIX ENVIADO CHAVE 123e4567-e89b-12d3-a456-426614174000") == "PIX ENVIADO CHAVE [CHAVE_PIX_PROTEGIDA]"
    assert sanitize_accounting_text("CHAVE PIX: 123e4567-e89b-12d3-a456-426614174000") == "CHAVE PIX: [CHAVE_PIX_PROTEGIDA]"

    # Chaves rotuladas
    assert sanitize_accounting_text("CHAVE ALEATORIA: 123e4567-e89b-12d3-a456-426614174000") == "CHAVE ALEATORIA: [CHAVE_PIX_PROTEGIDA]"
    assert sanitize_accounting_text("PIX CELULAR: 11987654321 COMPRA") == "PIX CELULAR [TEL_PROTEGIDO] COMPRA"


def test_sanitizer_preserves_accounting_essentials():
    # Preservação de CNPJs (Pessoa Jurídica não é PII individual)
    assert sanitize_accounting_text("POSTO DE GASOLINA LTDA CNPJ 12.345.678/0001-90") == "POSTO DE GASOLINA LTDA CNPJ 12.345.678/0001-90"

    # Preservação de Datas
    assert sanitize_accounting_text("PAGTO ELETRON COBRANCA 28/08/2026 VALOR 1.250,50") == "PAGTO ELETRON COBRANCA 28/08/2026 VALOR 1.250,50"
    assert sanitize_accounting_text("TED 2026-08-28 REF AGOSTO/2026") == "TED 2026-08-28 REF AGOSTO/2026"
    assert sanitize_accounting_text("LANCAMENTO EM 28-08-2026") == "LANCAMENTO EM 28-08-2026"

    # Preservação de Valores Monetários
    assert sanitize_accounting_text("DEBITO R$ 1.250,50 TARIFA BANCARIA") == "DEBITO R$ 1.250,50 TARIFA BANCARIA"
    assert sanitize_accounting_text("CREDITO 450,00 TRANSFERENCIA") == "CREDITO 450,00 TRANSFERENCIA"
    assert sanitize_accounting_text("VALOR -120.00 REVERSAO") == "VALOR -120.00 REVERSAO"

    # Preservação de Contas e Agências
    assert sanitize_accounting_text("TED BANCO DO BRASIL AG 1234 CC 56789-0") == "TED BANCO DO BRASIL AG 1234 CC 56789-0"

    # Tratamento de entradas nulas e vazias
    assert sanitize_accounting_text(None) == ""
    assert sanitize_accounting_text("") == ""
    assert sanitize_accounting_text("   ") == ""

    # Re-export na camada zaeron_api
    assert api_sanitize("CPF: 123.456.789-00") == "CPF [CPF_PROTEGIDO]"


# ==============================================================================
# 2. TESTES DE CONSENTIMENTO LGPD (TERMS & PRIVACY POLICY)
# ==============================================================================

def test_register_persists_consent_timestamps_and_version(client, session_factory):
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "Contador Consentimento",
            "email": "consentimento@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "529.982.247-25",
            "terms_accepted": True,
        },
    )
    assert resp.status_code == 201
    user_data = resp.json()["user"]
    assert user_data["terms_accepted_at"] is not None
    assert user_data["privacy_accepted_at"] is not None
    assert user_data["terms_version"] == "1.0"

    session = session_factory()
    try:
        user = session.query(User).filter_by(email="consentimento@zaeron.test").one()
        assert user.terms_accepted_at is not None
        assert user.privacy_accepted_at is not None
        assert user.terms_version == "1.0"
    finally:
        session.close()


def test_register_rejects_without_terms_acceptance(client):
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "Contador Sem Termo",
            "email": "semtermo@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "529.982.247-25",
            "terms_accepted": False,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "consent_required"


def test_register_start_rejects_without_terms_acceptance(client):
    resp = client.post(
        "/api/auth/register-start",
        json={
            "name": "Contador Qualificado Sem Termo",
            "email": "qualificado_semtermo@zaeron.test",
            "password": "senha-segura-123",
            "document_number": "529.982.247-25",
            "postal_code": "01310-100",
            "street": "Avenida Paulista",
            "neighborhood": "Bela Vista",
            "city": "São Paulo",
            "state": "SP",
            "number": "100",
            "terms_accepted": False,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "consent_required"


def test_consent_endpoint_updates_terms_version(client, legacy_user, session_factory):
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )

    # 1. Registra novo consentimento para versão 2.0
    resp = client.post(
        "/api/auth/consent",
        json={
            "terms_accepted": True,
            "privacy_accepted": True,
            "version": "2.0",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Consentimento e aceite de termos registrados com sucesso."

    # 2. Verifica no endpoint /api/auth/me
    me_resp = client.get("/api/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["terms_accepted"] is True
    assert me_resp.json()["user"]["terms_version"] == "2.0"

    # 3. Rejeita se termos ou privacidade forem falsos
    bad_resp = client.post(
        "/api/auth/consent",
        json={
            "terms_accepted": False,
            "privacy_accepted": True,
            "version": "2.0",
        },
    )
    assert bad_resp.status_code == 400
    assert bad_resp.json()["code"] == "consent_required"
