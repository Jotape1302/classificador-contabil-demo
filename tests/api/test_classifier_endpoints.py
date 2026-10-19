"""Integração HTTP de lotes, conciliação, regras e exportação."""

import pytest

from api.zaeron_api.models.users import UsageLog
from tests.api.test_classifier_adapters import OFX_BYTES


def _login(client, user):
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "senha-legada"},
    )
    assert response.status_code == 200


def _upload(client, content=OFX_BYTES, filename="extrato.ofx"):
    return client.post(
        "/api/classifier/upload",
        files={"file": (filename, content, "application/octet-stream")},
    )


def test_upload_process_get_are_idempotent_and_log_usage_once(
    client, legacy_user, session_factory
):
    _login(client, legacy_user)
    uploaded = _upload(client)
    assert uploaded.status_code == 201
    batch_id = uploaded.json()["id"]
    assert uploaded.json()["status"] == "uploaded"
    assert uploaded.json()["total_transactions"] == 2

    first = client.post("/api/classifier/process", json={"batch_id": batch_id})
    second = client.post("/api/classifier/process", json={"batch_id": batch_id})
    fetched = client.get(f"/api/classifier/batches/{batch_id}")

    assert first.status_code == second.status_code == fetched.status_code == 200
    assert first.json()["status"] == "processed"
    assert second.json()["version"] == first.json()["version"]
    assert first.json()["transactions"][0]["category"] == "Energia Elétrica"
    assert first.json()["transactions"][1]["category"] == "Despesas Bancárias"
    session = session_factory()
    try:
        logs = session.query(UsageLog).filter_by(user_id=legacy_user.id).all()
        assert len(logs) == 1
        assert logs[0].transactions_count == 2
    finally:
        session.close()


def test_reupload_returns_same_batch_and_new_file_detects_processed_duplicates(
    client, legacy_user
):
    _login(client, legacy_user)
    first = _upload(client)
    client.post("/api/classifier/process", json={"batch_id": first.json()["id"]})
    same = _upload(client)
    changed_bytes = OFX_BYTES.replace(b"FITID>1", b"FITID>01")
    duplicate_batch = _upload(client, changed_bytes, "extrato_reemitido.ofx")

    assert same.json()["id"] == first.json()["id"]
    assert duplicate_batch.json()["id"] != first.json()["id"]
    assert duplicate_batch.json()["duplicate_transactions"] == 2


def test_inline_edit_uses_optimistic_versions(client, legacy_user):
    _login(client, legacy_user)
    batch = _upload(client).json()
    batch = client.post("/api/classifier/process", json={"batch_id": batch["id"]}).json()
    transaction = batch["transactions"][0]
    payload = {
        "batch_version": batch["version"],
        "transactions": [
            {
                "id": transaction["id"],
                "version": transaction["version"],
                "category": "Serviços de Terceiros",
                "history_code": "42",
            }
        ],
    }
    updated = client.patch(
        f"/api/classifier/batches/{batch['id']}/transactions", json=payload
    )
    stale = client.patch(
        f"/api/classifier/batches/{batch['id']}/transactions", json=payload
    )

    assert updated.status_code == 200
    edited = updated.json()["transactions"][0]
    assert edited["category"] == "Serviços de Terceiros"
    assert edited["history_code"] == "42"
    assert edited["accounting_history"] != "42"
    assert edited["classification_source"] == "Edição manual"
    assert stale.status_code == 409
    assert stale.json()["code"] == "optimistic_lock_conflict"


def test_rules_crud_is_scoped_to_current_user(client, legacy_user):
    _login(client, legacy_user)
    created = client.post(
        "/api/classifier/rules",
        json={
            "search_term": "Fornecedor Especial",
            "category": "Serviços de Terceiros",
            "debit_account": "3.1.1",
            "credit_account": "1.1.1",
            "history_code": "18",
        },
    )
    listed = client.get("/api/classifier/rules")
    deleted = client.delete(
        "/api/classifier/rules", params={"rule_id": created.json()["id"]}
    )
    listed_after = client.get("/api/classifier/rules")

    assert created.status_code == 201
    assert listed.status_code == 200
    assert len(listed.json()["rules"]) == 1
    assert deleted.status_code == 200
    assert listed_after.json() == {"rules": []}


