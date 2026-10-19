"""Atualização do schema de usuários para onboarding qualificado e tabela OTP.

Revision ID: 20260827_0004
Revises: 20260827_0003
Create Date: 2026-08-27
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0004"
down_revision: str | None = "20260827_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Reset/Limpeza de usuários legados incompletos (sem documento ou endereço)
    # A exclusão em cascata é suportada pelas FKs com ondelete CASCADE.
    op.execute(
        """
        DELETE FROM users
        WHERE id IN (
            SELECT id FROM users
            WHERE email NOT LIKE '%@zaeron.production%' AND id NOT IN (
                SELECT user_id FROM office_profiles WHERE custom_rules IS NOT NULL AND custom_rules != '' AND custom_rules != '{"regras": []}'
            )
        )
        """
    )

    # 2. Adição dos campos de qualificação e limites na tabela users
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("document_number", sa.String(length=18), nullable=False, server_default="00000000000")
        )
        batch_op.add_column(
            sa.Column("postal_code", sa.String(length=9), nullable=False, server_default="00000-000")
        )
        batch_op.add_column(
            sa.Column("street", sa.String(length=255), nullable=False, server_default="Não informado")
        )
        batch_op.add_column(
            sa.Column("neighborhood", sa.String(length=100), nullable=False, server_default="Não informado")
        )
        batch_op.add_column(
            sa.Column("city", sa.String(length=100), nullable=False, server_default="Não informada")
        )
        batch_op.add_column(
            sa.Column("state", sa.String(length=2), nullable=False, server_default="SP")
        )
        batch_op.add_column(
            sa.Column("number", sa.String(length=20), nullable=False, server_default="S/N")
        )
        batch_op.add_column(
            sa.Column("complement", sa.String(length=100), nullable=True)
        )
        batch_op.add_column(
            sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column("plan_tier", sa.String(length=20), nullable=False, server_default="free")
        )
        batch_op.add_column(
            sa.Column("monthly_usage_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column(
                "usage_reset_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP + INTERVAL '30 days'"),
                nullable=False,
            )
        )
        batch_op.create_index("ix_users_document_number", ["document_number"], unique=True)

    # 3. Tabela de verificação OTP (email_verifications)
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_verifications_email", "email_verifications", ["email"])


def downgrade() -> None:
    op.drop_index("ix_email_verifications_email", table_name="email_verifications")
    op.drop_table("email_verifications")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_document_number")
        batch_op.drop_column("usage_reset_at")
        batch_op.drop_column("monthly_usage_count")
        batch_op.drop_column("plan_tier")
        batch_op.drop_column("is_verified")
        batch_op.drop_column("complement")
        batch_op.drop_column("number")
        batch_op.drop_column("state")
        batch_op.drop_column("city")
        batch_op.drop_column("neighborhood")
        batch_op.drop_column("street")
        batch_op.drop_column("postal_code")
        batch_op.drop_column("document_number")
