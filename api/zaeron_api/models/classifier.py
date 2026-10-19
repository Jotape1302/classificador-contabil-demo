"""Modelos de lotes, transações, regras de classificação e auditoria contábil."""

import datetime
import hashlib
from typing import Any, Union

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from api.zaeron_api.core.database import Base


def calculate_transaction_hash(
    user_id: int,
    date_val: Union[datetime.date, datetime.datetime, str],
    amount: float,
    clean_description: str,
) -> str:
    """
    Gera o hash MD5 único da transação para prevenção de duplicidade.
    Assinatura: MD5(user_id + str(date) + str(round(amount, 2)) + clean_description)
    """
    dt_str = ""
    if isinstance(date_val, (datetime.date, datetime.datetime)):
        dt_str = date_val.strftime("%Y-%m-%d")
    elif isinstance(date_val, str):
        dt_raw = date_val.strip()
        if "/" in dt_raw:
            parts = dt_raw.split("/")
            if len(parts) == 3:
                dt_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            else:
                dt_str = dt_raw
        else:
            dt_str = dt_raw
    else:
        dt_str = str(date_val).strip()

    amt_str = f"{round(float(amount), 2):.2f}"
    desc_str = str(clean_description or "").strip().upper()

    raw_payload = f"{user_id}_{dt_str}_{amt_str}_{desc_str}"
    return hashlib.md5(raw_payload.encode("utf-8"), usedforsecurity=False).hexdigest()


class ClassificationRule(Base):
    """
    Tabela de Memória e Aprendizado Contínuo do Escritório.
    Armazena termos higienizados associados a categorias, contas e históricos contábeis.
    """

    __tablename__ = "classification_rules"
    __table_args__ = (
        UniqueConstraint("user_id", "search_term", name="uq_user_search_term"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    search_term = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    debit_account = Column(String(50), nullable=True)
    credit_account = Column(String(50), nullable=True)
    history_code = Column(String(50), nullable=True)
    times_applied = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    user = relationship("User", back_populates="classification_rules")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "search_term": self.search_term,
            "category": self.category,
            "debit_account": self.debit_account,
            "credit_account": self.credit_account,
            "history_code": self.history_code,
            "times_applied": self.times_applied,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ProcessedTransaction(Base):
    """
    Tabela de Auditoria e Prevenção de Duplicidade.
    Registra transações processadas com hash MD5 único por usuário, data, valor e descrição.
    """

    __tablename__ = "processed_transactions"
    __table_args__ = (
        Index("ix_processed_tx_user_hash", "user_id", "transaction_hash"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    transaction_hash = Column(String(64), nullable=False)
    file_name = Column(String(255), nullable=True)
    date = Column(Date, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="processed_transactions")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "transaction_hash": self.transaction_hash,
            "file_name": self.file_name,
            "date": self.date.isoformat() if self.date else None,
            "amount": float(self.amount) if self.amount is not None else 0.0,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ClassifierBatch(Base):
    __tablename__ = "classifier_batches"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "file_sha256",
            name="uq_classifier_batch_user_file_sha256",
        ),
        CheckConstraint(
            "status IN ('uploaded', 'processing', 'processed', 'failed', 'exported')",
            name="ck_classifier_batch_status",
        ),
        Index("ix_classifier_batches_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_filename = Column(String(255), nullable=False)
    source_format = Column(String(16), nullable=False)
    file_sha256 = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False, default="uploaded")
    total_transactions = Column(Integer, nullable=False, default=0)
    duplicate_transactions = Column(Integer, nullable=False, default=0)
    processed_transactions = Column(Integer, nullable=False, default=0)
    processing_stats_json = Column(Text, nullable=True)
    error_message = Column(String(500), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
    processed_at = Column(DateTime, nullable=True)

    transactions = relationship(
        "ClassifierBatchTransaction",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="ClassifierBatchTransaction.position",
    )


class ClassifierBatchTransaction(Base):
    __tablename__ = "classifier_batch_transactions"
    __table_args__ = (
        UniqueConstraint(
            "batch_id",
            "position",
            name="uq_classifier_batch_transaction_position",
        ),
        CheckConstraint("version >= 1", name="ck_classifier_transaction_version"),
        Index(
            "ix_classifier_batch_transactions_batch_hash",
            "batch_id",
            "transaction_hash",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(
        Integer,
        ForeignKey("classifier_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, nullable=False)
    transaction_hash = Column(String(64), nullable=False)
    date = Column(Date, nullable=False)
    original_description = Column(Text, nullable=False)
    clean_description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(16), nullable=False)
    category = Column(String(100), nullable=False, default="Pendente")
    debit_account = Column(String(50), nullable=True)
    credit_account = Column(String(50), nullable=True)
    accounting_history = Column(Text, nullable=False)
    history_code = Column(String(50), nullable=True)
    classification_source = Column(
        String(100), nullable=False, default="Não classificado"
    )
    confidence = Column(Numeric(5, 4), nullable=False, default=0)
    is_duplicate = Column(Boolean, nullable=False, default=False)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    batch = relationship("ClassifierBatch", back_populates="transactions")


class BatchExecution(Base):
    __tablename__ = "batch_executions"
    __table_args__ = (
        Index("ix_batch_executions_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_id = Column(
        Integer,
        ForeignKey("classifier_batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    total_rows = Column(Integer, nullable=False, default=0)
    rules_matched = Column(Integer, nullable=False, default=0)
    ai_matched = Column(Integer, nullable=False, default=0)
    hours_saved = Column(Numeric(10, 2), nullable=False, default=0.0)
    financial_saved = Column(Numeric(15, 2), nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)

    user = relationship("User", backref="batch_executions")
    batch = relationship("ClassifierBatch", backref="executions")


__all__ = [
    "ClassificationRule",
    "ProcessedTransaction",
    "ClassifierBatch",
    "ClassifierBatchTransaction",
    "BatchExecution",
    "calculate_transaction_hash",
]
