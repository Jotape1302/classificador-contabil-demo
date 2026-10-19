"""Orquestra lotes, classificação, edição, regras e exportação."""

import hashlib
import json
from pathlib import Path
from typing import Any, Callable

from sqlalchemy.orm import Session

from api.zaeron_api.models.users import User
from api.zaeron_api.services.bank_cleaner import generate_accounting_history
from api.zaeron_api.adapters.classifier_adapter import classify_transactions
from api.zaeron_api.adapters.export_adapter import ExportedFile, build_export
from api.zaeron_api.adapters.parser_adapter import parse_statement
from api.zaeron_api.models.classifier import ClassifierBatch
from api.zaeron_api.repositories.classifier import (
    BatchStateConflict,
    ClassifierRepository,
    OptimisticLockConflict,
)
from api.zaeron_api.schemas.classifier import (
    BatchHistoryItem,
    BatchMetrics,
    BatchRead,
    RuleRead,
    TopCategoryItem,
    TransactionRead,
)


MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class BatchNotFound(LookupError):
    pass


class InvalidUpload(ValueError):
    pass


class ProcessingFailed(RuntimeError):
    pass


def _transaction_read(transaction) -> TransactionRead:
    return TransactionRead(
        id=transaction.id,
        position=transaction.position,
        date=transaction.date,
        original_description=transaction.original_description,
        clean_description=transaction.clean_description,
        amount=float(transaction.amount),
        transaction_type=transaction.transaction_type,
        category=transaction.category,
        debit_account=transaction.debit_account,
        credit_account=transaction.credit_account,
        accounting_history=transaction.accounting_history,
        history_code=transaction.history_code,
        classification_source=transaction.classification_source,
        confidence=float(transaction.confidence),
        is_duplicate=bool(transaction.is_duplicate),
        version=transaction.version,
    )


def batch_read(batch: ClassifierBatch) -> BatchRead:
    stats: dict[str, Any] = {}
    if batch.processing_stats_json:
        try:
            stats = json.loads(batch.processing_stats_json)
        except (TypeError, json.JSONDecodeError):
            stats = {}
    processable = [item for item in batch.transactions if not item.is_duplicate]
    confident = sum(float(item.confidence) >= 0.9 for item in processable)
    accuracy = (confident / len(processable) * 100) if processable else 0.0
    return BatchRead(
        id=batch.id,
        source_filename=batch.source_filename,
        source_format=batch.source_format,
        status=batch.status,
        total_transactions=batch.total_transactions,
        duplicate_transactions=batch.duplicate_transactions,
        processed_transactions=batch.processed_transactions,
        version=batch.version,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        processed_at=batch.processed_at,
        error_message=batch.error_message,
        metrics=BatchMetrics(
            hours_saved=round(batch.processed_transactions * 0.025, 1),
            accuracy_percent=round(accuracy, 1),
            zero_cost_percent=round(float(stats.get("taxa_custo_zero", 0.0)), 1),
        ),
        transactions=[_transaction_read(item) for item in batch.transactions],
    )


def batch_history_item(batch: ClassifierBatch) -> BatchHistoryItem:
    processable = [t for t in batch.transactions if not t.is_duplicate]
    dates = [t.date for t in processable if t.date is not None]
    period_start = min(dates) if dates else None
    period_end = max(dates) if dates else None

    total_income = sum(float(t.amount) for t in processable if float(t.amount) > 0)
    total_expenses = sum(abs(float(t.amount)) for t in processable if float(t.amount) < 0)
    net_balance = round(total_income - total_expenses, 2)

    conf_sum = sum(float(t.confidence or 0.0) for t in processable)
    avg_conf = round((conf_sum / len(processable) * 100), 1) if processable else 0.0

    review_count = sum(
        1
        for t in processable
        if float(t.confidence or 0.0) < 0.8
        or (t.category or "").lower() in ("pendente", "não classificado", "")
    )

    hours_saved = (
        max(0.2, round(len(processable) * 0.025, 1)) if len(processable) > 0 else 0.0
    )
    financial_saved = round(hours_saved * 11.0, 2)

    cat_totals: dict[str, dict[str, Any]] = {}
    for t in processable:
        cat = (t.category or "Outras Despesas").strip()
        val = abs(float(t.amount))
        if cat not in cat_totals:
            cat_totals[cat] = {"total": 0.0, "count": 0}
        cat_totals[cat]["total"] += val
        cat_totals[cat]["count"] += 1

    tot_val = sum(c["total"] for c in cat_totals.values())
    top_cats: list[TopCategoryItem] = []
    for name, data in sorted(
        cat_totals.items(), key=lambda x: x[1]["total"], reverse=True
    )[:5]:
        top_cats.append(
            TopCategoryItem(
                name=name,
                total=round(data["total"], 2),
                count=data["count"],
                percentage=round((data["total"] / tot_val * 100), 1) if tot_val > 0 else 0.0,
            )
        )

    return BatchHistoryItem(
        id=batch.id,
        source_filename=batch.source_filename,
        source_format=batch.source_format,
        status=batch.status,
        total_transactions=batch.total_transactions,
        duplicate_transactions=batch.duplicate_transactions,
        processed_transactions=batch.processed_transactions,
        version=batch.version,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        processed_at=batch.processed_at,
        period_start=period_start,
        period_end=period_end,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_balance=net_balance,
        average_confidence=avg_conf,
        review_count=review_count,
        hours_saved=hours_saved,
        financial_saved=financial_saved,
        top_categories=top_cats,
    )


