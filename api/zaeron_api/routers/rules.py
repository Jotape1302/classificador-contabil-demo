"""Endpoints REST dedicados para regras de classificação do escritório."""

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.dependencies.auth import CurrentUser
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.schemas.classifier import RuleCreate, RuleListResponse, RuleRead
from api.zaeron_api.schemas.common import MessageResponse
from api.zaeron_api.services.classifier import ClassifierService

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("", response_model=RuleListResponse)
def list_rules(current_user: CurrentUser, db: Session = Depends(get_db)):
    rules = ClassifierService(db).list_rules(current_user.id)
    return RuleListResponse(rules=rules)


@router.post("", response_model=RuleRead, status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: RuleCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return ClassifierService(db).upsert_rule(
        current_user.id,
        payload.model_dump(),
    )


@router.put("/{rule_id}", response_model=RuleRead)
def update_rule(
    payload: RuleCreate,
    current_user: CurrentUser,
    rule_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    return ClassifierService(db).upsert_rule(
        current_user.id,
        payload.model_dump(),
    )


@router.delete("/{rule_id}", response_model=MessageResponse)
def delete_rule_by_path(
    current_user: CurrentUser,
    rule_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    if not ClassifierService(db).delete_rule(current_user.id, rule_id):
        raise APIError(404, "Regra não encontrada.", "rule_not_found")
    return MessageResponse(message="Regra removida com sucesso.")


@router.delete("", response_model=MessageResponse)
def delete_rule_by_query(
    current_user: CurrentUser,
    rule_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    if not ClassifierService(db).delete_rule(current_user.id, rule_id):
        raise APIError(404, "Regra não encontrada.", "rule_not_found")
    return MessageResponse(message="Regra removida com sucesso.")
