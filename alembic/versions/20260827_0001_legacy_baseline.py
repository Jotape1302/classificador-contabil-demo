"""Baseline das nove tabelas legadas da Zaeron.

Revision ID: 20260827_0001
Revises: None
Create Date: 2026-08-27
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("office_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "office_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("erp_system", sa.String(length=100), nullable=True),
        sa.Column("client_range", sa.String(length=50), nullable=True),
        sa.Column("custom_rules", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_office_profiles_user_id", "office_profiles", ["user_id"], unique=True
    )

    op.create_table(
        "usage_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("transactions_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_logs_user_id", "usage_logs", ["user_id"])

    op.create_table(
        "classification_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("search_term", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("debit_account", sa.String(length=50), nullable=True),
        sa.Column("credit_account", sa.String(length=50), nullable=True),
        sa.Column("history_code", sa.String(length=50), nullable=True),
        sa.Column("times_applied", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "search_term", name="uq_user_search_term"),
    )
    op.create_index(
        "ix_classification_rules_search_term",
        "classification_rules",
        ["search_term"],
    )
    op.create_index(
        "ix_classification_rules_user_id", "classification_rules", ["user_id"]
    )

    op.create_table(
        "processed_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("transaction_hash", sa.String(length=64), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_processed_transactions_transaction_hash",
        "processed_transactions",
        ["transaction_hash"],
    )
    op.create_index(
        "ix_processed_transactions_user_id",
        "processed_transactions",
        ["user_id"],
    )
    op.create_index(
        "ix_processed_tx_user_hash",
        "processed_transactions",
        ["user_id", "transaction_hash"],
    )

    op.create_table(
        "academy_lesson_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_key", sa.String(length=100), nullable=False),
        sa.Column("course_version", sa.String(length=32), nullable=False),
        sa.Column("lesson_key", sa.String(length=100), nullable=False),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("last_accessed_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "course_key",
            "course_version",
            "lesson_key",
            name="uq_academy_progress_user_course_version_lesson",
        ),
    )
    op.create_index(
        "ix_academy_lesson_progress_user_id",
        "academy_lesson_progress",
        ["user_id"],
    )
    op.create_index(
        "ix_academy_progress_user_course_version",
        "academy_lesson_progress",
        ["user_id", "course_key", "course_version"],
    )

    op.create_table(
        "academy_quiz_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_key", sa.String(length=100), nullable=False),
        sa.Column("course_version", sa.String(length=32), nullable=False),
        sa.Column("attempt_token", sa.String(length=64), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("correct_answers", sa.Integer(), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("answers_json", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_token", name="uq_academy_quiz_attempt_token"),
    )
    op.create_index(
        "ix_academy_quiz_attempts_user_id", "academy_quiz_attempts", ["user_id"]
    )
    op.create_index(
        "ix_academy_quiz_user_course_version",
        "academy_quiz_attempts",
        ["user_id", "course_key", "course_version"],
    )

    op.create_table(
        "academy_lesson_quiz_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_key", sa.String(length=100), nullable=False),
        sa.Column("course_version", sa.String(length=32), nullable=False),
        sa.Column("lesson_key", sa.String(length=100), nullable=False),
        sa.Column("attempt_token", sa.String(length=64), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("correct_answers", sa.Integer(), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("answers_json", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "attempt_token", name="uq_academy_lesson_quiz_attempt_token"
        ),
    )
    op.create_index(
        "ix_academy_lesson_quiz_attempts_user_id",
        "academy_lesson_quiz_attempts",
        ["user_id"],
    )
    op.create_index(
        "ix_academy_lesson_quiz_user_course_version_lesson",
        "academy_lesson_quiz_attempts",
        ["user_id", "course_key", "course_version", "lesson_key"],
    )

    op.create_table(
        "academy_certificates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("attempt_id", sa.Integer(), nullable=True),
        sa.Column("public_code", sa.String(length=64), nullable=False),
        sa.Column("course_key", sa.String(length=100), nullable=False),
        sa.Column("course_version", sa.String(length=32), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("course_title", sa.String(length=255), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("issued_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["attempt_id"], ["academy_quiz_attempts.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "public_code", name="uq_academy_certificate_public_code"
        ),
        sa.UniqueConstraint(
            "user_id",
            "course_key",
            "course_version",
            name="uq_academy_certificate_user_course_version",
        ),
    )
    op.create_index(
        "ix_academy_certificates_attempt_id",
        "academy_certificates",
        ["attempt_id"],
    )
    op.create_index(
        "ix_academy_certificates_user_id",
        "academy_certificates",
        ["user_id"],
    )


    op.create_index(
        "ix_academy_certificate_public_code",
        "academy_certificates",
        ["public_code"],
    )

def downgrade() -> None:
    raise RuntimeError(
        "Downgrade destrutivo da baseline bloqueado: preserve as tabelas legadas."
    )
