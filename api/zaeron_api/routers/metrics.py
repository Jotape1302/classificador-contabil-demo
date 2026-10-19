"""Endpoints HTTP de métricas financeiras e operacionais."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.dependencies.auth import CurrentUser
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.schemas.metrics import (
    BatchMetricsResponse,
    ImpactMetricsResponse,
    MetricsSummaryResponse,
)
from api.zaeron_api.services.metrics_service import BatchNotFound, MetricsService


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/batches/{batch_id}", response_model=BatchMetricsResponse)
async def get_batch_metrics(
    batch_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    """Retorna métricas financeiras e de produtividade de um lote específico."""
    try:
        return MetricsService(db).get_batch_metrics(
            user_id=current_user.id,
            batch_id=batch_id,
        )
    except BatchNotFound as exc:
        raise APIError(404, "Lote não encontrado.", "batch_not_found") from exc


@router.get("/summary", response_model=MetricsSummaryResponse)
async def get_metrics_summary(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    """Retorna o resumo consolidado de métricas financeiras e de produtividade do usuário."""
    return MetricsService(db).get_metrics_summary(user_id=current_user.id)


@router.get("/impact", response_model=ImpactMetricsResponse)
async def get_impact_metrics(
    current_user: CurrentUser,
    period: str = Query("month", pattern="^(week|month|year|all)$"),
    db: Session = Depends(get_db),
):
    """Retorna KPIs agregados, série temporal e histórico de lotes para a tela de Impacto & ROI."""
    return MetricsService(db).get_impact_metrics(
        user_id=current_user.id,
        period=period,
    )


__all__ = ["router"]

