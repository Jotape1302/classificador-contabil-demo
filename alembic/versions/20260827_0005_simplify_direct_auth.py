"""Ajuste de schema para cadastro direto sem endereço obrigatório e verificação imediata.

Revision ID: 20260827_0005
Revises: 20260827_0004
Create Date: 2026-08-27
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260827_0005"
down_revision: str | None = "20260827_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("postal_code", nullable=True, server_default=None)
        batch_op.alter_column("street", nullable=True, server_default=None)
        batch_op.alter_column("neighborhood", nullable=True, server_default=None)
        batch_op.alter_column("city", nullable=True, server_default=None)
        batch_op.alter_column("state", nullable=True, server_default=None)
        batch_op.alter_column("number", nullable=True, server_default=None)
        batch_op.alter_column("is_verified", server_default=sa.true())


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("is_verified", server_default=sa.false())
        batch_op.alter_column("number", nullable=False, server_default="S/N")
        batch_op.alter_column("state", nullable=False, server_default="SP")
        batch_op.alter_column("city", nullable=False, server_default="Não informada")
        batch_op.alter_column("neighborhood", nullable=False, server_default="Não informado")
        batch_op.alter_column("street", nullable=False, server_default="Não informado")
        batch_op.alter_column("postal_code", nullable=False, server_default="00000-000")
