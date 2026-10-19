"""Persistência transacional dos lotes e regras do classificador."""

import datetime
import json
from collections import Counter
from typing import Any

from sqlalchemy import update
from sqlalchemy.orm import Session, selectinload

from api.zaeron_api.models.classifier import (
    BatchExecution,
    ClassificationRule,
    ClassifierBatch,
    ClassifierBatchTransaction,
    ProcessedTransaction,
)
from api.zaeron_api.models.users import UsageLog



class OptimisticLockConflict(ValueError):
    pass


class BatchStateConflict(ValueError):
    pass


class ClassifierRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_batch(self, user_id: int, batch_id: int) -> ClassifierBatch | None:
        return (
            self.session.query(ClassifierBatch)
            .options(selectinload(ClassifierBatch.transactions))
            .filter(
                ClassifierBatch.id == batch_id,
                ClassifierBatch.user_id == user_id,
            )
            .first()
        )

    def list_batches(self, user_id: int) -> list[ClassifierBatch]:
        return (
            self.session.query(ClassifierBatch)
            .options(selectinload(ClassifierBatch.transactions))
            .filter(ClassifierBatch.user_id == user_id)
            .order_by(ClassifierBatch.created_at.desc())
            .all()
        )

    def get_batch_by_file_hash(
        self, user_id: int, file_sha256: str
    ) -> ClassifierBatch | None:
        return (
            self.session.query(ClassifierBatch)
            .options(selectinload(ClassifierBatch.transactions))
            .filter_by(user_id=user_id, file_sha256=file_sha256)
            .first()
        )

    def create_batch(
        self,
        *,
        user_id: int,
        filename: str,
        source_format: str,
        file_sha256: str,
        transactions: list[dict[str, Any]],
    ) -> tuple[ClassifierBatch, bool]:
        existing = self.get_batch_by_file_hash(user_id, file_sha256)
        if existing is not None:
            return existing, False

        hashes = [item["transaction_hash"] for item in transactions]
        persisted_hashes = {
            row[0]
            for row in self.session.query(ProcessedTransaction.transaction_hash)
            .filter(
                ProcessedTransaction.user_id == user_id,
                ProcessedTransaction.transaction_hash.in_(hashes),
            )
            .all()
        }
        hash_counts = Counter(hashes)
        seen_hashes: set[str] = set()
        batch = ClassifierBatch(
            user_id=user_id,
            source_filename=filename,
            source_format=source_format,
            file_sha256=file_sha256,
            status="uploaded",
            total_transactions=len(transactions),
        )
        self.session.add(batch)
        try:
            self.session.flush()
            duplicate_count = 0
            for item in transactions:
                transaction_hash = item["transaction_hash"]
                is_duplicate = transaction_hash in persisted_hashes or (
                    transaction_hash in seen_hashes and hash_counts[transaction_hash] > 1
                )
                seen_hashes.add(transaction_hash)
                duplicate_count += int(is_duplicate)
                self.session.add(
                    ClassifierBatchTransaction(
                        batch_id=batch.id,
                        is_duplicate=is_duplicate,
                        **item,
                    )
                )
            batch.duplicate_transactions = duplicate_count
            self.session.commit()
            return self.get_batch(user_id, batch.id), True
        except Exception:
            self.session.rollback()
            raise

    def claim_for_processing(self, user_id: int, batch_id: int) -> bool:
        result = self.session.execute(
            update(ClassifierBatch)
            .where(
                ClassifierBatch.id == batch_id,
                ClassifierBatch.user_id == user_id,
                ClassifierBatch.status.in_(("uploaded", "failed")),
            )
            .values(
                status="processing",
                error_message=None,
                version=ClassifierBatch.version + 1,
                updated_at=datetime.datetime.utcnow(),
            )
        )
        self.session.commit()
        return bool(result.rowcount)

    def list_rules(self, user_id: int) -> list[ClassificationRule]:
        return (
            self.session.query(ClassificationRule)
            .filter_by(user_id=user_id)
            .order_by(
                ClassificationRule.times_applied.desc(),
                ClassificationRule.updated_at.desc(),
            )
            .all()
        )

    def rule_dicts(self, user_id: int) -> list[dict[str, Any]]:
        return [rule.to_dict() for rule in self.list_rules(user_id)]

    def complete_processing(
        self,
        *,
        user_id: int,
        batch_id: int,
        updates: list[dict[str, Any]],
        stats: dict[str, Any],
        applied_rule_ids: list[int],
    ) -> ClassifierBatch:
        batch = self.get_batch(user_id, batch_id)
        if batch is None or batch.status != "processing":
            raise BatchStateConflict
        transaction_map = {transaction.id: transaction for transaction in batch.transactions}
        for values in updates:
            transaction = transaction_map[values["id"]]
            for field, value in values.items():
                if field != "id":
                    setattr(transaction, field, value)
            transaction.version += 1
            transaction.updated_at = datetime.datetime.utcnow()

        for rule_id in applied_rule_ids:
            rule = (
                self.session.query(ClassificationRule)
                .filter_by(id=rule_id, user_id=user_id)
                .first()
            )
            if rule is not None:
                rule.times_applied += 1
                rule.updated_at = datetime.datetime.utcnow()

        processable = [
            transaction for transaction in batch.transactions if not transaction.is_duplicate
        ]
        existing_hashes = {
            row[0]
            for row in self.session.query(ProcessedTransaction.transaction_hash)
            .filter(
                ProcessedTransaction.user_id == user_id,
                ProcessedTransaction.transaction_hash.in_(
                    [transaction.transaction_hash for transaction in processable]
                ),
            )
            .all()
        }
        for transaction in processable:
            if transaction.transaction_hash not in existing_hashes:
                self.session.add(
                    ProcessedTransaction(
                        user_id=user_id,
                        transaction_hash=transaction.transaction_hash,
                        file_name=batch.source_filename,
                        date=transaction.date,
                        amount=transaction.amount,
                        description=transaction.clean_description,
                    )
                )
        if processable:
            self.session.add(
                UsageLog(
                    user_id=user_id,
                    file_name=batch.source_filename,
                    transactions_count=len(processable),
                )
            )

        rules_matched = 0
        ai_matched = 0
        for transaction in processable:
            src = (transaction.classification_source or "").lower()
            if any(term in src for term in ("ia", "gemini", "gpt", "openai", "inteligência", "deepseek")):
                ai_matched += 1
            elif src not in ("não classificado", "pendente", ""):
                rules_matched += 1

        hours_saved = max(0.2, round(len(processable) * 0.025, 1)) if len(processable) > 0 else 0.0
        financial_saved = round(hours_saved * 11.0, 2)

        execution = BatchExecution(
            user_id=user_id,
            batch_id=batch.id,
            filename=batch.source_filename,
            total_rows=len(processable),
            rules_matched=rules_matched,
            ai_matched=ai_matched,
            hours_saved=hours_saved,
            financial_saved=financial_saved,
            created_at=datetime.datetime.utcnow(),
        )
        self.session.add(execution)

        batch.status = "processed"
        batch.processed_transactions = len(processable)
        batch.processing_stats_json = json.dumps(stats, ensure_ascii=False)
        batch.processed_at = datetime.datetime.utcnow()
        batch.updated_at = datetime.datetime.utcnow()
        batch.version += 1
        self.session.commit()
        return self.get_batch(user_id, batch_id)


    def mark_failed(self, user_id: int, batch_id: int, message: str) -> None:
        batch = self.get_batch(user_id, batch_id)
        if batch is None:
            return
        batch.status = "failed"
        batch.error_message = message[:500]
        batch.updated_at = datetime.datetime.utcnow()
        batch.version += 1
        self.session.commit()

    def patch_transactions(
        self,
        *,
        user_id: int,
        batch_id: int,
        batch_version: int,
        updates: list[dict[str, Any]],
    ) -> ClassifierBatch:
        batch = self.get_batch(user_id, batch_id)
        if batch is None:
            raise LookupError
        if batch.status not in ("processed", "exported"):
            raise BatchStateConflict
        if batch.version != batch_version:
            raise OptimisticLockConflict
        transaction_map = {transaction.id: transaction for transaction in batch.transactions}
        if any(values["id"] not in transaction_map for values in updates):
            raise LookupError
        if any(
            transaction_map[values["id"]].version != values["version"]
            for values in updates
        ):
            raise OptimisticLockConflict

        for values in updates:
            transaction = transaction_map[values["id"]]
            for field in (
                "category",
                "debit_account",
                "credit_account",
                "accounting_history",
                "history_code",
            ):
                if field in values:
                    setattr(transaction, field, values[field] or None)
            transaction.classification_source = "Edição manual"
            transaction.confidence = 1
            transaction.version += 1
            transaction.updated_at = datetime.datetime.utcnow()
        batch.version += 1
        batch.updated_at = datetime.datetime.utcnow()
        self.session.commit()
        return self.get_batch(user_id, batch_id)

    def upsert_rule(
        self, user_id: int, values: dict[str, Any]
    ) -> ClassificationRule:
        term = values["search_term"].strip().upper()
        rule = (
            self.session.query(ClassificationRule)
            .filter_by(user_id=user_id, search_term=term)
            .first()
        )
        if rule is None:
            rule = ClassificationRule(
                user_id=user_id,
                search_term=term,
                times_applied=1,
            )
            self.session.add(rule)
        for field in (
            "category", "debit_account", "credit_account", "history_code"
        ):
            setattr(rule, field, values.get(field) or None)
        rule.updated_at = datetime.datetime.utcnow()
        self.session.commit()
        self.session.refresh(rule)
        return rule

    def delete_rule(self, user_id: int, rule_id: int) -> bool:
        rule = (
            self.session.query(ClassificationRule)
            .filter_by(id=rule_id, user_id=user_id)
            .first()
        )
        if rule is None:
            return False
        self.session.delete(rule)
        self.session.commit()
        return True

    def mark_exported(self, user_id: int, batch_id: int) -> None:
        batch = self.get_batch(user_id, batch_id)
        if batch is not None and batch.status == "processed":
            batch.status = "exported"
            batch.version += 1
            batch.updated_at = datetime.datetime.utcnow()
            self.session.commit()

