"""Configurações globais de ambiente para a suíte de testes."""

import os

os.environ["ZAERON_ENVIRONMENT"] = "test"
os.environ["ZAERON_JWT_SECRET"] = "test-secret-with-at-least-thirty-two-characters"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ZAERON_ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"
os.environ["ZAERON_CORS_ORIGINS"] = "https://testserver"

from api.zaeron_api.core.config import get_settings

get_settings.cache_clear()
