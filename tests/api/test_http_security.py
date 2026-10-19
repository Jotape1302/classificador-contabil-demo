"""Controles HTTP aplicados transversalmente."""


def test_unsafe_request_from_untrusted_origin_is_rejected(client):
    response = client.post(
        "/api/auth/logout",
        headers={"Origin": "https://malicious.example"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "origin_not_allowed"


def test_security_headers_are_present(client):
    response = client.get("/api/health/live")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-request-id"]