def rule_read(rule) -> RuleRead:
    return RuleRead(
        id=rule.id,
        search_term=rule.search_term,
        category=rule.category,
        debit_account=rule.debit_account,
        credit_account=rule.credit_account,
        history_code=rule.history_code,
        times_applied=rule.times_applied,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


class ClassifierService:
    def __init__(self, session: Session):
        self.repository = ClassifierRepository(session)

    def upload(
        self, *, user_id: int, filename: str, content: bytes
    ) -> tuple[BatchRead, bool]:
        if not content:
            raise InvalidUpload("O arquivo enviado está vazio.")
        if len(content) > MAX_UPLOAD_BYTES:
            raise InvalidUpload("O arquivo excede o limite de 10 MB.")
        safe_filename = Path(filename or "extrato").name[:255]
        file_hash = hashlib.sha256(content).hexdigest()
        existing = self.repository.get_batch_by_file_hash(user_id, file_hash)
        if existing is not None:
            return batch_read(existing), False
        parsed = parse_statement(safe_filename, content, user_id=user_id)
        batch, created = self.repository.create_batch(
            user_id=user_id,
            filename=safe_filename,
            source_format=parsed.source_format,
            file_sha256=file_hash,
            transactions=parsed.transactions,
        )
        return batch_read(batch), created

    def get_batch(self, *, user_id: int, batch_id: int) -> BatchRead:
        batch = self.repository.get_batch(user_id, batch_id)
        if batch is None:
            raise BatchNotFound
        return batch_read(batch)

    def list_batches(self, user_id: int) -> list[BatchHistoryItem]:
        batches = self.repository.list_batches(user_id)
        return [batch_history_item(b) for b in batches]

    def process(
        self,
        *,
        user_id: int,
        batch_id: int,
        ai_classifier: Callable | None = None,
    ) -> BatchRead:
        batch = self.repository.get_batch(user_id, batch_id)
        if batch is None:
            raise BatchNotFound
        if batch.status in ("processed", "exported"):
            return batch_read(batch)
        if not self.repository.claim_for_processing(user_id, batch_id):
            current = self.repository.get_batch(user_id, batch_id)
            if current and current.status in ("processed", "exported"):
                return batch_read(current)
            raise BatchStateConflict

        try:
            batch = self.repository.get_batch(user_id, batch_id)
            updates, error, stats, rule_ids = classify_transactions(
                batch.transactions,
                rules=self.repository.rule_dicts(user_id),
                ai_classifier=ai_classifier,
            )
            if error:
                stats["classifier_warning"] = error[:200]
            completed = self.repository.complete_processing(
                user_id=user_id,
                batch_id=batch_id,
                updates=updates,
                stats=stats,
                applied_rule_ids=rule_ids,
            )
            return batch_read(completed)
        except (BatchStateConflict, OptimisticLockConflict):
            raise
        except Exception as exc:
            self.repository.mark_failed(
                user_id,
                batch_id,
                "Não foi possível concluir a classificação.",
            )
            raise ProcessingFailed from exc

    def patch_transactions(
        self,
        *,
        user_id: int,
        batch_id: int,
        batch_version: int,
        updates: list[dict[str, Any]],
    ) -> BatchRead:
        batch = self.repository.get_batch(user_id, batch_id)
        if batch is None:
            raise BatchNotFound
        transaction_map = {item.id: item for item in batch.transactions}
        normalized_updates = []
        for values in updates:
            current = transaction_map.get(values["id"])
            if current is None:
                raise BatchNotFound
            normalized = dict(values)
            if "category" in normalized and "accounting_history" not in normalized:
                normalized["accounting_history"] = generate_accounting_history(
                    current.clean_description,
                    normalized["category"],
                    is_saida=float(current.amount) < 0,
                )
            normalized_updates.append(normalized)
        try:
            updated = self.repository.patch_transactions(
                user_id=user_id,
                batch_id=batch_id,
                batch_version=batch_version,
                updates=normalized_updates,
            )
        except LookupError as exc:
            raise BatchNotFound from exc
        return batch_read(updated)

    def list_rules(self, user_id: int) -> list[RuleRead]:
        return [rule_read(rule) for rule in self.repository.list_rules(user_id)]

    def upsert_rule(self, user_id: int, values: dict[str, Any]) -> RuleRead:
        return rule_read(self.repository.upsert_rule(user_id, values))

    def delete_rule(self, user_id: int, rule_id: int) -> bool:
        return self.repository.delete_rule(user_id, rule_id)

    def export(
        self,
        *,
        user: User,
        batch_id: int,
        export_format: str,
    ) -> ExportedFile:
        batch = self.repository.get_batch(user.id, batch_id)
        if batch is None:
            raise BatchNotFound
        if batch.status not in ("processed", "exported"):
            raise BatchStateConflict
        content = build_export(
            export_format,
            [item for item in batch.transactions if not item.is_duplicate],
            office_name=user.office_name or "Escritório Contábil",
            accountant_name=user.name,
            source_filename=batch.source_filename,
            batch_id=batch.id,
        )
        self.repository.mark_exported(user.id, batch_id)
        return content

