import { useMemo } from "react";
import { useBatchMetrics } from "../../hooks/use-classifier";
import type { Batch } from "../../lib/types";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { ScrollDepthSection } from "./ScrollDepthSection";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const CATEGORY_COLORS = [
  "#C8753D", // Copper
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#6366F1", // Indigo
  "#F43F5E", // Rose
  "#0EA5E9", // Sky
  "#8B5CF6", // Purple
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#A39B93", // Muted
];

export function MetricsGrid({
  batch,
  loading,
}: {
  batch?: Batch | null;
  loading: boolean;
}) {
  const metricsQuery = useBatchMetrics(batch?.id ?? null);
  const isQueryLoading =
    loading ||
    (Boolean(batch) && metricsQuery.isLoading && !metricsQuery.data);

  // Cálculos dinâmicos e reativos em tempo real baseados nas transações do lote
  const analytics = useMemo(() => {
    if (!batch) {
      return {
        financial: {
          total_expenses: 0,
          total_income: 0,
          net_balance: 0,
          average_ticket: 0,
          total_transactions: 0,
          income_expense_ratio: 0,
        },
        impact: {
          hours_saved: 0,
          financial_savings: 0,
          confidence_percent: 0,
          rules_percent: 0,
          total_processed_transactions: 0,
        },
        categories: [] as Array<{
          name: string;
          amount: number;
          count: number;
          percent: number;
          color: string;
        }>,
        sources: {
          localRules: 0,
          localRulesPercent: 0,
          aiInference: 0,
          aiInferencePercent: 0,
          pendingReview: 0,
          pendingReviewPercent: 0,
        },
        timeComparison: {
          manualMinutes: 0,
          manualHours: 0,
          zaeronSeconds: 0,
          speedMultiplier: 0,
        },
        topOutflows: [] as Array<{ description: string; amount: number; category: string }>,
        topCategoryShare: 0,
        top3CategoriesShare: 0,
        totalTxs: 0,
        duplicates: 0,
      };
    }

    const txs = batch.transactions ?? [];
    const validTxs = txs.filter((t) => !t.is_duplicate);
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalVolume = 0;
    let confidentCount = 0;
    let localRulesCount = 0;
    let aiInferenceCount = 0;
    let pendingReviewCount = 0;

    const categoryMap = new Map<string, { amount: number; count: number }>();
    const outflowsList: Array<{ description: string; amount: number; category: string }> = [];

    for (const t of validTxs) {
      const amt = Number(t.amount) || 0;
      totalVolume += Math.abs(amt);

      if (amt < 0) {
        const absAmt = Math.abs(amt);
        totalExpenses += absAmt;
        const cat = t.category || "Outras Despesas";
        const current = categoryMap.get(cat) || { amount: 0, count: 0 };
        categoryMap.set(cat, {
          amount: current.amount + absAmt,
          count: current.count + 1,
        });
        outflowsList.push({
          description: t.clean_description,
          amount: absAmt,
          category: cat,
        });
      } else if (amt > 0) {
        totalIncome += amt;
      }

      if (t.confidence >= 0.8) {
        confidentCount++;
      } else {
        pendingReviewCount++;
      }

      const src = (t.classification_source || "").toLowerCase();
      if (
        src.includes("regras") ||
        src.includes("local") ||
        src.includes("memória") ||
        src.includes("histórico") ||
        src.includes("office_rule")
      ) {
        localRulesCount++;
      } else if (
        src.includes("ia") ||
        src.includes("gemini") ||
        src.includes("openai") ||
        src.includes("gpt") ||
        src.includes("groq")
      ) {
        aiInferenceCount++;
      } else {
        localRulesCount++;
      }
    }

    const totalCount = validTxs.length || 1;
    const processedCount =
      batch.status === "processed" || batch.status === "exported"
        ? batch.processed_transactions
        : validTxs.length;

    // Categorias ordenadas por valor decrescente
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([name, { amount, count }], index) => ({
        name,
        amount,
        count,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    const topOutflows = outflowsList.sort((a, b) => b.amount - a.amount).slice(0, 5);

    const topCategoryShare = sortedCategories[0]?.percent || 0;
    const top3CategoriesShare = sortedCategories
      .slice(0, 3)
      .reduce((sum, c) => sum + c.percent, 0);

    const hours =
      processedCount > 0
        ? Math.max(0.2, Number((processedCount * 0.025).toFixed(1)))
        : 0;
    const financialSavings = Number((hours * 11.0).toFixed(2));
    const confidencePct = (confidentCount / totalCount) * 100;
    const rulesPct = (localRulesCount / totalCount) * 100;

    // Estimativas de tempo
    const manualMinutes = Math.max(5, Math.round(validTxs.length * 2.0)); // 2 min por lançamento
    const manualHours = Number((manualMinutes / 60).toFixed(1));
    const zaeronSeconds = Math.max(1, Math.round(validTxs.length * 0.08)); // ~80ms por lançamento
    const speedMultiplier = Math.max(10, Math.round((manualMinutes * 60) / zaeronSeconds));
    const incomeExpenseRatio =
      totalExpenses > 0 ? Number((totalIncome / totalExpenses).toFixed(2)) : totalIncome > 0 ? 100 : 0;

    return {
      financial: {
        total_expenses: totalExpenses,
        total_income: totalIncome,
        net_balance: Number((totalIncome - totalExpenses).toFixed(2)),
        average_ticket:
          validTxs.length > 0 ? Number((totalVolume / validTxs.length).toFixed(2)) : 0,
        total_transactions: validTxs.length,
        income_expense_ratio: incomeExpenseRatio,
      },
      impact: {
        hours_saved: hours,
        financial_savings: financialSavings,
        confidence_percent: Number(confidencePct.toFixed(1)),
        rules_percent: Number(rulesPct.toFixed(1)),
        total_processed_transactions: processedCount,
      },
      categories: sortedCategories,
      topOutflows,
      topCategoryShare: Number(topCategoryShare.toFixed(1)),
      top3CategoriesShare: Number(top3CategoriesShare.toFixed(1)),
      sources: {
        localRules: localRulesCount,
        localRulesPercent: Number(((localRulesCount / totalCount) * 100).toFixed(1)),
        aiInference: aiInferenceCount,
        aiInferencePercent: Number(((aiInferenceCount / totalCount) * 100).toFixed(1)),
        pendingReview: pendingReviewCount,
        pendingReviewPercent: Number(((pendingReviewCount / totalCount) * 100).toFixed(1)),
      },
      timeComparison: {
        manualMinutes,
        manualHours,
        zaeronSeconds,
        speedMultiplier,
      },
      totalTxs: batch.total_transactions,
      duplicates: batch.duplicate_transactions,
    };
  }, [batch]);

  const {
    financial,
    impact,
    categories,
    sources,
    timeComparison,
    topCategoryShare,
    top3CategoriesShare,
  } = analytics;


  return (
    <div className="space-y-10" aria-label="Narrativa Analítica Tridimensional do Lote">
      {/* ========================================================================= */}
      {/* PLANO 01: Visão Geral Editorial */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber={1} planeTitle="Visão Geral & Indicadores Executivos">
        <div className="rounded-[4px] border border-border bg-sidebar/70 p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-title">
                Auditoria do Lote #{batch?.id ?? "—"}
              </h3>
              <p className="text-xs text-muted">
                {batch?.source_filename} • {financial.total_transactions} lançamentos válidos (
                {analytics.duplicates} duplicidades isoladas)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-copper border border-copper/30 bg-copper/10 px-2 py-0.5 rounded-[2px]">
                Confiança: {impact.confidence_percent}%
              </span>
              <span className="font-mono text-xs text-success border border-success/30 bg-success/10 px-2 py-0.5 rounded-[2px]">
                {impact.hours_saved}h poupadas
              </span>
            </div>
          </div>

          {/* Grid de Métricas Estruturais */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1 border-r border-border/60 pr-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Movimentação Total
              </span>
              <p className="font-mono text-xl sm:text-2xl font-bold text-title">
                {formatBRL(financial.total_income + financial.total_expenses)}
              </p>
              <span className="text-[11px] text-muted block">
                {financial.total_transactions} transações
              </span>
            </div>

            <div className="space-y-1 border-r border-border/60 pr-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Total de Saídas
              </span>
              <p className="font-mono text-xl sm:text-2xl font-bold text-danger">
                {formatBRL(financial.total_expenses)}
              </p>
              <span className="text-[11px] text-muted block">
                Entradas: {formatBRL(financial.total_income)}
              </span>
            </div>

            <div className="space-y-1 border-r border-border/60 pr-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Resultado Líquido
              </span>
              <p
                className={`font-mono text-xl sm:text-2xl font-bold ${
                  financial.net_balance >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatBRL(financial.net_balance)}
              </p>
              <span className="text-[11px] text-muted block">
                {financial.net_balance >= 0 ? "Superávit no período" : "Déficit no período"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Economia Financeira
              </span>
              <p className="font-mono text-xl sm:text-2xl font-bold text-action">
                {formatBRL(impact.financial_savings)}
              </p>
              <span className="text-[11px] text-muted block">
                Taxa base: R$ 11,00/h
              </span>
            </div>
          </div>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* PLANO 03: Breakdown de Gastos por Categoria */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber={3} planeTitle="Breakdown de Gastos por Categoria">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Distribuição Visual */}
          <Card className="p-6 lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                  Distribuição de Despesas por Categoria
                </h4>
                <span className="font-mono text-xs text-danger font-semibold">
                  {formatBRL(financial.total_expenses)}
                </span>
              </div>

              {isQueryLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : categories.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted">
                  Nenhuma despesa identificada neste extrato.
                </div>
              ) : (
                <div className="mt-5 space-y-3.5">
                  {categories.slice(0, 6).map((cat, idx) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="font-medium text-title truncate max-w-[220px] sm:max-w-[320px]">
                            {cat.name}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            ({cat.count} {cat.count === 1 ? "lançamento" : "lançamentos"})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-muted">{cat.percent.toFixed(1)}%</span>
                          <span className="font-semibold text-title">
                            {formatBRL(cat.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-sidebar border border-border/40">
                        <div
                          className="h-full rounded-[2px] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(2, cat.percent))}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-border/60 text-[11px] text-muted flex items-center justify-between">
              <span>{categories.length} categorias contábeis identificadas</span>
              <span className="text-copper font-medium">Classificação operacional</span>
            </div>
          </Card>

          {/* Destaque de Concentração */}
          <Card className="p-6 lg:col-span-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-copper">
                  Destaque da Operação
                </span>
                <h4 className="text-sm font-semibold text-title mt-0.5">
                  Concentração de Saídas
                </h4>
              </div>

              <div className="space-y-3">
                <div className="rounded-[4px] border border-border bg-canvas p-3 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-muted">
                    Categoria Dominante
                  </span>
                  <p className="text-xs font-semibold text-title truncate">
                    {categories[0]?.name || "N/A"}
                  </p>
                  <p className="font-mono text-lg font-bold text-copper">
                    {topCategoryShare}% do total
                  </p>
                  <span className="text-[11px] text-muted block">
                    {formatBRL(categories[0]?.amount || 0)}
                  </span>
                </div>

                <div className="rounded-[4px] border border-border bg-canvas p-3 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-muted">
                    Top 3 Categorias
                  </span>
                  <p className="font-mono text-lg font-bold text-title">
                    {top3CategoriesShare}% das despesas
                  </p>
                  <p className="text-[11px] text-muted">
                    Representam a maior parte do fluxo de saída deste período.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted">
              Valores calculados de forma estritamente determinística.
            </div>
          </Card>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* PLANO 04: Balanço & Saldo Líquido */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber={4} planeTitle="Balanço & Saldo Líquido do Período">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-success">
              Receitas / Entradas (+)
            </span>
            <p className="mt-2 font-mono text-3xl font-extrabold text-success">
              {formatBRL(financial.total_income)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Total de créditos identificados no extrato
            </p>
          </Card>

          <Card className="p-6">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-danger">
              Despesas / Saídas (-)
            </span>
            <p className="mt-2 font-mono text-3xl font-extrabold text-danger">
              {formatBRL(financial.total_expenses)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Total de débitos e pagamentos conciliados
            </p>
          </Card>

          <Card className="p-6">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
              Resultado Líquido Apurado
            </span>
            <p
              className={`mt-2 font-mono text-3xl font-extrabold ${
                financial.net_balance >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatBRL(financial.net_balance)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Relação Entrada/Saída:{" "}
              <strong className="text-title font-mono">
                {financial.income_expense_ratio}x
              </strong>
            </p>
          </Card>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* PLANO 05: Confiança da Classificação */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber={5} planeTitle="Confiança da Classificação">
        <Card className="p-6 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                Confiança da Classificação & Rastreabilidade
              </h4>
              <p className="text-xs text-muted">
                Critérios técnicos e fontes aplicadas na conciliação dos lançamentos.
              </p>
            </div>
            <span className="font-mono text-2xl font-bold text-title">
              {impact.confidence_percent}%
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[4px] border border-copper/40 bg-copper/5 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-action">Regras Operacionais</span>
                <span className="font-mono text-xs font-bold text-copper">
                  {sources.localRulesPercent}%
                </span>
              </div>
              <p className="font-mono text-xl font-bold text-title">
                {sources.localRules} lançamentos
              </p>
              <p className="text-[11px] text-muted">
                Classificados diretamente por termos e histórico do seu escritório.
              </p>
            </div>

            <div className="rounded-[4px] border border-border bg-sidebar p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-title">Classificação Assistida</span>
                <span className="font-mono text-xs font-bold text-title">
                  {sources.aiInferencePercent}%
                </span>
              </div>
              <p className="font-mono text-xl font-bold text-title">
                {sources.aiInference} lançamentos
              </p>
              <p className="text-[11px] text-muted">
                Padronizados por similaridade contábil e contexto de transação.
              </p>
            </div>

            <div className="rounded-[4px] border border-border bg-sidebar p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-warning">Revisão Sugerida</span>
                <span className="font-mono text-xs font-bold text-warning">
                  {sources.pendingReviewPercent}%
                </span>
              </div>
              <p className="font-mono text-xl font-bold text-title">
                {sources.pendingReview} lançamentos
              </p>
              <p className="text-[11px] text-muted">
                Descrições atípicas sinalizadas para validação humana preventiva.
              </p>
            </div>
          </div>
        </Card>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* PLANO 06 & 07: Eficiência Operacional & Economia Financeira */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber={6} planeTitle="Eficiência Operacional & Economia (ROI)">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Eficiência Operacional */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                Eficiência Operacional
              </h4>
              <span className="font-mono text-xs font-semibold text-action">
                {timeComparison.speedMultiplier}x mais veloz
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-mono text-3xl font-extrabold text-title">
                    {impact.hours_saved}h
                  </p>
                  <span className="text-xs text-action font-medium">tempo manual poupado</span>
                </div>
                <span className="text-xs text-muted text-right">
                  ~{timeComparison.manualHours}h manual ➔ {timeComparison.zaeronSeconds}s automatizado
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>Digitação manual tradicional</span>
                    <span className="font-mono">~{timeComparison.manualMinutes} min</span>
                  </div>
                  <div className="h-1.5 w-full rounded-[2px] bg-sidebar border border-border/40">
                    <div className="h-full w-full rounded-[2px] bg-border" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-action font-medium">
                    <span>Processamento Zaeron</span>
                    <span className="font-mono">{timeComparison.zaeronSeconds} seg</span>
                  </div>
                  <div className="h-1.5 w-full rounded-[2px] bg-sidebar border border-border/40">
                    <div
                      className="h-full rounded-[2px] bg-action transition-all duration-500"
                      style={{ width: "4%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted flex items-center justify-between">
              <span>Fórmula canônica: max(0.2, qtd × 0.025)</span>
              <span className="text-success font-medium">Zero retrabalho</span>
            </div>
          </Card>

          {/* Economia Financeira (ROI) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                Economia Financeira (ROI)
              </h4>
              <span className="font-mono text-xs font-semibold text-copper">
                R$ 11,00/h
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-mono text-[10px] uppercase font-semibold text-muted">
                  Valor Monetário Economizado
                </span>
                <p className="mt-1 font-mono text-3xl font-extrabold text-title">
                  {formatBRL(impact.financial_savings)}
                </p>
              </div>

              <div className="rounded-[4px] border border-border bg-sidebar p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Taxa contábil base:</span>
                  <span className="font-mono font-medium text-title">R$ 11,00 / hora</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Classificações por regras operacionais:</span>
                  <span className="font-mono font-semibold text-copper">
                    {impact.rules_percent}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Fórmula de ROI:</span>
                  <span className="font-mono text-muted text-[11px]">horas_salvas × 11.00</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted flex items-center justify-between">
              <span className="text-copper">Regras do Escritório</span>
              <span>Retorno econômico auditável</span>
            </div>
          </Card>
        </div>
      </ScrollDepthSection>
    </div>
  );
}
