import { useMemo } from "react";
import {
  FileSpreadsheet,
  FolderOpen,
  Sparkles,
} from "lucide-react";

import { formatBRL, calculateHoursSaved, calculateFinancialSavings } from "../../lib/constants";
import type { Batch } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ScrollDepthSection } from "./ScrollDepthSection";

interface ExecutiveIntelligenceDashboardProps {
  batches: Batch[];
  onSelectBatch: (batchId: number) => void;
}

export function ExecutiveIntelligenceDashboard({
  batches,
  onSelectBatch,
}: ExecutiveIntelligenceDashboardProps) {
  // Motor de Análise Estatística e Inteligência Determinística
  const intelligence = useMemo(() => {
    let totalTransactions = 0;
    let totalExpenses = 0;
    let totalIncome = 0;
    let totalDuplicates = 0;
    let totalProcessed = 0;
    let highConfidenceCount = 0;
    let rulesCount = 0;

    const categoryMap = new Map<string, { amount: number; count: number }>();
    const allOutflows: Array<{
      id: number;
      description: string;
      amount: number;
      category: string;
      date: string;
      batchName: string;
    }> = [];

    // Dados por lote para comparativo histórico entre extratos
    const batchSummaries: Array<{
      id: number;
      name: string;
      expenses: number;
      income: number;
      net: number;
      txCount: number;
      categories: Map<string, number>;
    }> = [];

    batches.forEach((b) => {
      totalTransactions += b.total_transactions || 0;
      totalDuplicates += b.duplicate_transactions || 0;
      totalProcessed += b.processed_transactions || 0;

      let bExp = 0;
      let bInc = 0;
      const bCatMap = new Map<string, number>();

      (b.transactions || []).forEach((t) => {
        if (!t.is_duplicate) {
          const amt = Number(t.amount) || 0;
          if (amt < 0) {
            const absVal = Math.abs(amt);
            totalExpenses += absVal;
            bExp += absVal;
            const cat = t.category || "Outras Despesas";
            const cur = categoryMap.get(cat) || { amount: 0, count: 0 };
            categoryMap.set(cat, {
              amount: cur.amount + absVal,
              count: cur.count + 1,
            });
            bCatMap.set(cat, (bCatMap.get(cat) || 0) + absVal);

            allOutflows.push({
              id: t.id,
              description: t.clean_description,
              amount: absVal,
              category: cat,
              date: t.date,
              batchName: b.source_filename,
            });
          } else if (amt > 0) {
            totalIncome += amt;
            bInc += amt;
          }

          if (t.confidence >= 0.8) {
            highConfidenceCount++;
          }

          const src = (t.classification_source || "").toLowerCase();
          if (
            src.includes("regras") ||
            src.includes("local") ||
            src.includes("memória") ||
            src.includes("office_rule")
          ) {
            rulesCount++;
          }
        }
      });

      batchSummaries.push({
        id: b.id,
        name: b.source_filename,
        expenses: bExp,
        income: bInc,
        net: bInc - bExp,
        txCount: (b.transactions || []).filter((t) => !t.is_duplicate).length,
        categories: bCatMap,
      });
    });

    const totalValidTxs = totalProcessed || totalTransactions || 1;
    const hoursSaved = calculateHoursSaved(totalValidTxs);
    const financialSaved = calculateFinancialSavings(hoursSaved);
    const netBalance = totalIncome - totalExpenses;
    const highConfidenceRate = Number(((highConfidenceCount / totalValidTxs) * 100).toFixed(1));
    const rulesRate = Number(((rulesCount / totalValidTxs) * 100).toFixed(1));
    const rulesMinutesSaved = Math.round(rulesCount * 2.0); // 2 min por lançamento

    // Categorias ordenadas por montante
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([name, { amount, count }]) => ({
        name,
        amount,
        count,
        percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Maiores despesas individuais
    const topOutflows = allOutflows.sort((a, b) => b.amount - a.amount).slice(0, 5);

    // Concentração das Top 3 Categorias
    const top3Categories = sortedCategories.slice(0, 3);
    const top3Share = top3Categories.reduce((sum, c) => sum + c.percent, 0);
    const top3Val = top3Categories.reduce((sum, c) => sum + c.amount, 0);
    const top3Names = top3Categories.map((c) => c.name).join(", ");

    // Análise Comparativa entre Lotes (quando houver 2+)
    let comparativeShift: {
      risingCat?: { name: string; pctChange: number; from: number; to: number };
      fallingCat?: { name: string; pctChange: number; from: number; to: number };
      volumeShiftPct?: number;
    } | null = null;

    if (batchSummaries.length >= 2) {
      const bLatest = batchSummaries[batchSummaries.length - 1];
      const bPrev = batchSummaries[batchSummaries.length - 2];

      const volChange =
        bPrev.expenses > 0
          ? ((bLatest.expenses - bPrev.expenses) / bPrev.expenses) * 100
          : 0;

      let maxRise = { name: "", diff: 0, from: 0, to: 0 };
      let maxFall = { name: "", diff: 0, from: 0, to: 0 };

      bLatest.categories.forEach((amtLatest, catName) => {
        const amtPrev = bPrev.categories.get(catName) || 0;
        if (amtPrev > 0) {
          const diffPct = ((amtLatest - amtPrev) / amtPrev) * 100;
          if (diffPct > maxRise.diff) {
            maxRise = { name: catName, diff: diffPct, from: amtPrev, to: amtLatest };
          }
          if (diffPct < maxFall.diff) {
            maxFall = { name: catName, diff: diffPct, from: amtPrev, to: amtLatest };
          }
        }
      });

      comparativeShift = {
        volumeShiftPct: Number(volChange.toFixed(1)),
        risingCat:
          maxRise.diff > 0
            ? {
                name: maxRise.name,
                pctChange: Number(maxRise.diff.toFixed(1)),
                from: maxRise.from,
                to: maxRise.to,
              }
            : undefined,
        fallingCat:
          maxFall.diff < 0
            ? {
                name: maxFall.name,
                pctChange: Number(Math.abs(maxFall.diff).toFixed(1)),
                from: maxFall.from,
                to: maxFall.to,
              }
            : undefined,
      };
    }

    // -------------------------------------------------------------------------
    // GERAÇÃO DE INSIGHTS DETERMINÍSTICOS DA OPERAÇÃO (3 a 7 análises reais)
    // -------------------------------------------------------------------------
    const insights: Array<{
      id: string;
      title: string;
      text: string;
      category: "financial" | "operational" | "risk" | "comparative";
      badge: string;
    }> = [];

    // Insight 1: Concentração de Despesas
    if (sortedCategories.length >= 3 && top3Share > 0) {
      insights.push({
        id: "concentration-top3",
        title: "Concentração do Volume de Despesas",
        text: `As três maiores categorias contábeis (${top3Names}) concentram ${top3Share.toFixed(
          1
        )}% de todas as saídas deste período (${formatBRL(top3Val)}).`,
        category: "financial",
        badge: `${top3Share.toFixed(0)}% das saídas`,
      });
    }

    // Insight 2: Categoria Dominante
    if (sortedCategories.length > 0) {
      const topCat = sortedCategories[0];
      insights.push({
        id: "dominant-category",
        title: `Maior Centro de Custo: ${topCat.name}`,
        text: `A categoria ${topCat.name} representa individualmente ${topCat.percent.toFixed(
          1
        )}% do fluxo de saídas (${formatBRL(topCat.amount)} em ${topCat.count} lançamentos).`,
        category: "financial",
        badge: `${topCat.percent.toFixed(1)}% do total`,
      });
    }

    // Insight 3: Eficiência por Regras Operacionais
    if (rulesCount > 0) {
      insights.push({
        id: "rules-efficiency",
        title: "Impacto das Regras Operacionais",
        text: `As Regras Operacionais do escritório resolveram ${rulesCount} lançamentos diretamente sem intervenção manual, poupando aproximadamente ${rulesMinutesSaved} minutos de digitação.`,
        category: "operational",
        badge: `${rulesRate}% por regras`,
      });
    }

    // Insight 4: Confiança e Segurança da Classificação
    insights.push({
      id: "classification-confidence",
      title: "Índice de Confiança Contábil",
      text: `${highConfidenceRate}% dos lançamentos conciliados atingiram alta confiança técnica (≥ 80%), mantendo a padronização das contas e histórico narrativo.`,
      category: "operational",
      badge: `${highConfidenceRate}% alta confiança`,
    });

    // Insight 5: Maior Movimentação Individual
    if (topOutflows.length > 0) {
      const top1 = topOutflows[0];
      const top1Share =
        totalExpenses > 0 ? ((top1.amount / totalExpenses) * 100).toFixed(1) : "0";
      insights.push({
        id: "largest-outflow",
        title: "Maior Desembolso Individual",
        text: `A maior movimentação de saída apurada foi de ${formatBRL(
          top1.amount
        )} (${top1Share}% do total) referente a "${top1.description}" em ${new Date(
          `${top1.date}T12:00:00`
        ).toLocaleDateString("pt-BR")}.`,
        category: "financial",
        badge: `R$ ${formatBRL(top1.amount)}`,
      });
    }

    // Insight 6: Comparativo de Variação (quando houver 2+ lotes)
    if (comparativeShift?.risingCat) {
      insights.push({
        id: "comparative-trend-rise",
        title: `Variação Observada: ${comparativeShift.risingCat.name}`,
        text: `Os desembolsos com ${comparativeShift.risingCat.name} aumentaram +${
          comparativeShift.risingCat.pctChange
        }% em relação ao lote anterior (de ${formatBRL(
          comparativeShift.risingCat.from
        )} para ${formatBRL(comparativeShift.risingCat.to)}).`,
        category: "comparative",
        badge: `+${comparativeShift.risingCat.pctChange}%`,
      });
    } else if (comparativeShift?.fallingCat) {
      insights.push({
        id: "comparative-trend-fall",
        title: `Redução Observada: ${comparativeShift.fallingCat.name}`,
        text: `Os desembolsos com ${comparativeShift.fallingCat.name} reduziram -${
          comparativeShift.fallingCat.pctChange
        }% no lote mais recente (de ${formatBRL(
          comparativeShift.fallingCat.from
        )} para ${formatBRL(comparativeShift.fallingCat.to)}).`,
        category: "comparative",
        badge: `-${comparativeShift.fallingCat.pctChange}%`,
      });
    }

    return {
      totalBatches: batches.length,
      totalTransactions,
      totalDuplicates,
      totalExpenses,
      totalIncome,
      netBalance,
      hoursSaved,
      financialSaved,
      highConfidenceRate,
      rulesRate,
      rulesCount,
      rulesMinutesSaved,
      categories: sortedCategories,
      topOutflows,
      top3Share: Number(top3Share.toFixed(1)),
      top3Val,
      top3Names,
      batchSummaries,
      comparativeShift,
      insights,
    };
  }, [batches]);

  return (
    <div className="space-y-10" aria-label="Executive Intelligence Dashboard">
      {/* ========================================================================= */}
      {/* 1. HERO EXECUTIVO: Panorama Consolidado da Operação                       */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber="E1" planeTitle="Executive Intelligence Dashboard">
        <div className="rounded-[4px] border border-border bg-sidebar/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge tone="copper">INTELIGÊNCIA EXECUTIVA</Badge>
                <span className="font-mono text-xs text-muted">
                  {intelligence.totalBatches} lote(s) consolidado(s) na sessão
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-title">
                Visão Consolidada & Interpretação Operacional
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted max-w-2xl">
                Análise financeira integrada, concentração de recursos e indicadores de produtividade gerados a partir de todos os extratos importados.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-[10px] uppercase tracking-wider text-muted block">
                  Economia Gerada
                </span>
                <span className="text-xl font-bold text-copper">
                  {formatBRL(intelligence.financialSaved)}
                </span>
              </div>
            </div>
          </div>

          {/* Grid de KPIs Editoriais */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="space-y-1 border-r border-border/60 pr-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                Total de Transações
              </span>
              <p className="font-mono text-3xl font-extrabold text-title">
                {intelligence.totalTransactions}
              </p>
              <span className="text-[11px] text-muted block">
                em {intelligence.totalBatches} extrato(s) ({intelligence.totalDuplicates} duplicidades)
              </span>
            </div>

            <div className="space-y-1 border-r border-border/60 pr-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                Total de Saídas
              </span>
              <p className="font-mono text-3xl font-extrabold text-danger">
                {formatBRL(intelligence.totalExpenses)}
              </p>
              <span className="text-[11px] text-muted block">
                Entradas: {formatBRL(intelligence.totalIncome)}
              </span>
            </div>

            <div className="space-y-1 border-r border-border/60 pr-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                Saldo Consolidado
              </span>
              <p
                className={`font-mono text-3xl font-extrabold ${
                  intelligence.netBalance >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatBRL(intelligence.netBalance)}
              </p>
              <span className="text-[11px] text-muted block">
                {intelligence.netBalance >= 0
                  ? "Resultado superavitário"
                  : "Resultado deficitário"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                Tempo Poupado
              </span>
              <p className="font-mono text-3xl font-extrabold text-action">
                {intelligence.hoursSaved.toFixed(1)}h
              </p>
              <span className="text-[11px] text-muted block">
                {intelligence.rulesCount} por regras operacionais
              </span>
            </div>
          </div>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* 2. SEÇÃO OBRIGATÓRIA: INSIGHTS DA OPERAÇÃO (Interpretação Empresarial)    */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber="E2" planeTitle="Insights da Operação">
        <div className="space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-copper" />
              <h3 className="text-sm font-semibold text-title uppercase tracking-wide">
                Insights da Operação • Interpretação dos Dados
              </h3>
            </div>
            <span className="font-mono text-xs text-muted">
              {intelligence.insights.length} análises apuradas
            </span>
          </div>

          {/* Coluna Editorial de Insights */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {intelligence.insights.map((insight) => (
              <div
                key={insight.id}
                className="relative rounded-[4px] border border-border bg-sidebar/70 p-5 space-y-3 transition-all duration-200 hover:border-copper/60 hover:bg-sidebar"
              >
                {/* Indicador de borda esquerda com assinatura cobre */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-copper">
                    {insight.category === "financial"
                      ? "Financeiro"
                      : insight.category === "operational"
                      ? "Operacional"
                      : insight.category === "comparative"
                      ? "Comparativo"
                      : "Risco"}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-action border border-copper/30 bg-copper/10 px-2 py-0.5 rounded-[2px]">
                    {insight.badge}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-title leading-snug">
                  {insight.title}
                </h4>

                <p className="text-xs text-muted leading-relaxed">
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* 3. CONCENTRAÇÃO & RANKING DE CATEGORIAS CONSOLIDADAS                      */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber="E3" planeTitle="Estrutura de Gastos & Concentração">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Tabela / Lista de Categorias Dominantes */}
          <Card className="p-6 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                  Composição Consolidada por Categoria
                </h4>
                <span className="font-mono text-xs font-semibold text-danger">
                  Total: {formatBRL(intelligence.totalExpenses)}
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                {intelligence.categories.slice(0, 7).map((cat, idx) => (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-medium text-title truncate max-w-[200px] sm:max-w-[300px]">
                          {cat.name}
                        </span>
                        <span className="font-mono text-[10px] text-muted">
                          ({cat.count} lançamentos)
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
                        className="h-full rounded-[2px] bg-copper transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(2, cat.percent))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-border/60 text-[11px] text-muted flex items-center justify-between">
              <span>{intelligence.categories.length} categorias apuradas na sessão</span>
              <span className="text-copper font-medium">Consolidação multi-arquivo</span>
            </div>
          </Card>

          {/* Maiores Movimentações Individuais da Sessão */}
          <Card className="p-6 lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                  Maiores Desembolsos Individuais
                </h4>
                <p className="text-[11px] text-muted mt-0.5">
                  Lançamentos de maior relevância financeira
                </p>
              </div>

              <div className="space-y-2.5">
                {intelligence.topOutflows.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-[4px] border border-border/80 bg-canvas/70 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-copper font-semibold">
                        #{idx + 1} • {item.category}
                      </span>
                      <span className="font-mono font-bold text-danger">
                        {formatBRL(item.amount)}
                      </span>
                    </div>
                    <p className="font-medium text-title truncate" title={item.description}>
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                      <span className="truncate max-w-[120px]">{item.batchName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted">
              Rastreabilidade individual completa em cada aba de lote.
            </div>
          </Card>
        </div>
      </ScrollDepthSection>

      {/* ========================================================================= */}
      {/* 4. COMPARATIVO HISTÓRICO ENTRE LOTES DA SESSÃO                            */}
      {/* ========================================================================= */}
      <ScrollDepthSection planeNumber="E4" planeTitle="Análise Comparativa entre Extratos">
        <Card className="p-6 space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-title">
                Comparativo Entre Extratos Importados
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Evolução de volume, transações e saldo por arquivo de conciliação.
              </p>
            </div>
            {intelligence.totalBatches >= 2 ? (
              <span className="font-mono text-xs text-success border border-success/30 bg-success/10 px-2 py-0.5 rounded-[2px]">
                Comparação Ativa ({intelligence.totalBatches} arquivos)
              </span>
            ) : (
              <span className="font-mono text-xs text-muted border border-border px-2 py-0.5 rounded-[2px]">
                Lote Único
              </span>
            )}
          </div>

          {intelligence.totalBatches < 2 ? (
            <div className="py-8 text-center text-xs text-muted space-y-1">
              <FolderOpen className="mx-auto size-6 text-muted/60" />
              <p className="font-medium text-title">Mais dados serão necessários para comparação histórica.</p>
              <p className="text-muted max-w-sm mx-auto">
                Ao importar dois ou mais extratos bancários na mesma sessão, o sistema gera comparativos de evolução e desvio de categorias automaticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sidebar border-b border-border text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Extrato / Lote</th>
                    <th className="px-4 py-2.5 text-right">Lançamentos</th>
                    <th className="px-4 py-2.5 text-right">Entradas (+)</th>
                    <th className="px-4 py-2.5 text-right">Saídas (-)</th>
                    <th className="px-4 py-2.5 text-right">Saldo Líquido</th>
                    <th className="px-4 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {intelligence.batchSummaries.map((bs) => (
                    <tr
                      key={bs.id}
                      className="hover:bg-sidebar/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-title flex items-center gap-2">
                        <FileSpreadsheet className="size-3.5 text-copper shrink-0" />
                        <span className="truncate max-w-xs">{bs.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-title">
                        {bs.txCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-success">
                        {formatBRL(bs.income)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-danger">
                        {formatBRL(bs.expenses)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          bs.net >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatBRL(bs.net)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => onSelectBatch(bs.id)}
                        >
                          Auditar lote →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ScrollDepthSection>
    </div>
  );
}
