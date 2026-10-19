"""Lotes persistentes e transações do classificador.

Revision ID: 20260827_0002
Revises: 20260827_0001
Create Date: 2026-08-27
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0002"
down_revision: str | None = "20260827_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "classifier_batches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("source_format", sa.String(length=16), nullable=False),
        sa.Column("file_sha256", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="uploaded", nullable=False),
        sa.Column("total_transactions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("duplicate_transactions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("processed_transactions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("processing_stats_json", sa.Text(), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('uploaded', 'processing', 'processed', 'failed', 'exported')",
            name="ck_classifier_batch_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "file_sha256",
            name="uq_classifier_batch_user_file_sha256",
        ),
    )
    op.create_index(
        "ix_classifier_batches_user_id", "classifier_batches", ["user_id"]
    )
    op.create_index(
        "ix_classifier_batches_user_created",
        "classifier_batches",
        ["user_id", "created_at"],
    )

    op.create_table(
        "classifier_batch_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("transaction_hash", sa.String(length=64), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("original_description", sa.Text(), nullable=False),
        sa.Column("clean_description", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("transaction_type", sa.String(length=16), nullable=False),
        sa.Column("category", sa.String(length=100), server_default="Pendente", nullable=False),
        sa.Column("debit_account", sa.String(length=50), nullable=True),
        sa.Column("credit_account", sa.String(length=50), nullable=True),
        sa.Column("accounting_history", sa.Text(), nullable=False),
        sa.Column("history_code", sa.String(length=50), nullable=True),
        sa.Column(
            "classification_source",
            sa.String(length=100),
            server_default="Não classificado",
            nullable=False,
        ),
        sa.Column("confidence", sa.Numeric(precision=5, scale=4), server_default="0", nullable=False),
        sa.Column("is_duplicate", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("version >= 1", name="ck_classifier_transaction_version"),
        sa.ForeignKeyConstraint(
            ["batch_id"], ["classifier_batches.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "batch_id",
            "position",
            name="uq_classifier_batch_transaction_position",
        ),
    )
    op.create_index(
        "ix_classifier_batch_transactions_batch_id",
        "classifier_batch_transactions",
        ["batch_id"],
    )
    op.create_index(
        "ix_classifier_batch_transactions_batch_hash",
        "classifier_batch_transactions",
        ["batch_id", "transaction_hash"],
    )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade destrutivo bloqueado: preserve os lotes e a auditoria contábil."
    )
