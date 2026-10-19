"""Banco SQLite isolado e cliente HTTPS para a API."""

import os

os.environ["ZAERON_ENVIRONMENT"] = "test"
os.environ["ZAERON_JWT_SECRET"] = "test-secret-with-at-least-thirty-two-characters"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ZAERON_ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"
os.environ["ZAERON_CORS_ORIGINS"] = "https://testserver"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.zaeron_api.core.database import Base
from api.zaeron_api.core.security import hash_password
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.main import app
from api.zaeron_api.models import academy, classifier, users  # noqa: F401
from api.zaeron_api.models.users import OfficeProfile, User


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        session = session_factory()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def legacy_user(session_factory):
    session = session_factory()
    try:
        user = User(
            name="Contadora Legada",
            email="legada@zaeron.test",
            password_hash=hash_password("senha-legada"),
            office_name="Legado Contábil",
            document_number="52998224725",
            postal_code="01310-100",
            street="Avenida Paulista",
            neighborhood="Bela Vista",
            city="São Paulo",
            state="SP",
            number="1000",
            complement="Conjunto 42",
            is_verified=True,
            plan_tier="free",
            monthly_usage_count=0,
            is_active=True,
        )
        session.add(user)
        session.flush()
        session.add(
            OfficeProfile(
                user_id=user.id,
                erp_system="Domínio Sistemas",
                client_range="21 a 50",
                custom_rules='{"regras": []}',
            )
        )
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()

