import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useBatchesList } from "../../hooks/use-classifier";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface BatchHistoryViewProps {
  onOpenBatch: (batchId: number) => void;
  onGoToNewAnalysis: () => void;
}

type SortField = "date_desc" | "date_asc" | "volume_desc" | "tx_desc" | "confidence_desc";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "Extrato pontual";
  if (start && end) {
    if (start === end) return formatDate(start);
    return `${formatDate(start)} a ${formatDate(end)}`;
  }
  return formatDate(start || end);
}

export function BatchHistoryView({ onOpenBatch, onGoToNewAnalysis }: BatchHistoryViewProps) {
  const { data, isLoading, isError, refetch } = useBatchesList();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("date_desc");
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);

  const batches = data?.batches ?? [];

  // Filtragem e ordenação
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    // Busca textual por nome do arquivo
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((b) =>
        b.source_filename.toLowerCase().includes(term) ||
        b.id.toString().includes(term) ||
        b.top_categories?.some((c) => c.name.toLowerCase().includes(term))
      );
    }

    // Filtro por status
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "volume_desc") {
        const volA = Math.abs(a.total_income) + Math.abs(a.total_expenses);
        const volB = Math.abs(b.total_income) + Math.abs(b.total_expenses);
        return volB - volA;
      }
      if (sortBy === "tx_desc") {
        return b.total_transactions - a.total_transactions;
      }
      if (sortBy === "confidence_desc") {
        return b.average_confidence - a.average_confidence;
      }
      return 0;
    });

    return result;
  }, [batches, searchTerm, statusFilter, sortBy]);

  // Totais agregados do histórico
  const aggregateStats = useMemo(() => {
    const totalBatches = batches.length;
    const totalTransactions = batches.reduce((acc, b) => acc + b.total_transactions, 0);
    const totalVolume = batches.reduce((acc, b) => acc + Math.abs(b.total_income) + Math.abs(b.total_expenses), 0);
    const totalHoursSaved = batches.reduce((acc, b) => acc + b.hours_saved, 0);
    const totalFinancialSaved = batches.reduce((acc, b) => acc + b.financial_saved, 0);

    return {
      totalBatches,
      totalTransactions,
      totalVolume,
      totalHoursSaved: round(totalHoursSaved, 1),
      totalFinancialSaved: round(totalFinancialSaved, 2),
    };
  }, [batches]);

  function round(val: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  function toggleExpand(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedBatchId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-200" aria-label="Histórico de Análises">
      {/* 1. KPIs Rápidos do Histórico Acumulado */}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-[4px] border border-border bg-sidebar p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted text-[11px] uppercase tracking-wider font-semibold">
              <span>Lotes Auditados</span>
              <Layers className="size-3.5 text-copper" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-title">
              {aggregateStats.totalBatches}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {aggregateStats.totalTransactions.toLocaleString("pt-BR")} lançamentos registrados
            </p>
          </div>

          <div className="rounded-[4px] border border-border bg-sidebar p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted text-[11px] uppercase tracking-wider font-semibold">
              <span>Volume Total</span>
              <FileSpreadsheet className="size-3.5 text-success" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-title">
              {formatCurrency(aggregateStats.totalVolume)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Fluxo financeiro acumulado
            </p>
          </div>

          <div className="rounded-[4px] border border-border bg-sidebar p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted text-[11px] uppercase tracking-wider font-semibold">
              <span>Tempo Economizado</span>
              <Clock className="size-3.5 text-copper" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-action">
              {aggregateStats.totalHoursSaved}h
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              ~{Math.round(aggregateStats.totalHoursSaved * 60)} min de digitação manual
            </p>
          </div>

          <div className="rounded-[4px] border border-border bg-sidebar p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted text-[11px] uppercase tracking-wider font-semibold">
              <span>Economia Operacional</span>
              <Sparkles className="size-3.5 text-action" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-success">
              {formatCurrency(aggregateStats.totalFinancialSaved)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Retorno a R$ 11,00/hora
            </p>
          </div>
        </div>
      )}

      {/* 2. Barra de Controle & Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[4px] border border-border bg-sidebar p-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted" aria-hidden="true" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por arquivo, lote ou categoria..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Filtro de Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-[4px] border border-border bg-canvas px-2.5 text-xs text-title focus:border-copper focus:outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="processed">Classificados</option>
              <option value="exported">Exportados</option>
              <option value="uploaded">Prontos / Enviados</option>
              <option value="failed">Pendentes de correção</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[11px]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="h-9 rounded-[4px] border border-border bg-canvas px-2.5 text-xs text-title focus:border-copper focus:outline-none"
            >
              <option value="date_desc">Mais recentes</option>
              <option value="date_asc">Mais antigos</option>
              <option value="volume_desc">Maior volume financeiro</option>
              <option value="tx_desc">Mais transações</option>
              <option value="confidence_desc">Maior confiança</option>
            </select>
          </div>

          {/* Botão Atualizar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="size-9 text-muted hover:text-title"
            title="Atualizar lista"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 3. Tabela Editorial do Histórico */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 border border-border rounded-[4px] bg-sidebar/50">
          <LoaderCircle className="size-6 text-copper animate-spin mb-3" />
          <p className="text-xs text-muted">Carregando histórico de operações…</p>
        </div>
      )}

      {isError && (
        <div className="rounded-[4px] border border-danger/40 bg-danger/10 p-6 text-center space-y-3">
          <AlertCircle className="size-6 text-danger mx-auto" />
          <p className="text-xs font-medium text-danger">
            Não foi possível carregar o histórico de análises.
          </p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && filteredBatches.length === 0 && (
        <div className="rounded-[4px] border border-border bg-sidebar/50 px-6 py-16 text-center space-y-3">
          <Layers className="size-8 text-copper/60 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-title">
              {searchTerm || statusFilter !== "all"
                ? "Nenhum lote encontrado para os filtros selecionados"
                : "Nenhum lote histórico registrado"}
            </h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os termos de busca ou selecionar outro status de processamento."
                : "Seus extratos bancários importados e classificados ficarão salvos aqui com acesso imediato a métricas e relatórios sem necessidade de reprocessamento."}
            </p>
          </div>

          {!searchTerm && statusFilter === "all" && (
            <div className="pt-2">
              <Button onClick={onGoToNewAnalysis} size="sm">
                <Sparkles className="size-3.5 mr-1.5" />
                Iniciar Nova Análise
              </Button>
            </div>
          )}
        </div>
      )}

      {!isLoading && !isError && filteredBatches.length > 0 && (
        <div className="overflow-hidden rounded-[4px] border border-border bg-sidebar shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-canvas/80 font-semibold text-[11px] uppercase tracking-wider text-muted">
                  <th className="w-10 px-3 py-3 text-center"></th>
                  <th className="px-4 py-3">Arquivo / Lote</th>
                  <th className="px-4 py-3">Data / Período</th>
                  <th className="px-4 py-3 text-right">Lançamentos</th>
                  <th className="px-4 py-3 text-right">Saldo Líquido</th>
                  <th className="px-4 py-3 text-center">Confiança</th>
                  <th className="px-4 py-3 text-center">Economia</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBatches.map((batch) => {
                  const isExpanded = expandedBatchId === batch.id;
                  const isProcessed = batch.status === "processed" || batch.status === "exported";
                  const isFailed = batch.status === "failed";
                  const hasReviews = batch.review_count > 0;

                  return (
                    <tr
                      key={batch.id}
                      onClick={() => onOpenBatch(batch.id)}
                      className={cn(
                        "group cursor-pointer transition-colors duration-150",
                        isExpanded ? "bg-elevated/80" : "hover:bg-elevated/50"
                      )}
                    >
                      {/* Expandir detalhes */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(batch.id, e)}
                          className="rounded p-1 text-muted hover:bg-border hover:text-title transition-colors"
                          title={isExpanded ? "Recolher detalhes" : "Ver resumo de categorias"}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 text-copper" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Nome do Arquivo / ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-copper shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-title truncate max-w-[240px] group-hover:text-action transition-colors">
                              {batch.source_filename}
                            </p>
                            <p className="text-[10px] font-mono text-muted">
                              Lote #{batch.id} • {batch.source_format.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Data / Período do Extrato */}
                      <td className="px-4 py-3 text-muted">
                        <div className="space-y-0.5">
                          <p className="font-mono text-title text-[11px]">
                            {formatDate(batch.created_at)}
                          </p>
                          <p className="text-[10px] text-muted truncate max-w-[160px]">
                            {formatPeriod(batch.period_start, batch.period_end)}
                          </p>
                        </div>
                      </td>

                      {/* Quantidade de Lançamentos */}
                      <td className="px-4 py-3 text-right">
                        <div className="space-y-0.5 font-mono">
                          <p className="font-semibold text-title">
                            {batch.total_transactions}
                          </p>
                          {batch.duplicate_transactions > 0 && (
                            <p className="text-[10px] text-warning">
                              {batch.duplicate_transactions} duplicado(s)
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Saldo Líquido & Entradas/Saídas */}
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="space-y-0.5">
                          <p
                            className={cn(
                              "font-semibold",
                              batch.net_balance >= 0 ? "text-success" : "text-danger"
                            )}
                          >
                            {batch.net_balance >= 0 ? "+" : ""}
                            {formatCurrency(batch.net_balance)}
                          </p>
                          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted">
                            <span className="text-success flex items-center">
                              <ArrowUpRight className="size-2.5 mr-0.5" />
                              {formatCurrency(batch.total_income)}
                            </span>
                            <span>/</span>
                            <span className="text-danger flex items-center">
                              <ArrowDownRight className="size-2.5 mr-0.5" />
                              {formatCurrency(batch.total_expenses)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Confiança Média */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1 font-mono">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              batch.average_confidence >= 80
                                ? "text-action"
                                : batch.average_confidence >= 50
                                ? "text-warning"
                                : "text-muted"
                            )}
                          >
                            {batch.average_confidence > 0 ? `${batch.average_confidence.toFixed(1)}%` : "-"}
                          </span>
                          {hasReviews && (
                            <span className="text-[9px] font-sans text-warning border border-warning/30 bg-warning/10 px-1 py-0.2 rounded-[2px]">
                              {batch.review_count} revisão
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Economia Operacional */}
                      <td className="px-4 py-3 text-center font-mono">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-title">
                            {batch.hours_saved}h
                          </p>
                          <p className="text-[10px] text-muted">
                            {formatCurrency(batch.financial_saved)}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[10px] font-semibold",
                            isProcessed
                              ? "bg-success/10 text-success border border-success/30"
                              : isFailed
                              ? "bg-danger/10 text-danger border border-danger/30"
                              : "bg-warning/10 text-warning border border-warning/30"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isProcessed ? "bg-success" : isFailed ? "bg-danger" : "bg-warning"
                            )}
                          />
                          {batch.status === "exported"
                            ? "Exportado"
                            : batch.status === "processed"
                            ? "Classificado"
                            : batch.status === "failed"
                            ? "Erro"
                            : "Pronto"}
                        </span>
                      </td>

                      {/* Botão de Abertura Imediata */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBatch(batch.id);
                          }}
                          className="h-7 text-[11px] px-2.5 gap-1 hover:border-copper hover:text-action"
                        >
                          <Eye className="size-3" />
                          <span>Abrir Lote</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Renderização condicional da linha expandida */}
          {expandedBatchId && (
            <div className="border-t border-border/80 bg-canvas/90 p-4 animate-in fade-in duration-150">
              {(() => {
                const b = filteredBatches.find((item) => item.id === expandedBatchId);
                if (!b) return null;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="copper">VISÃO RÁPIDA DE CATEGORIAS</Badge>
                        <span className="text-xs text-title font-semibold">
                          {b.source_filename}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onOpenBatch(b.id)}
                        className="h-7 text-xs"
                      >
                        <ExternalLink className="size-3 mr-1" />
                        Abrir Análise Completa
                      </Button>
                    </div>

                    {b.top_categories && b.top_categories.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        {b.top_categories.map((cat, idx) => (
                          <div
                            key={cat.name}
                            className="rounded-[4px] border border-border bg-sidebar p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-title truncate max-w-[130px]" title={cat.name}>
                                #{idx + 1} {cat.name}
                              </span>
                              <span className="font-mono text-copper font-bold">
                                {cat.percentage}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                              <span>{cat.count} reg.</span>
                              <span>{formatCurrency(cat.total)}</span>
                            </div>
                            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-copper"
                                style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        Nenhum detalhe de categorias disponível para este lote.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
