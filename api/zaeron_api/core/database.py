"""Engine, Base e fábrica de sessões exclusivos da API Zaeron."""

import contextlib
import logging
from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from api.zaeron_api.core.config import get_settings

logger = logging.getLogger("zaeron_database")

Base = declarative_base()

settings = get_settings()
engine_options: dict = {
    "pool_pre_ping": True,
}
if not settings.database_url.startswith("sqlite"):
    engine_options.update(pool_size=10, max_overflow=20, pool_recycle=300)

engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

_RLS_USER_ID_KEY = "zaeron_rls_user_id"


@event.listens_for(Session, "after_begin")
def _reapply_rls_user_context(
    session: Session,
    transaction,
    connection,
) -> None:
    """Reaplica o tenant como SET LOCAL em toda nova transação PostgreSQL."""
    del transaction
    user_id = session.info.get(_RLS_USER_ID_KEY)
    if user_id is None or connection.dialect.name != "postgresql":
        return
    connection.execute(
        text("SELECT set_config('app.current_user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )


def set_rls_user_context(session: Session, user_id: int) -> None:
    """Vincula a sessão ao tenant e protege também transações pós-commit."""
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id de contexto RLS deve ser um inteiro positivo")

    session.info[_RLS_USER_ID_KEY] = user_id
    bind = session.get_bind()
    if bind.dialect.name != "postgresql":
        return

    # Se a transação já começou (ex.: lookup do JWT), SET LOCAL deve ser aplicado
    # imediatamente. O listener acima cobre cada transação iniciada depois disso.
    session.execute(
        text("SELECT set_config('app.current_user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )


@contextlib.contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager para sessões de banco de dados."""
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db(target_engine=None) -> bool:
    """Inicializa tabelas do banco de dados a partir do Base.metadata."""
    eng = target_engine or engine
    try:
        from api.zaeron_api.models import academy, classifier, users  # noqa: F401

        Base.metadata.create_all(bind=eng)
        logger.info("Tabelas do banco de dados verificadas/criadas com sucesso.")
        return True
    except Exception as e:
        logger.error(f"Falha ao inicializar o banco de dados: {e}")
        return False


__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db_context",
    "init_db",
    "set_rls_user_context",
]
