"""Contratos canônicos de lotes, conciliação, regras e exportação."""

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator


BatchStatus = Literal["uploaded", "processing", "processed", "failed", "exported"]
ExportFormat = Literal["dominio", "questor", "omie", "fortes", "xlsx", "excel", "csv", "html", "pdf"]


class TransactionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    position: int
    date: datetime.date
    original_description: str
    clean_description: str
    amount: float
    transaction_type: str
    category: str
    debit_account: str | None
    credit_account: str | None
    accounting_history: str
    history_code: str | None
    classification_source: str
    confidence: float = Field(ge=0, le=1)
    is_duplicate: bool
    version: int = Field(ge=1)


class BatchMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hours_saved: float = Field(ge=0)
    accuracy_percent: float = Field(ge=0, le=100)
    zero_cost_percent: float = Field(ge=0, le=100)


class BatchRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    source_filename: str
    source_format: str
    status: BatchStatus
    total_transactions: int = Field(ge=0)
    duplicate_transactions: int = Field(ge=0)
    processed_transactions: int = Field(ge=0)
    version: int = Field(ge=1)
    created_at: datetime.datetime
    updated_at: datetime.datetime
    processed_at: datetime.datetime | None
    error_message: str | None
    metrics: BatchMetrics
    transactions: list[TransactionRead]


class ProcessBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batch_id: int = Field(gt=0)


class TransactionPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int = Field(gt=0)
    version: int = Field(ge=1)
    category: StrictStr | None = Field(default=None, min_length=1, max_length=100)
    debit_account: StrictStr | None = Field(default=None, max_length=50)
    credit_account: StrictStr | None = Field(default=None, max_length=50)
    accounting_history: StrictStr | None = Field(default=None, min_length=1, max_length=1000)
    history_code: StrictStr | None = Field(default=None, max_length=50)

    @field_validator(
        "category",
        "debit_account",
        "credit_account",
        "accounting_history",
        "history_code",
    )
    @classmethod
    def strip_text(cls, value: str | None, info) -> str | None:
        if value is None and info.field_name in {"category", "accounting_history"}:
            raise ValueError("campo não pode ser nulo")
        return value.strip() if value is not None else None


class TransactionsPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batch_version: int = Field(ge=1)
    transactions: list[TransactionPatch] = Field(min_length=1, max_length=500)


class RuleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    search_term: StrictStr = Field(min_length=2, max_length=255)
    category: StrictStr = Field(min_length=1, max_length=100)
    debit_account: StrictStr | None = Field(default=None, max_length=50)
    credit_account: StrictStr | None = Field(default=None, max_length=50)
    history_code: StrictStr | None = Field(default=None, max_length=50)

    @field_validator(
        "search_term", "category", "debit_account", "credit_account", "history_code"
    )
    @classmethod
    def strip_rule_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class RuleRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    search_term: str
    category: str
    debit_account: str | None
    credit_account: str | None
    history_code: str | None
    times_applied: int = Field(ge=0)
    created_at: datetime.datetime
    updated_at: datetime.datetime


class RuleListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rules: list[RuleRead]


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batch_id: int = Field(gt=0)
    format: ExportFormat


class TopCategoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    total: float
    count: int
    percentage: float


class BatchHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    source_filename: str
    source_format: str
    status: BatchStatus
    total_transactions: int = Field(ge=0)
    duplicate_transactions: int = Field(ge=0)
    processed_transactions: int = Field(ge=0)
    version: int = Field(ge=1)
    created_at: datetime.datetime
    updated_at: datetime.datetime
    processed_at: datetime.datetime | None
    period_start: datetime.date | None
    period_end: datetime.date | None
    total_income: float
    total_expenses: float
    net_balance: float
    average_confidence: float = Field(ge=0, le=100)
    review_count: int = Field(ge=0)
    hours_saved: float = Field(ge=0)
    financial_saved: float = Field(ge=0)
    top_categories: list[TopCategoryItem] = Field(default_factory=list)


class BatchHistoryListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batches: list[BatchHistoryItem]
    total: int

