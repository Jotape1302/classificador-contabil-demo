"""Remove o EXECUTE global implícito de functions criadas por migrations.

Revision ID: 20260828_0008
Revises: 20260828_0007
Create Date: 2026-08-28
"""

from typing import Sequence

from alembic import op


revision: str = "20260828_0008"
down_revision: str | None = "20260828_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    # O EXECUTE em functions é concedido a PUBLIC no default global do PostgreSQL.
    # Uma revogação limitada ao schema não sobrescreve esse grant global.
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin "
        "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin "
        "REVOKE ALL PRIVILEGES ON FUNCTIONS FROM zaeron_app"
    )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade de least privilege bloqueado: não restaure EXECUTE para PUBLIC."
    )
