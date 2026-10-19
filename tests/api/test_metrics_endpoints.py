"""Testes de integração e unidade para as métricas da Zaeron API."""

import pytest

from api.zaeron_api.schemas.metrics import (
    BatchMetricsResponse,
    FinancialSummary,
    MetricsSummaryResponse,
    OperationalImpact,
)
from api.zaeron_api.services.metrics_service import MetricsService
from tests.api.test_classifier_adapters import OFX_BYTES


def _login(client, user):
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "senha-legada"},
    )
    assert response.status_code == 200


def _upload(client, content=OFX_BYTES, filename="extrato.ofx"):
    return client.post(
        "/api/classifier/upload",
        files={"file": (filename, content, "application/octet-stream")},
    )


def test_metrics_formulas_unit():
    # Horas economizadas: max(0.2, round(qtd * 0.025, 1)) se qtd > 0 senão 0.0
    assert MetricsService.calculate_hours_saved(0) == 0.0
    assert MetricsService.calculate_hours_saved(1) == 0.2
    assert MetricsService.calculate_hours_saved(5) == 0.2
    assert MetricsService.calculate_hours_saved(10) == 0.2
    assert MetricsService.calculate_hours_saved(20) == 0.5
    assert MetricsService.calculate_hours_saved(100) == 2.5

    # Economia em R$: round(horas * 11.0, 2)
    assert MetricsService.calculate_financial_savings(0.0) == 0.0
    assert MetricsService.calculate_financial_savings(0.2) == 2.2
    assert MetricsService.calculate_financial_savings(1.0) == 11.0
    assert MetricsService.calculate_financial_savings(2.0) == 22.0
    assert MetricsService.calculate_financial_savings(2.5) == 27.5
    assert MetricsService.calculate_financial_savings(3.1) == 34.1
    assert MetricsService.calculate_financial_savings(10.0) == 110.0
    assert MetricsService.calculate_financial_savings(3.125) == 34.38

    # Assertividade %: (qtd com confiança >= 0.80 / qtd_total) * 100
    assert MetricsService.calculate_accuracy_percent(0, 0) == 0.0
    assert MetricsService.calculate_accuracy_percent(8, 10) == 80.0
    assert MetricsService.calculate_accuracy_percent(1, 3) == 33.3

    # Taxa de regras operacionais %: (qtd executada localmente / qtd_total) * 100
    assert MetricsService.calculate_zero_cost_percent(0, 0) == 0.0
    assert MetricsService.calculate_zero_cost_percent(10, 10) == 100.0
    assert MetricsService.calculate_zero_cost_percent(3, 4) == 75.0


def test_get_batch_metrics_endpoint(client, legacy_user):
    _login(client, legacy_user)
    upload_res = _upload(client)
    assert upload_res.status_code == 201
    batch_id = upload_res.json()["id"]

    # 1. Antes de processar
    res_uploaded = client.get(f"/api/metrics/batches/{batch_id}")
    assert res_uploaded.status_code == 200
    data_up = res_uploaded.json()
    assert data_up["batch_id"] == batch_id
    assert data_up["status"] == "uploaded"
    assert data_up["total_transactions"] == 2
    assert data_up["financial"]["total_expenses"] == 518.9  # -450.00 e -68.90
    assert data_up["financial"]["total_income"] == 0.0
    assert data_up["financial"]["net_balance"] == -518.9
    assert data_up["financial"]["average_ticket"] == 259.45
    assert data_up["impact"]["hours_saved"] == 0.0
    assert data_up["impact"]["financial_savings"] == 0.0

    # 2. Processa o lote
    process_res = client.post("/api/classifier/process", json={"batch_id": batch_id})
    assert process_res.status_code == 200

    # 3. Depois de processar
    res_proc = client.get(f"/api/metrics/batches/{batch_id}")
    assert res_proc.status_code == 200
    data_proc = res_proc.json()
    assert data_proc["status"] == "processed"
    assert data_proc["processed_transactions"] == 2
    assert data_proc["impact"]["hours_saved"] == 0.2
    assert data_proc["impact"]["financial_savings"] == 2.2
    assert data_proc["impact"]["accuracy_percent"] == 100.0
    assert data_proc["impact"]["zero_cost_percent"] == 100.0
    assert data_proc["impact"]["total_processed_transactions"] == 2


