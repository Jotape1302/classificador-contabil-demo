"""Modelos de dados canônicos da API Zaeron."""

from api.zaeron_api.models.academy import (
    AcademyCertificate,
    AcademyLessonProgress,
    AcademyLessonQuizAttempt,
    AcademyQuizAttempt,
)
from api.zaeron_api.models.classifier import (
    BatchExecution,
    ClassificationRule,
    ClassifierBatch,
    ClassifierBatchTransaction,
    ProcessedTransaction,
    calculate_transaction_hash,
)
from api.zaeron_api.models.users import (
    EmailVerification,
    OfficeProfile,
    UsageLog,
    User,
)

__all__ = [
    "User",
    "EmailVerification",
    "OfficeProfile",
    "UsageLog",
    "ClassificationRule",
    "ProcessedTransaction",
    "ClassifierBatch",
    "ClassifierBatchTransaction",
    "BatchExecution",
    "AcademyLessonProgress",
    "AcademyQuizAttempt",
    "AcademyLessonQuizAttempt",
    "AcademyCertificate",
    "calculate_transaction_hash",
]
