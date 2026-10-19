"""Aplicação FastAPI da Fase 1 do Strangler Pattern."""

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from api.zaeron_api import __version__
from api.zaeron_api.core.config import get_settings
from api.zaeron_api.core.errors import install_error_handlers
from api.zaeron_api.core.logging import configure_logging
from api.zaeron_api.routers import (
    academy,
    auth,
    classifier,
    health,
    metrics,
    public,
    rules,
    users,
)


configure_logging()
logger = logging.getLogger("zaeron_api")
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Request-ID"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_host_list)


@app.middleware("http")
async def security_and_observability_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    if (
        request.method in {"POST", "PUT", "PATCH", "DELETE"}
        and origin
        and origin not in settings.cors_origin_list
    ):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Origem não autorizada.",
                "code": "origin_not_allowed",
            },
        )

    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started_at = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store"
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "request method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    return response


install_error_handlers(app)
for api_router in (
    auth.router,
    users.router,
    classifier.router,
    rules.router,
    metrics.router,
    academy.router,
    public.router,
    health.router,
):
    app.include_router(api_router, prefix="/api")


__all__ = ["app"]
