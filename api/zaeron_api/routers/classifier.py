"""Endpoints HTTP do classificador; regras de aplicação e limites de uso."""

import io

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from api.zaeron_api.adapters.parser_adapter import (
    StatementParseError,
    UnsupportedStatementFormat,
)
from api.zaeron_api.core.errors import APIError
from api.zaeron_api.core.ratelimit import rate_limit
from api.zaeron_api.dependencies.auth import CurrentUser
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.repositories.classifier import (
    BatchStateConflict,
    OptimisticLockConflict,
)
from api.zaeron_api.repositories.users import UserRepository
from api.zaeron_api.schemas.classifier import (
    BatchHistoryListResponse,
    BatchRead,
    ExportRequest,
    ProcessBatchRequest,
    RuleCreate,
    RuleListResponse,
    RuleRead,
    TransactionsPatchRequest,
)
from api.zaeron_api.schemas.common import MessageResponse
from api.zaeron_api.services.classifier import (
    BatchNotFound,
    ClassifierService,
    InvalidUpload,
    MAX_UPLOAD_BYTES,
    ProcessingFailed,
)


router = APIRouter(prefix="/classifier", tags=["classifier"])


def _not_found(exc: Exception) -> APIError:
    return APIError(404, "Lote não encontrado.", "batch_not_found")


