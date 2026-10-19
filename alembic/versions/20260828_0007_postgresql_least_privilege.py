"""Aplica least privilege à role runtime e fecha a lacuna RLS da tabela filha.

Revision ID: 20260828_0007
Revises: 20260827_0006
Create Date: 2026-08-28
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260828_0007"
down_revision: str | None = "20260827_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_APPLICATION_TABLES = (
    "academy_certificates",
    "academy_lesson_progress",
    "academy_lesson_quiz_attempts",
    "academy_quiz_attempts",
    "batch_executions",
    "classification_rules",
    "classifier_batch_transactions",
    "classifier_batches",
    "email_verifications",
    "office_profiles",
    "processed_transactions",
    "usage_logs",
    "users",
)


def _quoted(identifier: str) -> str:
    return op.get_bind().dialect.identifier_preparer.quote(identifier)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    role_exists = bind.execute(
        sa.text("SELECT 1 FROM pg_roles WHERE rolname = 'zaeron_app'")
    ).scalar()
    if role_exists != 1:
        raise RuntimeError(
            "A role zaeron_app deve existir com credencial definida pelo operador."
        )

    current_database = str(
        bind.execute(sa.text("SELECT current_database()")).scalar_one()
    )
    application_database = _quoted(current_database)

    # Database e schema: somente conexão ao database da aplicação e USAGE no schema.
    op.execute(
        f"REVOKE CONNECT, TEMPORARY ON DATABASE {application_database} FROM PUBLIC"
    )
    op.execute(
        f"REVOKE ALL PRIVILEGES ON DATABASE {application_database} FROM zaeron_app"
    )
    op.execute(f"GRANT CONNECT ON DATABASE {application_database} TO zaeron_app")
    op.execute("REVOKE CREATE ON SCHEMA public FROM zaeron_app")
    op.execute("GRANT USAGE ON SCHEMA public TO zaeron_app")

    postgres_database_exists = bind.execute(
        sa.text("SELECT 1 FROM pg_database WHERE datname = 'postgres'")
    ).scalar()
    if postgres_database_exists == 1:
        op.execute("REVOKE CONNECT, TEMPORARY ON DATABASE postgres FROM PUBLIC")
        op.execute("REVOKE ALL PRIVILEGES ON DATABASE postgres FROM zaeron_app")

    # Objetos atuais: DML apenas nas tabelas da aplicação; migration table é admin-only.
    op.execute(
        "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM zaeron_app"
    )
    table_list = ", ".join(f"public.{_quoted(name)}" for name in _APPLICATION_TABLES)
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{table_list} TO zaeron_app"
    )
    op.execute("REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM zaeron_app")

    # nextval de serial/identity exige USAGE; setval/UPDATE e leitura direta não são usados.
    op.execute(
        "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM zaeron_app"
    )
    op.execute("GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO zaeron_app")

    # Novos objetos criados por migrations herdam exatamente o mesmo conjunto mínimo.
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON TABLES FROM zaeron_app"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zaeron_app"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON SEQUENCES FROM zaeron_app"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "GRANT USAGE ON SEQUENCES TO zaeron_app"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE zaeron_admin IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON FUNCTIONS FROM zaeron_app"
    )

    # A tabela filha não possui user_id; a policy deriva o tenant pelo lote pai.
    op.execute(
        "ALTER TABLE public.classifier_batch_transactions ENABLE ROW LEVEL SECURITY"
    )
    op.execute(
        "ALTER TABLE public.classifier_batch_transactions FORCE ROW LEVEL SECURITY"
    )
    policy_exists = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_policy p "
            "JOIN pg_class c ON c.oid = p.polrelid "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' "
            "AND c.relname = 'classifier_batch_transactions' "
            "AND p.polname = 'user_isolation_policy'"
        )
    ).scalar()
    if policy_exists != 1:
        op.execute(
            "CREATE POLICY user_isolation_policy "
            "ON public.classifier_batch_transactions "
            "FOR ALL TO PUBLIC "
            "USING (EXISTS ("
            "SELECT 1 FROM public.classifier_batches parent_batch "
            "WHERE parent_batch.id = classifier_batch_transactions.batch_id "
            "AND parent_batch.user_id = "
            "NULLIF(current_setting('app.current_user_id', true), '')::integer"
            ")) "
            "WITH CHECK (EXISTS ("
            "SELECT 1 FROM public.classifier_batches parent_batch "
            "WHERE parent_batch.id = classifier_batch_transactions.batch_id "
            "AND parent_batch.user_id = "
            "NULLIF(current_setting('app.current_user_id', true), '')::integer"
            "))"
        )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade de least privilege bloqueado: não restaure grants administrativos."
    )
