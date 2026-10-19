"""Healthchecks separados de processo e dependência de banco."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.schemas.common import LiveHealthResponse, ReadyHealthResponse


router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", response_model=LiveHealthResponse)
def live() -> LiveHealthResponse:
    return LiveHealthResponse()


@router.get("/ready", response_model=ReadyHealthResponse)
def ready(db: Session = Depends(get_db)) -> ReadyHealthResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise APIError(503, "Banco de dados indisponível.", "database_unavailable") from exc
    return ReadyHealthResponse()

