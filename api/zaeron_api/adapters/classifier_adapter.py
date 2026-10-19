"""Adapta transações persistidas ao núcleo puro de classificação legado."""

from typing import Any, Callable

from api.zaeron_api.services.bank_cleaner import generate_accounting_history
from api.zaeron_api.services.classifier_engine import (
    classificar_transacoes_hibrido_puro,
)


def classify_transactions(
    transactions: list[Any],
    *,
    rules: list[dict[str, Any]],
    ai_classifier: Callable | None = None,
) -> tuple[list[dict[str, Any]], str, dict[str, Any], list[int]]:
    payload = [
        {
            "id": transaction.id,
            "Descricao_Original": transaction.original_description,
            "Descricao_Limpa": transaction.clean_description,
            "Valor": float(transaction.amount),
        }
        for transaction in transactions
        if not transaction.is_duplicate
    ]
    results, error, stats, applied_rule_ids = classificar_transacoes_hibrido_puro(
        payload,
        regras_banco=rules,
        ai_classifier=ai_classifier,
    )
    by_id = {transaction.id: transaction for transaction in transactions}
    updates = []
    for result in results:
        transaction = by_id[result["id"]]
        category = result["categoria"]
        updates.append(
            {
                "id": transaction.id,
                "category": category,
                "debit_account": result.get("debit_account") or None,
                "credit_account": result.get("credit_account") or None,
                "accounting_history": generate_accounting_history(
                    transaction.clean_description,
                    category,
                    is_saida=float(transaction.amount) < 0,
                ),
                # Código ERP permanece independente do texto narrativo acima.
                "history_code": result.get("history_code") or None,
                "classification_source": result["origem"],
                "confidence": float(result["confianca"]),
            }
        )
    return updates, error, stats, applied_rule_ids