@router.post(
    "/upload",
    response_model=BatchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
async def upload_statement(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    try:
        batch, _created = ClassifierService(db).upload(
            user_id=current_user.id,
            filename=file.filename or "extrato",
            content=content,
        )
        return batch
    except (InvalidUpload, UnsupportedStatementFormat, StatementParseError) as exc:
        raise APIError(422, str(exc), "invalid_statement") from exc


@router.post(
    "/process",
    response_model=BatchRead,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))],
)
def process_batch(
    payload: ProcessBatchRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    user_repo = UserRepository(db)
    user_repo.check_and_reset_usage(current_user.id)

    try:
        result = ClassifierService(db).process(
            user_id=current_user.id,
            batch_id=payload.batch_id,
        )
        # Incrementa o uso mensal do usuário após processamento bem-sucedido
        user_repo.increment_usage(current_user.id)
        return result
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(409, "O lote já está sendo processado.", "batch_state_conflict") from exc
    except ProcessingFailed as exc:
        raise APIError(500, "Falha ao processar o lote.", "processing_failed") from exc


@router.get("/batches", response_model=BatchHistoryListResponse)
def list_batches(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    batches = ClassifierService(db).list_batches(user_id=current_user.id)
    return BatchHistoryListResponse(batches=batches, total=len(batches))


@router.get("/batches/{batch_id}", response_model=BatchRead)
def get_batch(
    batch_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return ClassifierService(db).get_batch(
            user_id=current_user.id,
            batch_id=batch_id,
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc


@router.patch("/batches/{batch_id}/transactions", response_model=BatchRead)
def patch_transactions(
    batch_id: int,
    payload: TransactionsPatchRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return ClassifierService(db).patch_transactions(
            user_id=current_user.id,
            batch_id=batch_id,
            batch_version=payload.batch_version,
            updates=[
                item.model_dump(exclude_unset=True) for item in payload.transactions
            ],
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except OptimisticLockConflict as exc:
        raise APIError(
            409,
            "O lote foi atualizado em outra sessão. Recarregue os dados.",
            "optimistic_lock_conflict",
        ) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "O lote ainda não está disponível para edição.",
            "batch_state_conflict",
        ) from exc


@router.get("/rules", response_model=RuleListResponse)
def list_rules(current_user: CurrentUser, db: Session = Depends(get_db)):
    return RuleListResponse(rules=ClassifierService(db).list_rules(current_user.id))


@router.post("/rules", response_model=RuleRead, status_code=status.HTTP_201_CREATED)
def upsert_rule(
    payload: RuleCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return ClassifierService(db).upsert_rule(
        current_user.id,
        payload.model_dump(),
    )


@router.delete("/rules", response_model=MessageResponse)
def delete_rule(
    current_user: CurrentUser,
    rule_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    if not ClassifierService(db).delete_rule(current_user.id, rule_id):
        raise APIError(404, "Regra não encontrada.", "rule_not_found")
    return MessageResponse(message="Regra removida com sucesso.")


def _build_safe_export_filename(
    batch_source_filename: str | None,
    batch_id: int,
    export_format: str,
    extension: str,
) -> str:
    import re
    import unicodedata
    from pathlib import Path

    ext = extension.strip().lstrip(".").lower()
    if batch_source_filename:
        base = Path(batch_source_filename).stem
        nfkd = unicodedata.normalize("NFKD", base)
        ascii_base = "".join(c for c in nfkd if not unicodedata.combining(c))
        clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", ascii_base).strip("_").lower()
        if clean and clean not in ("anonymous", "extrato", "none", "null"):
            return f"classificacao_{clean}.{ext}"
    return f"zaeron_lote_{batch_id}_{export_format.lower()}.{ext}"


@router.post("/export", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def export_batch(
    payload: ExportRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        batch = ClassifierService(db).get_batch(user_id=current_user.id, batch_id=payload.batch_id)
        exported = ClassifierService(db).export(
            user=current_user,
            batch_id=payload.batch_id,
            export_format=payload.format,
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "Processe o lote antes de exportar.",
            "batch_state_conflict",
        ) from exc

    filename = _build_safe_export_filename(
        batch.source_filename,
        payload.batch_id,
        payload.format,
        exported.extension,
    )

    return StreamingResponse(
        io.BytesIO(exported.content),
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/excel", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def export_excel_get(
    current_user: CurrentUser,
    batch_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    try:
        batch = ClassifierService(db).get_batch(user_id=current_user.id, batch_id=batch_id)
        exported = ClassifierService(db).export(
            user=current_user,
            batch_id=batch_id,
            export_format="xlsx",
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "Processe o lote antes de exportar.",
            "batch_state_conflict",
        ) from exc

    filename = _build_safe_export_filename(
        batch.source_filename,
        batch_id,
        "xlsx",
        exported.extension,
    )

    return StreamingResponse(
        io.BytesIO(exported.content),
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/excel", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def export_excel_post(
    current_user: CurrentUser,
    payload: ProcessBatchRequest,
    db: Session = Depends(get_db),
):
    try:
        batch = ClassifierService(db).get_batch(user_id=current_user.id, batch_id=payload.batch_id)
        exported = ClassifierService(db).export(
            user=current_user,
            batch_id=payload.batch_id,
            export_format="xlsx",
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "Processe o lote antes de exportar.",
            "batch_state_conflict",
        ) from exc

    filename = _build_safe_export_filename(
        batch.source_filename,
        payload.batch_id,
        "xlsx",
        exported.extension,
    )

    return StreamingResponse(
        io.BytesIO(exported.content),
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def export_pdf_get(
    current_user: CurrentUser,
    batch_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    try:
        batch = ClassifierService(db).get_batch(user_id=current_user.id, batch_id=batch_id)
        exported = ClassifierService(db).export(
            user=current_user,
            batch_id=batch_id,
            export_format="pdf",
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "Processe o lote antes de exportar.",
            "batch_state_conflict",
        ) from exc

    filename = _build_safe_export_filename(
        batch.source_filename,
        batch_id,
        "pdf",
        exported.extension,
    )

    return StreamingResponse(
        io.BytesIO(exported.content),
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/pdf", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def export_pdf_post(
    current_user: CurrentUser,
    payload: ProcessBatchRequest,
    db: Session = Depends(get_db),
):
    try:
        batch = ClassifierService(db).get_batch(user_id=current_user.id, batch_id=payload.batch_id)
        exported = ClassifierService(db).export(
            user=current_user,
            batch_id=payload.batch_id,
            export_format="pdf",
        )
    except BatchNotFound as exc:
        raise _not_found(exc) from exc
    except BatchStateConflict as exc:
        raise APIError(
            409,
            "Processe o lote antes de exportar.",
            "batch_state_conflict",
        ) from exc

    filename = _build_safe_export_filename(
        batch.source_filename,
        payload.batch_id,
        "pdf",
        exported.extension,
    )

    return StreamingResponse(
        io.BytesIO(exported.content),
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
