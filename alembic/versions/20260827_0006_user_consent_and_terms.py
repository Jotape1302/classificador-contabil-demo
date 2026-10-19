"""Adiciona campos de aceite de termos e consentimento LGPD na tabela users.

Revision ID: 20260827_0006
Revises: 20260827_0005
Create Date: 2026-08-28
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0006"
down_revision: str | None = "20260827_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("terms_accepted_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("privacy_accepted_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("terms_version", sa.String(length=20), nullable=True, server_default="1.0")
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("terms_version")
        batch_op.drop_column("privacy_accepted_at")
        batch_op.drop_column("terms_accepted_at")
