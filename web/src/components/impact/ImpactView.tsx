import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckSquare,
  FileCheck,
  FileSpreadsheet,
  History,
  TrendingUp,
  X,
} from "lucide-react";
import { useImpactMetrics } from "../../hooks/use-classifier";
import type { ImpactPeriod, User } from "../../lib/types";
import { Skeleton } from "../ui/skeleton";
import { Sidebar } from "../classifier/Sidebar";
import { cn } from "../../lib/utils";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

const periodOptions: Array<{ id: ImpactPeriod; label: string }> = [
  { id: "week", label: "Esta Semana" },
  { id: "month", label: "Este Mês" },
  { id: "year", label: "Este Ano" },
  { id: "all", label: "Todo o Período" },
];

export function ImpactView({ user }: { user: User }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const periodFromUrl = (searchParams.get("period") as ImpactPeriod) || "month";
  const [period, setPeriod] = useState<ImpactPeriod>(
    ["week", "month", "year", "all"].includes(periodFromUrl) ? periodFromUrl : "month"
  );

  const impactQuery = useImpactMetrics(period);
  const data = impactQuery.data;
  const history = data?.history ?? [];
  const timeSeries = data?.time_series ?? [];

  // Parse selected batches from URL (?batches=1,2,3)
  const initialBatches = useMemo(() => {
    const raw = searchParams.get("batches");
    if (!raw) return new Set<number>();
    return new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0)
    );
  }, [searchParams]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(initialBatches);

  // Keep state in sync if URL search params change externally
  useEffect(() => {
    const raw = searchParams.get("batches");
    if (!raw) {
      if (selectedIds.size > 0) setSelectedIds(new Set());
      return;
    }
    const fromUrl = new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0)
    );
    setSelectedIds(fromUrl);
  }, [searchParams]);

  const updateSelectionUrl = (newSet: Set<number>, newPeriod = period) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("period", newPeriod);
    if (newSet.size > 0) {
      nextParams.set("batches", Array.from(newSet).join(","));
    } else {
      nextParams.delete("batches");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handlePeriodChange = (newPeriod: ImpactPeriod) => {
    setPeriod(newPeriod);
    updateSelectionUrl(selectedIds, newPeriod);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    updateSelectionUrl(next);
  };

  const handleSelectAll = () => {
    const allIds = new Set(history.map((h) => h.id));
    setSelectedIds(allIds);
    updateSelectionUrl(allIds);
  };

  const handleClearSelection = () => {
    const empty = new Set<number>();
    setSelectedIds(empty);
    updateSelectionUrl(empty);
  };

  const isSelectionActive = selectedIds.size > 0;
  const activeHistory = useMemo(() => {
    if (!isSelectionActive) return history;
    return history.filter((h) => selectedIds.has(h.id));
  }, [history, isSelectionActive, selectedIds]);

  // Recálculo determinístico de KPIs
  const kpis = useMemo(() => {
    const baseRate = data?.kpis?.hourly_rate || 11.0;
    if (!isSelectionActive) {
      const raw = data?.kpis ?? {
        hours_saved: 0.0,
        financial_saved: 0.0,
        total_reconciled: 0,
        zero_cost_percent: 0.0,
        hourly_rate: 11.0,
      };
      const calculatedFin = Number((raw.hours_saved * baseRate).toFixed(2));
      return {
        ...raw,
        hourly_rate: baseRate,
        financial_saved: calculatedFin,
      };
    }

    const totalReconciled = activeHistory.reduce((acc, h) => acc + h.total_rows, 0);
    const rulesMatched = activeHistory.reduce((acc, h) => acc + h.rules_matched, 0);
    const hoursSaved = Number(
      activeHistory.reduce((acc, h) => acc + h.hours_saved, 0).toFixed(1)
    );
    const financialSaved = Number((hoursSaved * baseRate).toFixed(2));
    const zeroCostPercent =
      totalReconciled > 0
        ? Number(((rulesMatched / totalReconciled) * 100).toFixed(1))
        : 0.0;

    return {
      hours_saved: hoursSaved,
      financial_saved: financialSaved,
      total_reconciled: totalReconciled,
      zero_cost_percent: zeroCostPercent,
      hourly_rate: baseRate,
    };
  }, [data?.kpis, isSelectionActive, activeHistory]);

  // Recálculo determinístico da Série Temporal / Gráfico
  const chartData = useMemo(() => {
    const hourlyRate = kpis.hourly_rate || 11.0;

    if (!isSelectionActive) {
      return timeSeries.map((pt) => {
        const calculatedReais = Number((pt.hours_saved * hourlyRate).toFixed(2));
        return {
          name: pt.label,
          date: pt.date,
          horas: pt.hours_saved,
          reais: calculatedReais,
          linhas: pt.total_rows,
        };
      });
    }

    // Filtra pontos temporais considerando apenas os lotes selecionados
    return timeSeries.map((pt) => {
      const matchingExecs = activeHistory.filter((h) => {
        const hPrefix = h.created_at.slice(0, pt.date.length);
        return hPrefix === pt.date;
      });

      const ptHours = Number(
        matchingExecs.reduce((acc, h) => acc + h.hours_saved, 0).toFixed(1)
      );
      const ptReais = Number((ptHours * hourlyRate).toFixed(2));
      const ptRows = matchingExecs.reduce((acc, h) => acc + h.total_rows, 0);

      return {
        name: pt.label,
        date: pt.date,
        horas: ptHours,
        reais: ptReais,
        linhas: ptRows,
      };
    });
  }, [timeSeries, isSelectionActive, activeHistory, kpis.hourly_rate]);

  const hasChartActivity = useMemo(() => {
    return chartData.some((pt) => pt.horas > 0 || pt.reais > 0 || pt.linhas > 0);
  }, [chartData]);

  const allSelected = history.length > 0 && history.every((h) => selectedIds.has(h.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Cabeçalho */}
          <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-copper">
                  {isSelectionActive
                    ? "Impacto Operacional • Filtro de Lotes"
                    : "Impacto & Eficiência Operacional"}
                </span>
                <span className="text-border">•</span>
                <span className="font-mono text-xs text-muted">
                  Taxa Base: {formatBRL(kpis.hourly_rate)}/h
                </span>
                {isSelectionActive && (
                  <>
                    <span className="text-border">•</span>
                    <span className="font-mono text-xs text-action font-semibold">
                      {selectedIds.size} {selectedIds.size === 1 ? "lote selecionado" : "lotes selecionados"}
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-title sm:text-3xl">
                {isSelectionActive
                  ? `Impacto de ${selectedIds.size} ${selectedIds.size === 1 ? "Operação" : "Operações"}`
                  : "Painel de Impacto & Retorno (ROI)"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {isSelectionActive
                  ? `Apuração recalculada exclusivamente para os ${selectedIds.size} lotes selecionados no histórico (${kpis.total_reconciled.toLocaleString("pt-BR")} lançamentos).`
                  : "Apuração auditável do tempo poupado e economia financeira acumulada na operação do escritório."}
              </p>
            </div>

            {/* Controles de Cabeçalho: Período e Limpar Seleção */}
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              {isSelectionActive && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="inline-flex items-center gap-1.5 rounded-[4px] border border-copper/40 bg-copper/10 px-3 py-1.5 text-xs font-semibold text-action hover:bg-copper/20 transition-colors"
                >
                  <X className="size-3.5" />
                  <span>Limpar seleção</span>
                </button>
              )}

              {/* Segmented Control de Período */}
              <div className="inline-flex rounded-md border border-border bg-sidebar p-1">
                {periodOptions.map((opt) => {
                  const active = period === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePeriodChange(opt.id)}
                      className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-elevated text-action border border-border shadow-sm"
                          : "text-muted hover:text-title hover:bg-elevated/40 border border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* PRIMEIRA DOBRA: Painel Executivo de Impacto Operacional (Recalculado) */}
          <section className="rounded-[4px] border border-border bg-sidebar/50 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              {/* Destaque Principal: Economia Financeira */}
              <div className="lg:col-span-5 space-y-2 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {isSelectionActive
                      ? "Economia das Operações Selecionadas"
                      : "Economia Operacional Estimada"}
                  </span>
                  {isSelectionActive && (
                    <span className="font-mono text-[10px] font-semibold text-action bg-copper/10 border border-copper/30 px-1.5 py-0.5 rounded-[2px]">
                      {selectedIds.size} de {history.length} lotes
                    </span>
                  )}
                </div>

                {impactQuery.isLoading ? (
                  <Skeleton className="h-12 w-48" />
                ) : (
                  <div>
                    <p className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-title">
                      {formatBRL(kpis.financial_saved)}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Valor economizado com automação contábil a{" "}
                      <strong className="text-title font-mono">{formatBRL(kpis.hourly_rate)}/h</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Estruturado de Indicadores Operacionais */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {/* Indicador 1: Horas Economizadas */}
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Tempo Poupado
                  </span>
                  {impactQuery.isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="font-mono text-2xl font-bold text-title">
                      {kpis.hours_saved.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      <span className="ml-1 text-xs font-normal text-muted">h</span>
                    </p>
                  )}
                  <span className="text-[11px] text-action font-medium">
                    ~0,025h / linha
                  </span>
                </div>

                {/* Indicador 2: Lançamentos Conciliados */}
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Lançamentos
                  </span>
                  {impactQuery.isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="font-mono text-2xl font-bold text-title">
                      {kpis.total_reconciled.toLocaleString("pt-BR")}
                    </p>
                  )}
                  <span className="text-[11px] text-muted">
                    auditados
                  </span>
                </div>

                {/* Indicador 3: Taxa de Regras Operacionais */}
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Regras Operacionais
                  </span>
                  {impactQuery.isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="font-mono text-2xl font-bold text-copper">
                      {kpis.zero_cost_percent.toFixed(1)}%
                    </p>
                  )}
                  <span className="text-[11px] text-muted">
                    regras do escritório
                  </span>
                </div>

                {/* Indicador 4: Lotes Analisados */}
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    {isSelectionActive ? "Lotes Selecionados" : "Lotes no Período"}
                  </span>
                  {impactQuery.isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="font-mono text-2xl font-bold text-title">
                      {isSelectionActive ? selectedIds.size : history.length}
                    </p>
                  )}
                  <span className="text-[11px] text-success font-medium">
                    100% integridade
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Gráfico de Evolução Temporal & Produtividade */}
          <section className="rounded-[4px] border border-border bg-sidebar/50 p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-copper" />
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-title">
                    Evolução Temporal da Economia & Produtividade
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {isSelectionActive
                    ? "Distribuição temporal das horas poupadas e economia para as operações selecionadas."
                    : "Progresso cumulativo de horas poupadas e retorno financeiro no período selecionado."}
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-action" />
                  <span className="text-muted">Horas Poupadas (h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success" />
                  <span className="text-muted">Economia ({formatBRL(kpis.hourly_rate)}/h)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 h-[290px] w-full">
              {impactQuery.isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-full w-full rounded-[4px]" />
                </div>
              ) : chartData.length === 0 || !hasChartActivity ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <TrendingUp className="size-8 text-muted/40" />
                  <p className="mt-2 text-sm font-medium text-title">Nenhum dado temporal no escopo</p>
                  <p className="text-xs text-muted">
                    {isSelectionActive
                      ? "Nenhuma movimentação registrada para os lotes selecionados neste período."
                      : "Processe extratos no classificador para visualizar a evolução."}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F08A3E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F08A3E" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="financialGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#35B47A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#35B47A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}h`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0].payload;
                        return (
                          <div className="rounded-[4px] border border-border bg-elevated p-3 shadow-xl text-xs space-y-1.5">
                            <p className="font-semibold text-title border-b border-border/60 pb-1">
                              {pt.name}
                            </p>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-action">Horas Poupadas:</span>
                              <span className="font-mono font-bold text-title">{pt.horas} h</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-success">Economia Estimada:</span>
                              <span className="font-mono font-bold text-title">{formatBRL(pt.reais)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted">Lançamentos:</span>
                              <span className="font-mono font-bold text-title">{pt.linhas}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="horas"
                      stroke="#F08A3E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#hoursGradient)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="reais"
                      stroke="#35B47A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#financialGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Tabela de Histórico de Lotes & Auditoria Selecionável */}
          <section className="rounded-[4px] border border-border bg-sidebar/50 overflow-hidden shadow-sm">
            <div className="border-b border-border p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-copper" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-title">
                      Histórico de Lotes & Auditoria Operacional
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Selecione um ou mais lotes para calcular o impacto isolado dessas operações sem nova classificação.
                  </p>
                </div>

                {/* Ações Rápidas de Seleção */}
                <div className="flex items-center gap-3 text-xs font-medium">
                  {history.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={allSelected ? handleClearSelection : handleSelectAll}
                        className="inline-flex items-center gap-1.5 text-muted hover:text-action transition-colors"
                      >
                        <CheckSquare className="size-3.5 text-copper" />
                        <span>{allSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
                      </button>

                      {isSelectionActive && (
                        <>
                          <span className="text-border">|</span>
                          <button
                            type="button"
                            onClick={handleClearSelection}
                            className="text-muted hover:text-danger transition-colors"
                          >
                            Limpar
                          </button>
                        </>
                      )}
                    </>
                  )}

                  <span className="font-mono text-xs text-muted border-l border-border pl-3">
                    {isSelectionActive
                      ? `${selectedIds.size} de ${history.length} lotes`
                      : `${history.length} ${history.length === 1 ? "lote" : "lotes"}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela Interativa */}
            <div className="scrollbar-subtle max-h-[460px] overflow-auto">
              <table className="w-full min-w-[750px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-sidebar border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={() => {
                          if (allSelected) {
                            handleClearSelection();
                          } else {
                            handleSelectAll();
                          }
                        }}
                        aria-label="Selecionar todos os lotes"
                        className="size-3.5 rounded-[2px] border-border accent-[#C8753D] cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Arquivo / Extrato</th>
                    <th className="px-4 py-3 text-center">Linhas</th>
                    <th className="px-4 py-3 text-center">Regras Operacionais vs Assistido</th>
                    <th className="px-4 py-3 text-right">Tempo Poupado</th>
                    <th className="px-4 py-3 text-right">Valor Economizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {impactQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <FileCheck className="mx-auto size-6 text-muted" />
                        <p className="mt-2 text-sm font-medium text-title">
                          Nenhum lote processado no período
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Importe e processe extratos para acompanhar o histórico de impacto da sua operação.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => {
                      const isSelected = selectedIds.has(row.id);
                      const calculatedFin = Number((row.hours_saved * (kpis.hourly_rate || 11.0)).toFixed(2));
                      return (
                        <tr
                          key={row.id}
                          onClick={() => toggleSelect(row.id)}
                          className={cn(
                            "transition-colors cursor-pointer select-none",
                            isSelected
                              ? "bg-copper/10 hover:bg-copper/15 border-l-2 border-l-copper"
                              : "hover:bg-elevated/40"
                          )}
                        >
                          <td
                            className="w-10 px-4 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(row.id)}
                              aria-label={`Selecionar lote ${row.filename}`}
                              className="size-3.5 rounded-[2px] border-border accent-[#C8753D] cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 font-mono text-muted whitespace-nowrap">
                            {formatDate(row.created_at)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-title">
                            <div className="flex items-center gap-2 truncate max-w-[260px]">
                              <FileSpreadsheet className="size-3.5 text-copper shrink-0" />
                              <span className="truncate" title={row.filename}>
                                {row.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-title">
                            {row.total_rows}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.zero_cost_percent === 100 ? (
                              <span className="rounded-[2px] border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                                100% Regras Operacionais ({row.rules_matched})
                              </span>
                            ) : row.rules_matched > 0 ? (
                              <span className="rounded-[2px] border border-copper/35 bg-copper/10 px-2 py-0.5 text-[10px] font-semibold text-action">
                                {row.zero_cost_percent.toFixed(0)}% regras ({row.rules_matched} / {row.ai_matched} assistido)
                              </span>
                            ) : (
                              <span className="rounded-[2px] border border-border bg-sidebar px-2 py-0.5 text-[10px] font-semibold text-muted">
                                100% Assistido ({row.ai_matched})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-action">
                            {row.hours_saved.toLocaleString("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}{" "}
                            h
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-success">
                            {formatBRL(calculatedFin)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
