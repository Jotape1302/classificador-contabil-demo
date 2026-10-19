"""Testes focados no contexto transacional usado pelas policies RLS."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from api.zaeron_api.core.database import (
    _RLS_USER_ID_KEY,
    _reapply_rls_user_context,
    set_rls_user_context,
)


def test_set_rls_user_context_is_a_safe_noop_for_sqlite(session_factory):
    session = session_factory()
    try:
        set_rls_user_context(session, 42)
        assert session.info[_RLS_USER_ID_KEY] == 42
    finally:
        session.close()


@pytest.mark.parametrize("invalid_user_id", [0, -1, True, "42", None])
def test_set_rls_user_context_rejects_invalid_ids(session_factory, invalid_user_id):
    session = session_factory()
    try:
        with pytest.raises(ValueError):
            set_rls_user_context(session, invalid_user_id)
    finally:
        session.close()


def test_rls_context_is_reapplied_on_every_postgresql_transaction():
    session = SimpleNamespace(info={_RLS_USER_ID_KEY: 42})
    connection = MagicMock()
    connection.dialect.name = "postgresql"

    _reapply_rls_user_context(session, object(), connection)

    statement, parameters = connection.execute.call_args.args
    assert "set_config('app.current_user_id'" in str(statement)
    assert parameters == {"user_id": "42"}


def test_rls_listener_does_not_emit_postgresql_sql_for_sqlite():
    session = SimpleNamespace(info={_RLS_USER_ID_KEY: 42})
    connection = MagicMock()
    connection.dialect.name = "sqlite"

    _reapply_rls_user_context(session, object(), connection)

    connection.execute.assert_not_called()
