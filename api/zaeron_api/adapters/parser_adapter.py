"""Adapta os parsers legados para transações JSON canônicas, sem acessar banco."""

import datetime
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import pandas as pd

from api.zaeron_api.adapters.parsers import (
    ler_extrato_csv,
    ler_extrato_ofx,
    ler_extrato_pdf,
)
from api.zaeron_api.models.classifier import calculate_transaction_hash


class UnsupportedStatementFormat(ValueError):
    pass


class StatementParseError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedStatement:
    source_format: str
    transactions: list[dict[str, Any]]


_PARSERS: dict[str, Callable] = {
    "csv": ler_extrato_csv,
    "ofx": ler_extrato_ofx,
    "pdf": ler_extrato_pdf,
}


def _optional_text(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = str(value).strip()
    return text or None


def dataframe_to_canonical(df: pd.DataFrame, *, user_id: int) -> list[dict[str, Any]]:
    """Converte as 12 colunas legadas sem confundir histórico e código ERP."""
    records: list[dict[str, Any]] = []
    for position, (_, row) in enumerate(df.iterrows()):
        date_text = str(row.get("Data", "")).strip()
        try:
            transaction_date = datetime.date.fromisoformat(date_text)
        except ValueError as exc:
            raise StatementParseError("O extrato contém uma data inválida.") from exc

        original_description = str(
            row.get("Descricao_Original") or row.get("Descrição") or ""
        ).strip()
        clean_description = str(
            row.get("Descricao_Limpa") or original_description
        ).strip()
        amount = round(float(row.get("Valor", 0.0)), 2)
        accounting_history = str(
            row.get("Historico") or clean_description
        ).strip()
        history_code = _optional_text(
            row.get("history_code") or row.get("Codigo_Historico")
        )
        transaction_hash = calculate_transaction_hash(
            user_id,
            transaction_date,
            amount,
            clean_description,
        )
        records.append(
            {
                "position": position,
                "transaction_hash": transaction_hash,
                "date": transaction_date,
                "original_description": original_description,
                "clean_description": clean_description,
                "amount": amount,
                "transaction_type": "Débito" if amount < 0 else "Crédito",
                "category": str(row.get("Categoria") or "Pendente"),
                "debit_account": _optional_text(row.get("Conta_Debito")),
                "credit_account": _optional_text(row.get("Conta_Credito")),
                "accounting_history": accounting_history,
                "history_code": history_code,
                "classification_source": str(
                    row.get("Origem") or "Não classificado"
                ),
                "confidence": float(row.get("Confianca") or 0.0),
            }
        )
    return records


def parse_statement(filename: str, content: bytes, *, user_id: int) -> ParsedStatement:
    suffix = Path(filename or "").suffix.lower().lstrip(".")
    parser = _PARSERS.get(suffix)
    if parser is None:
        raise UnsupportedStatementFormat("Formato permitido: OFX, CSV ou PDF.")
    dataframe, error = parser(content, user_id=None)
    if error or dataframe is None or dataframe.empty:
        raise StatementParseError(error or "Nenhuma transação foi encontrada no arquivo.")
    return ParsedStatement(
        source_format=suffix,
        transactions=dataframe_to_canonical(dataframe, user_id=user_id),
    )