def test_get_metrics_summary_endpoint(client, legacy_user):
    _login(client, legacy_user)
    # Upload e processamento do lote 1
    up1 = _upload(client)
    b1_id = up1.json()["id"]
    client.post("/api/classifier/process", json={"batch_id": b1_id})

    # Consulta sumário consolidado
    summary_res = client.get("/api/metrics/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()

    assert summary["total_batches"] == 1
    assert summary["total_transactions"] == 2
    assert summary["processed_transactions"] == 2
    assert summary["financial"]["total_expenses"] == 518.9
    assert summary["financial"]["total_income"] == 0.0
    assert summary["financial"]["net_balance"] == -518.9
    assert summary["financial"]["average_ticket"] == 259.45
    assert summary["impact"]["hours_saved"] == 0.2
    assert summary["impact"]["financial_savings"] == 2.2
    assert summary["impact"]["accuracy_percent"] == 100.0
    assert summary["impact"]["zero_cost_percent"] == 100.0


def test_batch_metrics_not_found_and_auth_protection(client, legacy_user):
    _login(client, legacy_user)
    # Lote inexistente retorna 404
    res_404 = client.get("/api/metrics/batches/999999")
    assert res_404.status_code == 404
    assert res_404.json()["code"] == "batch_not_found"

    # Logout e verificação de autenticação
    client.post("/api/auth/logout")
    res_batch_unauth = client.get("/api/metrics/batches/1")
    assert res_batch_unauth.status_code == 401

    res_summary_unauth = client.get("/api/metrics/summary")
    assert res_summary_unauth.status_code == 401

    res_impact_unauth = client.get("/api/metrics/impact")
    assert res_impact_unauth.status_code == 401


def test_get_impact_metrics_endpoint(client, legacy_user):
    _login(client, legacy_user)

    # 1. Antes de processar nenhum lote
    empty_res = client.get("/api/metrics/impact?period=month")
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["period"] == "month"
    assert empty_data["kpis"]["hours_saved"] == 0.0
    assert empty_data["kpis"]["financial_saved"] == 0.0
    assert empty_data["kpis"]["total_reconciled"] == 0
    assert empty_data["kpis"]["zero_cost_percent"] == 0.0
    assert empty_data["kpis"]["hourly_rate"] == 11.0
    assert len(empty_data["history"]) == 0
    assert len(empty_data["time_series"]) > 0

    # 2. Upload e processamento do lote
    up = _upload(client, filename="extrato_empresa_a.ofx")
    assert up.status_code == 201
    batch_id = up.json()["id"]

    proc = client.post("/api/classifier/process", json={"batch_id": batch_id})
    assert proc.status_code == 200

    # 3. Consulta métricas de impacto para "month"
    res_month = client.get("/api/metrics/impact?period=month")
    assert res_month.status_code == 200
    data_month = res_month.json()

    assert data_month["period"] == "month"
    assert data_month["kpis"]["hours_saved"] == 0.2
    assert data_month["kpis"]["financial_saved"] == 2.2
    assert data_month["kpis"]["total_reconciled"] == 2
    assert data_month["kpis"]["zero_cost_percent"] == 100.0
    assert data_month["kpis"]["hourly_rate"] == 11.0

    # Histórico contém o lote processado
    assert len(data_month["history"]) == 1
    item = data_month["history"][0]
    assert item["batch_id"] == batch_id
    assert item["filename"] == "extrato_empresa_a.ofx"
    assert item["total_rows"] == 2
    assert item["rules_matched"] == 2
    assert item["ai_matched"] == 0
    assert item["hours_saved"] == 0.2
    assert item["financial_saved"] == 2.2
    assert item["zero_cost_percent"] == 100.0

    # Série temporal possui o valor acumulado
    total_ts_hours = sum(p["hours_saved"] for p in data_month["time_series"])
    assert total_ts_hours == 0.2

    # 4. Consulta períodos: week, year, all
    for p in ("week", "year", "all"):
        res = client.get(f"/api/metrics/impact?period={p}")
        assert res.status_code == 200
        data = res.json()
        assert data["period"] == p
        assert data["kpis"]["total_reconciled"] == 2
        assert len(data["history"]) == 1


def test_impact_metrics_validation(client, legacy_user):
    _login(client, legacy_user)
    # Período inválido retorna 422
    res_inv = client.get("/api/metrics/impact?period=invalid_period")
    assert res_inv.status_code == 422

