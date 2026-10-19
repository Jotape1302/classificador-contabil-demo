"""Testes de isolamento e funcionalidades do endpoint REST de regras (/api/rules)."""

from api.zaeron_api.core.security import hash_password
from api.zaeron_api.models.users import User


def test_rules_crud_and_isolation(client, legacy_user, session_factory):
    # 1. Login com usuário principal
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )

    # 2. Criar nova regra via POST /api/rules
    create_resp = client.post(
        "/api/rules",
        json={
            "search_term": "COPEL ENERGIA",
            "category": "Energia Elétrica",
            "debit_account": "3.1.1.05",
            "credit_account": "1.1.1.01",
            "history_code": "105",
        },
    )
    assert create_resp.status_code == 201
    rule_data = create_resp.json()
    rule_id = rule_data["id"]
    assert rule_data["search_term"] == "COPEL ENERGIA"
    assert rule_data["category"] == "Energia Elétrica"

    # 3. Listar regras via GET /api/rules
    list_resp = client.get("/api/rules")
    assert list_resp.status_code == 200
    rules = list_resp.json()["rules"]
    assert any(r["id"] == rule_id and r["search_term"] == "COPEL ENERGIA" for r in rules)

    # 4. Atualizar regra via PUT /api/rules/{id}
    update_resp = client.put(
        f"/api/rules/{rule_id}",
        json={
            "search_term": "COPEL ENERGIA",
            "category": "Utilidades - Energia",
            "debit_account": "3.1.1.10",
            "credit_account": "1.1.1.01",
            "history_code": "110",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["category"] == "Utilidades - Energia"

    # 5. Criar segundo usuário e verificar isolamento
    session = session_factory()
    try:
        user_two = User(
            name="Segundo Contador",
            email="outro@escritorio.test",
            password_hash=hash_password("senha-outro-123"),
            office_name="Outro Escritório",
            document_number="83584852020",
            postal_code="04538-133",
            street="Avenida Brigadeiro Faria Lima",
            neighborhood="Itaim Bibi",
            city="São Paulo",
            state="SP",
            number="2000",
            is_verified=True,
            is_active=True,
        )
        session.add(user_two)
        session.commit()
    finally:
        session.close()

    # Login como segundo usuário
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/login",
        json={"email": "outro@escritorio.test", "password": "senha-outro-123"},
    )

    # Segundo usuário não deve ver as regras do primeiro
    other_list_resp = client.get("/api/rules")
    assert other_list_resp.status_code == 200
    assert not any(r["id"] == rule_id for r in other_list_resp.json()["rules"])

    # Segundo usuário não pode deletar a regra do primeiro usuário
    del_forbidden = client.delete(f"/api/rules/{rule_id}")
    assert del_forbidden.status_code == 404

    # 6. Re-logar com primeiro usuário e deletar regra
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )

    del_resp = client.delete(f"/api/rules/{rule_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["message"] == "Regra removida com sucesso."

    # Confirmar remoção
    empty_list = client.get("/api/rules")
    assert not any(r["id"] == rule_id for r in empty_list.json()["rules"])
