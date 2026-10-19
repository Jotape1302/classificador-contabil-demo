"""Contrato público sanitizado e healthchecks."""

import datetime

from sqlalchemy.exc import OperationalError

from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.main import app
from api.zaeron_api.models.academy import AcademyCertificate


PUBLIC_CODE = "ZAC-AAAA-BBBB-CCCC-DDDD"


def test_public_certificate_returns_only_allowed_snapshot(client, session_factory):
    session = session_factory()
    try:
        session.add(
            AcademyCertificate(
                user_id=None,
                attempt_id=None,
                public_code=PUBLIC_CODE,
                course_key="ia_rotina_contabil",
                course_version="1.0.0",
                recipient_name="Titular Público",
                course_title="IA Aplicada à Rotina Contábil",
                score=97,
                issued_at=datetime.datetime(2026, 8, 27, 12, 0),
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get(f"/api/public/certificates/{PUBLIC_CODE.lower()}")

    assert response.status_code == 200
    assert response.json() == {
        "status": "valid",
        "recipient_name": "Titular Público",
        "course_title": "IA Aplicada à Rotina Contábil",
        "duration_minutes": 210,
        "issued_at": "2026-08-27T12:00:00",
        "public_code": PUBLIC_CODE,
        "seal": "Zaeron Certified",
    }
    forbidden = {"id", "user_id", "attempt_id", "email", "password_hash", "score"}
    assert forbidden.isdisjoint(response.json())


def test_public_certificate_rejects_malformed_or_unknown_codes(client):
    malformed = client.get("/api/public/certificates/not-a-certificate")
    unknown = client.get("/api/public/certificates/ZAC-ZZZZ-ZZZZ-ZZZZ-ZZZZ")
    assert malformed.status_code == unknown.status_code == 404
    assert malformed.json() == unknown.json()


def test_public_certificate_returns_revoked_status_when_revoked(client, session_factory):
    revoked_code = "ZAC-AAAA-BBBB-CCCC-EEEE"
    session = session_factory()
    try:
        session.add(
            AcademyCertificate(
                user_id=None,
                attempt_id=None,
                public_code=revoked_code,
                course_key="ia_rotina_contabil",
                course_version="1.0.0",
                recipient_name="Titular Revogado",
                course_title="IA Aplicada à Rotina Contábil",
                score=90,
                issued_at=datetime.datetime(2026, 8, 27, 12, 0),
                revoked_at=datetime.datetime(2026, 8, 28, 9, 30),
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get(f"/api/public/certificates/{revoked_code.lower()}")
    assert response.status_code == 200
    assert response.json()["status"] == "revoked"
    assert response.json()["recipient_name"] == "Titular Revogado"
    assert response.json()["public_code"] == revoked_code



def test_liveness_and_database_readiness(client):
    live = client.get("/api/health/live")
    ready = client.get("/api/health/ready")
    assert live.status_code == 200
    assert live.json() == {"status": "ok", "service": "zaeron-api"}
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready", "database": "connected"}


def test_readiness_returns_503_when_database_is_unavailable(client):
    class BrokenSession:
        def execute(self, _statement):
            raise OperationalError("SELECT 1", {}, RuntimeError("offline"))

    def broken_db():
        yield BrokenSession()

    original_override = app.dependency_overrides[get_db]
    app.dependency_overrides[get_db] = broken_db
    try:
        response = client.get("/api/health/ready")
    finally:
        app.dependency_overrides[get_db] = original_override

    assert response.status_code == 503
    assert response.json()["code"] == "database_unavailable"
