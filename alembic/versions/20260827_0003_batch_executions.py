"""Tabela de histórico de execuções de lote e impacto operacional.

Revision ID: 20260827_0003
Revises: 20260827_0002
Create Date: 2026-08-27
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0003"
down_revision: str | None = "20260827_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "batch_executions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("total_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("rules_matched", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ai_matched", sa.Integer(), server_default="0", nullable=False),
        sa.Column("hours_saved", sa.Numeric(precision=10, scale=2), server_default="0.00", nullable=False),
        sa.Column("financial_saved", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["batch_id"], ["classifier_batches.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_batch_executions_user_id", "batch_executions", ["user_id"]
    )
    op.create_index(
        "ix_batch_executions_user_created",
        "batch_executions",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade destrutivo bloqueado: preserve os logs de execução e auditoria contábil."
    )
