import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  History,
  LayoutDashboard,
  LoaderCircle,
  Play,
  PlusCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useBatch, useProcessBatch } from "../../hooks/use-classifier";
import { api } from "../../lib/api";
import type { Batch, User } from "../../lib/types";
import { cn } from "../../lib/utils";
import { HelpSupportView } from "../help/HelpSupportView";
import { SettingsScreen } from "../settings/SettingsScreen";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { BatchHistoryView } from "./BatchHistoryView";
import { ExecutiveIntelligenceDashboard } from "./ExecutiveIntelligenceDashboard";
import { ExportBar } from "./ExportBar";
import { MetricsGrid } from "./MetricsGrid";
import { RulesManager } from "./RulesManager";
import { Sidebar } from "./Sidebar";
import { TransactionDataTable } from "./TransactionDataTable";
import { UploadDropzone } from "./UploadDropzone";

export function Dashboard({ user }: { user: User }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const viewParam = new URLSearchParams(location.search).get("view");

  // Identificação do modo / sub-aba inicial
  const isHistoryPath =
    location.pathname === "/history" ||
    location.pathname === "/operation/history" ||
    new URLSearchParams(location.search).get("tab") === "history";

  const [operationSection, setOperationSection] = useState<"analysis" | "history">(
    isHistoryPath ? "history" : "analysis"
  );

  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState<number | "summary">("summary");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [loadingHistoricalBatch, setLoadingHistoricalBatch] = useState(false);

  // Sincroniza sub-aba se a URL mudar externamente
  useEffect(() => {
    if (location.pathname === "/history" || location.pathname === "/operation/history") {
      setOperationSection("history");
    } else if (
      location.pathname === "/" ||
      location.pathname === "/operation" ||
      location.pathname.startsWith("/batches/") ||
      location.pathname.startsWith("/operation/batches/")
    ) {
      setOperationSection("analysis");
    }
  }, [location.pathname]);

  // Deep linking: Carregar lote por ID direto da rota /batches/:batchId
  const urlBatchIdStr = params.batchId;
  useEffect(() => {
    if (!urlBatchIdStr) return;
    const bId = parseInt(urlBatchIdStr, 10);
    if (!isNaN(bId) && bId > 0) {
      const alreadyLoaded = batches.some((b) => b.id === bId);
      if (!alreadyLoaded) {
        setLoadingHistoricalBatch(true);
        api
          .batch(bId)
          .then((loadedBatch) => {
            setBatches((prev) => (prev.some((b) => b.id === loadedBatch.id) ? prev : [...prev, loadedBatch]));
            setActiveTab(loadedBatch.id);
            setOperationSection("analysis");
          })
          .catch(() => {
            message(`Não foi possível carregar o lote #${bId}.`, true);
          })
          .finally(() => {
            setLoadingHistoricalBatch(false);
          });
      } else {
        setActiveTab(bId);
        setOperationSection("analysis");
      }
    }
  }, [urlBatchIdStr]);

  // Active batch selection
  const activeBatchId = typeof activeTab === "number" ? activeTab : null;
  const batchQuery = useBatch(activeBatchId);
  const process = useProcessBatch();

  // Atualiza lote ativo quando a query recarrega
  const currentBatch = useMemo(() => {
    if (!activeBatchId) return null;
    if (batchQuery.data && batchQuery.data.id === activeBatchId) {
      return batchQuery.data;
    }
    return batches.find((b) => b.id === activeBatchId) || null;
  }, [activeBatchId, batchQuery.data, batches]);

  // Atualiza lista de lotes quando um lote individual é modificado/processado
  useEffect(() => {
    if (batchQuery.data) {
      setBatches((prev) =>
        prev.map((b) => (b.id === batchQuery.data.id ? batchQuery.data : b))
      );
    }
  }, [batchQuery.data]);

  if (viewParam === "rules") {
    return <RulesManager user={user} />;
  }

  if (viewParam === "settings") {
    return <SettingsScreen user={user} />;
  }

  if (viewParam === "help") {
    return <HelpSupportView user={user} />;
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const message = (text: string, error = false) => setNotice({ text, error });

  function handleProcess(bId: number) {
    process.mutate(bId);
  }

  function handleBatchUploaded(uploaded: Batch) {
    setBatches((prev) => {
      const exists = prev.some((b) => b.id === uploaded.id);
      if (exists) {
        return prev.map((b) => (b.id === uploaded.id ? uploaded : b));
      }
      return [...prev, uploaded];
    });
    setActiveTab(uploaded.id);
    setOperationSection("analysis");
    message("Lote carregado e pronto para auditoria.");
  }

  function handleMultipleBatchesUploaded(newBatches: Batch[]) {
    setBatches((prev) => {
      const map = new Map<number, Batch>();
      prev.forEach((b) => map.set(b.id, b));
      newBatches.forEach((b) => map.set(b.id, b));
      return Array.from(map.values());
    });
    // Se enviou múltiplos lotes, direciona para o Resumo Consolidado
    setActiveTab(newBatches.length > 1 ? "summary" : newBatches[0]?.id ?? "summary");
    setOperationSection("analysis");
    message(`${newBatches.length} lote(s) adicionados à sessão.`);
  }

  function removeBatchTab(bId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const remaining = batches.filter((b) => b.id !== bId);
    setBatches(remaining);
    if (activeTab === bId) {
      setActiveTab(remaining.length > 0 ? "summary" : "summary");
    }
  }

  // Abertura imediata de lote a partir do histórico (ZERO RECLASSIFICAÇÃO)
  async function handleOpenHistoricalBatch(batchId: number) {
    // Se já está na sessão ativa, basta focar na aba
    const existing = batches.find((b) => b.id === batchId);
    if (existing) {
      setActiveTab(existing.id);
      setOperationSection("analysis");
      navigate(`/batches/${batchId}`);
      message(`Lote #${batchId} (${existing.source_filename}) carregado.`);
      return;
    }

    setLoadingHistoricalBatch(true);
    try {
      const loaded = await api.batch(batchId);
      setBatches((prev) => [...prev.filter((b) => b.id !== loaded.id), loaded]);
      setActiveTab(loaded.id);
      setOperationSection("analysis");
      navigate(`/batches/${batchId}`);
      message(`Lote histórico #${batchId} (${loaded.source_filename}) reaberto.`);
    } catch {
      message("Não foi possível carregar os dados deste lote histórico.", true);
    } finally {
      setLoadingHistoricalBatch(false);
    }
  }

  const hasBatches = batches.length > 0;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1680px] space-y-6">
          {/* Header Superior Editorial */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="copper">OPERAÇÃO CONTÁBIL</Badge>
                {hasBatches && operationSection === "analysis" && (
                  <span className="font-mono text-[11px] text-muted border border-border px-2 py-0.5 rounded-[2px]">
                    {batches.length} {batches.length === 1 ? "lote ativo" : "lotes ativos"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-title">
                Conciliação & Auditoria Bancária
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted">
                Importe múltiplos extratos, audite classificações e transforme movimentações em análises financeiras e operacionais.
              </p>
            </div>

            {operationSection === "analysis" && currentBatch?.status === "uploaded" && (
              <Button
                onClick={() => handleProcess(currentBatch.id)}
                disabled={process.isPending}
                className="h-9"
              >
                {process.isPending ? (
                  <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Play className="size-3.5 mr-1.5" />
                )}
                {process.isPending ? "Classificando…" : "Classificar lote ativo"}
              </Button>
            )}

            {operationSection === "analysis" && currentBatch?.status === "failed" && (
              <Button onClick={() => handleProcess(currentBatch.id)} className="h-9">
                <RefreshCw className="size-3.5 mr-1.5" />
                Tentar novamente
              </Button>
            )}
          </header>

          {/* Sub-navegação Editorial: NOVA ANÁLISE / HISTÓRICO */}
          <nav
            className="flex items-center gap-8 border-b border-border text-xs font-semibold uppercase tracking-wider"
            aria-label="Sub-navegação da Operação"
          >
            <button
              type="button"
              onClick={() => {
                setOperationSection("analysis");
                navigate(activeBatchId ? `/batches/${activeBatchId}` : "/");
              }}
              className={cn(
                "relative pb-3 transition-colors flex items-center gap-2",
                operationSection === "analysis"
                  ? "text-action font-bold"
                  : "text-muted hover:text-title"
              )}
            >
              <PlusCircle className="size-3.5 text-copper" />
              <span>Nova Análise</span>
              {operationSection === "analysis" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-copper shadow-[0_0_8px_rgba(200,117,61,0.4)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOperationSection("history");
                navigate("/history");
              }}
              className={cn(
                "relative pb-3 transition-colors flex items-center gap-2",
                operationSection === "history"
                  ? "text-action font-bold"
                  : "text-muted hover:text-title"
              )}
            >
              <History className="size-3.5 text-copper" />
              <span>Histórico</span>
              {operationSection === "history" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-copper shadow-[0_0_8px_rgba(200,117,61,0.4)]" />
              )}
            </button>
          </nav>

          {/* Sincronizando Lote Histórico */}
          {loadingHistoricalBatch && (
            <div className="flex items-center gap-3 rounded-[4px] border border-copper/30 bg-copper/10 p-3 text-xs text-copper">
              <LoaderCircle className="size-4 animate-spin" />
              <span>Carregando dados históricos do lote selecionado…</span>
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {operationSection === "history" && (
            <BatchHistoryView
              onOpenBatch={handleOpenHistoricalBatch}
              onGoToNewAnalysis={() => {
                setOperationSection("analysis");
                navigate("/");
              }}
            />
          )}

          {/* ABA NOVA ANÁLISE / SESSÃO ATIVA */}
          {operationSection === "analysis" && (
            <div className="space-y-6">
              {/* Área de Upload e Fila de Múltiplos Arquivos */}
              <UploadDropzone
                onUploaded={handleBatchUploaded}
                onBatchesUploaded={handleMultipleBatchesUploaded}
              />

              {/* Notificações e Erros */}
              {batchQuery.isError && (
                <div className="flex items-center gap-3 rounded-[4px] border border-danger/30 bg-danger/10 p-4 text-xs text-danger">
                  <AlertCircle className="size-4" />
                  Não foi possível sincronizar o lote selecionado.
                </div>
              )}

              {process.isError && (
                <div className="flex items-center gap-3 rounded-[4px] border border-danger/30 bg-danger/10 p-4 text-xs text-danger">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    {process.error?.message || "A classificação não foi concluída. Tente novamente."}
                  </span>
                </div>
              )}

              {/* Navegação por Abas em Lote */}
              {hasBatches && (
                <div className="space-y-6">
                  <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-1 text-xs">
                    {/* Aba 1: Resumo Consolidado */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("summary")}
                      className={`flex items-center gap-2 rounded-t-[4px] px-4 py-2.5 font-medium transition-colors ${
                        activeTab === "summary"
                          ? "border-b-2 border-copper bg-elevated text-title font-semibold shadow-sm"
                          : "text-muted hover:bg-elevated/50 hover:text-title"
                      }`}
                    >
                      <LayoutDashboard className="size-3.5 text-copper" />
                      <span>Resumo Consolidado</span>
                      <span className="font-mono rounded-[2px] bg-border px-1.5 py-0.2 text-[10px] text-muted">
                        {batches.length}
                      </span>
                    </button>

                    {/* Abas 2..N: Arquivos Individuais */}
                    {batches.map((b) => {
                      const isActive = activeTab === b.id;
                      const isProcessed = b.status === "processed" || b.status === "exported";
                      const isFailed = b.status === "failed";

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(b.id);
                            navigate(`/batches/${b.id}`);
                          }}
                          className={`group flex items-center gap-2 rounded-t-[4px] px-3.5 py-2.5 transition-colors max-w-[220px] ${
                            isActive
                              ? "border-b-2 border-copper bg-elevated text-title font-semibold shadow-sm"
                              : "text-muted hover:bg-elevated/50 hover:text-title"
                          }`}
                        >
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              isProcessed
                                ? "bg-success"
                                : isFailed
                                ? "bg-danger"
                                : "bg-warning"
                            }`}
                          />
                          <span className="truncate text-left text-xs">
                            {b.source_filename}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => removeBatchTab(b.id, e)}
                            className="ml-1 rounded p-0.5 text-muted hover:bg-sidebar hover:text-danger opacity-60 group-hover:opacity-100 transition-opacity"
                            title="Fechar aba"
                          >
                            <X className="size-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CONTEÚDO DA ABA ATIVA */}

                  {/* 1. Visão Resumo Consolidado (Executive Intelligence Dashboard) */}
                  {activeTab === "summary" && (
                    <ExecutiveIntelligenceDashboard
                      batches={batches}
                      onSelectBatch={(id) => {
                        setActiveTab(id);
                        navigate(`/batches/${id}`);
                      }}
                    />
                  )}

                  {/* 2. Visão do Lote Individual (Narrativa por Scroll 3D) */}
                  {activeTab !== "summary" && currentBatch && (
                    <div className="space-y-8">
                      {/* Barra de Exportação */}
                      <ExportBar
                        batch={currentBatch}
                        onMessage={message}
                      />

                      {/* Tabela de Lançamentos (Plano 02) */}
                      <TransactionDataTable
                        batch={currentBatch}
                        onMessage={message}
                      />

                      {/* Relatório e Dashboards Analíticos em Planos (Plano 01, 03, 04, 05, 06, 07) */}
                      <div className="pt-2">
                        <MetricsGrid
                          batch={currentBatch}
                          loading={batchQuery.isLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estado Vazio Inicial */}
              {!hasBatches && (
                <div className="rounded-[4px] border border-border bg-sidebar/50 px-6 py-16 text-center space-y-2">
                  <p className="text-sm font-semibold text-title">
                    Nenhum extrato importado no momento
                  </p>
                  <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                    Arraste um ou múltiplos extratos nos formatos OFX, CSV ou PDF para iniciar a conciliação automática com inteligência contábil e relatórios executivos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {notice && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2 rounded-[4px] border px-4 py-3 text-xs shadow-xl animate-in fade-in duration-200 ${
            notice.error
              ? "border-danger/40 bg-elevated text-danger"
              : "border-success/40 bg-elevated text-success"
          }`}
        >
          {notice.error ? <AlertCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          {notice.text}
        </div>
      )}
    </div>
  );
}
