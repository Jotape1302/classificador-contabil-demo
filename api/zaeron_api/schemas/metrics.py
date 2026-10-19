"""Contratos Pydantic estritos para métricas financeiras e operacionais."""

from pydantic import BaseModel, ConfigDict, Field


class FinancialSummary(BaseModel):
    """Resumo financeiro das transações contábeis."""

    model_config = ConfigDict(extra="forbid")

    total_expenses: float = Field(
        ge=0,
        description="Total de despesas/saídas monetárias em R$",
    )
    total_income: float = Field(
        ge=0,
        description="Total de receitas/entradas monetárias em R$",
    )
    net_balance: float = Field(
        description="Saldo líquido (entradas - despesas) em R$",
    )
    average_ticket: float = Field(
        ge=0,
        description="Ticket médio absoluto das transações em R$",
    )
    total_transactions: int = Field(
        ge=0,
        description="Quantidade total de transações computadas no resumo financeiro",
    )


class OperationalImpact(BaseModel):
    """Impacto operacional e métricas de eficiência do classificador."""

    model_config = ConfigDict(extra="forbid")

    hours_saved: float = Field(
        ge=0,
        description="Horas economizadas com automação contábil",
    )
    financial_savings: float = Field(
        ge=0,
        description="Economia financeira em R$ calculada a R$ 11,00/hora",
    )
    accuracy_percent: float = Field(
        ge=0,
        le=100,
        description="Percentual de assertividade (transações com confiança >= 80%)",
    )
    zero_cost_percent: float = Field(
        ge=0,
        le=100,
        description="Percentual de execuções por regras operacionais locais",
    )
    total_processed_transactions: int = Field(
        ge=0,
        description="Quantidade de transações processadas analisadas",
    )


class BatchMetricsResponse(BaseModel):
    """Métricas detalhadas de um lote específico do classificador."""

    model_config = ConfigDict(extra="forbid")

    batch_id: int = Field(gt=0, description="Identificador único do lote")
    source_filename: str = Field(description="Nome do arquivo de origem")
    status: str = Field(description="Status atual do lote")
    total_transactions: int = Field(ge=0, description="Total de transações no lote")
    duplicate_transactions: int = Field(ge=0, description="Transações duplicadas identificadas")
    processed_transactions: int = Field(ge=0, description="Transações processadas")
    financial: FinancialSummary
    impact: OperationalImpact


class MetricsSummaryResponse(BaseModel):
    """Métricas consolidadas globais de todos os lotes do usuário."""

    model_config = ConfigDict(extra="forbid")

    total_batches: int = Field(ge=0, description="Quantidade total de lotes importados")
    total_transactions: int = Field(ge=0, description="Total acumulado de transações")
    duplicate_transactions: int = Field(ge=0, description="Total acumulado de transações duplicadas")
    processed_transactions: int = Field(ge=0, description="Total acumulado de transações processadas")
    financial: FinancialSummary
    impact: OperationalImpact


class ImpactKPISummary(BaseModel):
    """Resumo de KPIs de impacto e ROI operacional."""

    model_config = ConfigDict(extra="forbid")

    hours_saved: float = Field(
        ge=0,
        description="Tempo total economizado em horas no período",
    )
    financial_saved: float = Field(
        ge=0,
        description="Economia financeira gerada em R$ no período",
    )
    total_reconciled: int = Field(
        ge=0,
        description="Total de lançamentos conciliados no período",
    )
    zero_cost_percent: float = Field(
        ge=0,
        le=100,
        description="Taxa de aplicação de regras operacionais (%) no período",
    )
    hourly_rate: float = Field(
        default=11.0,
        ge=0,
        description="Taxa horária contábil configurada em R$/h",
    )


class ImpactTimeSeriesPoint(BaseModel):
    """Ponto de série temporal da evolução da economia."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(description="Data ou identificador do ponto (ex: '2026-08-25', '2026-08', etc.)")
    label: str = Field(description="Rótulo formatado para o eixo do gráfico (ex: '25/08', 'Ago/26', etc.)")
    hours_saved: float = Field(ge=0, description="Horas economizadas no ponto temporal")
    financial_saved: float = Field(ge=0, description="Economia em R$ no ponto temporal")
    total_rows: int = Field(ge=0, description="Total de lançamentos conciliados no ponto temporal")


class BatchExecutionItem(BaseModel):
    """Item do histórico de lotes/execuções processados."""

    model_config = ConfigDict(extra="forbid")

    id: int = Field(description="ID do registro de execução")
    batch_id: int | None = Field(default=None, description="ID do lote associado")
    filename: str = Field(description="Nome do arquivo ou extrato")
    total_rows: int = Field(ge=0, description="Quantidade de linhas processadas")
    rules_matched: int = Field(ge=0, description="Linhas resolvidas por regras locais")
    ai_matched: int = Field(ge=0, description="Linhas resolvidas por IA")
    hours_saved: float = Field(ge=0, description="Tempo poupado em horas")
    financial_saved: float = Field(ge=0, description="Valor economizado em R$")
    zero_cost_percent: float = Field(ge=0, le=100, description="Taxa de aplicação de regras operacionais do lote")
    created_at: str = Field(description="Data e hora de processamento em formato ISO")


class ImpactMetricsResponse(BaseModel):
    """Resposta consolidada da tela de Impacto & ROI Operacional."""

    model_config = ConfigDict(extra="forbid")

    period: str = Field(description="Período selecionado: week, month, year ou all")
    kpis: ImpactKPISummary
    time_series: list[ImpactTimeSeriesPoint]
    history: list[BatchExecutionItem]


__all__ = [
    "FinancialSummary",
    "OperationalImpact",
    "BatchMetricsResponse",
    "MetricsSummaryResponse",
    "ImpactKPISummary",
    "ImpactTimeSeriesPoint",
    "BatchExecutionItem",
    "ImpactMetricsResponse",
]