@pytest.mark.parametrize(
    ("export_format", "extension"),
    [
        ("dominio", "txt"),
        ("questor", "txt"),
        ("omie", "csv"),
        ("fortes", "csv"),
        ("xlsx", "xlsx"),
        ("excel", "xlsx"),
        ("pdf", "pdf"),
        ("csv", "csv"),
        ("html", "html"),
    ],
)
def test_export_streams_every_supported_format(
    client, legacy_user, export_format, extension
):
    _login(client, legacy_user)
    batch = _upload(client).json()
    client.post("/api/classifier/process", json={"batch_id": batch["id"]})
    response = client.post(
        "/api/classifier/export",
        json={"batch_id": batch["id"], "format": export_format},
    )

    assert response.status_code == 200
    assert response.content
    assert f".{extension}" in response.headers["content-disposition"]


def test_classifier_batches_are_private(client, legacy_user):
    _login(client, legacy_user)
    batch_id = _upload(client).json()["id"]
    client.post("/api/auth/logout")
    assert client.get(f"/api/classifier/batches/{batch_id}").status_code == 401


def test_upload_rejects_unsupported_file(client, legacy_user):
    _login(client, legacy_user)
    response = _upload(client, b"data", "extrato.exe")
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_statement"


def test_cross_tenant_batch_metrics_exports_and_edits_are_denied(
    client, legacy_user, session_factory
):
    from api.zaeron_api.core.security import hash_password
    from api.zaeron_api.models.users import User

    _login(client, legacy_user)
    batch = _upload(client).json()
    batch = client.post("/api/classifier/process", json={"batch_id": batch["id"]}).json()
    transaction = batch["transactions"][0]
    rule = client.post(
        "/api/classifier/rules",
        json={"search_term": "TENANT A", "category": "Honorários"},
    ).json()

    session = session_factory()
    try:
        other = User(
            name="Usuário B",
            email="tenant-b@zaeron.test",
            password_hash=hash_password("senha-tenant-b-123"),
            document_number="83584852020",
            is_verified=True,
            is_active=True,
        )
        session.add(other)
        session.commit()
    finally:
        session.close()

    client.post("/api/auth/logout", json={})
    assert client.post(
        "/api/auth/login",
        json={"email": "tenant-b@zaeron.test", "password": "senha-tenant-b-123"},
    ).status_code == 200

    batch_id = batch["id"]
    assert client.get(f"/api/classifier/batches/{batch_id}").status_code == 404
    assert client.post("/api/classifier/process", json={"batch_id": batch_id}).status_code == 404
    assert client.get(f"/api/metrics/batches/{batch_id}").status_code == 404
    assert client.post(
        "/api/classifier/export", json={"batch_id": batch_id, "format": "xlsx"}
    ).status_code == 404
    assert client.patch(
        f"/api/classifier/batches/{batch_id}/transactions",
        json={
            "batch_version": batch["version"],
            "transactions": [
                {
                    "id": transaction["id"],
                    "version": transaction["version"],
                    "category": "Tentativa B",
                }
            ],
        },
    ).status_code == 404
    assert client.delete(
        "/api/classifier/rules", params={"rule_id": rule["id"]}
    ).status_code == 404
    # Tenant B list_batches returns 0 batches
    history_b = client.get("/api/classifier/batches")
    assert history_b.status_code == 200
    assert history_b.json()["total"] == 0
    assert len(history_b.json()["batches"]) == 0


def test_list_batches_returns_user_batches_with_metrics(client, legacy_user):
    _login(client, legacy_user)
    uploaded = _upload(client)
    batch_id = uploaded.json()["id"]
    client.post("/api/classifier/process", json={"batch_id": batch_id})

    response = client.get("/api/classifier/batches")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    item = next(b for b in data["batches"] if b["id"] == batch_id)
    assert item["source_filename"] == "extrato.ofx"
    assert item["status"] == "processed"
    assert item["total_transactions"] == 2
    assert item["average_confidence"] > 0
    assert item["hours_saved"] > 0
    assert item["financial_saved"] > 0
    assert "top_categories" in item


def test_html_export_has_zero_debit_credit(client, legacy_user):
    _login(client, legacy_user)
    uploaded = _upload(client)
    batch_id = uploaded.json()["id"]
    client.post("/api/classifier/process", json={"batch_id": batch_id})

    export_res = client.post(
        "/api/classifier/export",
        json={"batch_id": batch_id, "format": "html"},
    )
    assert export_res.status_code == 200
    content = export_res.content.decode("utf-8")
    assert "Conta Débito" not in content
    assert "Conta Crédito" not in content
    assert "Conta_Debito" not in content
    assert "Conta_Credito" not in content
    assert "ZAERON CONTÁBIL" in content
    assert "Relatório Executivo" in content
    assert "Insights da Operação" in content
