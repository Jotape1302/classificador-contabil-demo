import { useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  LoaderCircle,
  Play,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api, uploadStatement } from "../../lib/api";
import type { Batch } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: string;
  progress: number;
  status: "queued" | "uploading" | "processing" | "completed" | "error";
  errorMessage?: string;
  batch?: Batch;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone({
  onUploaded,
  onBatchesUploaded,
}: {
  onUploaded?: (batch: Batch) => void;
  onBatchesUploaded?: (batches: Batch[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const validFiles: StagedFile[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (["ofx", "csv", "pdf"].includes(ext)) {
        validFiles.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          extension: ext.toUpperCase(),
          progress: 0,
          status: "queued",
        });
      }
    });

    if (validFiles.length > 0) {
      setStagedFiles((prev) => [...prev, ...validFiles]);
    }
  }

  async function addSampleStatement() {
    const { sampleOfx } = await import("../../demo/parsers");
    const month = new Date().toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }).replace("/", "-");
    addFiles([new File([sampleOfx()], `extrato-exemplo-${month}.ofx`, { type: "application/x-ofx" })]);
  }

  function removeStagedFile(id: string) {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function processQueue() {
    if (stagedFiles.length === 0 || isProcessingQueue) return;
    setIsProcessingQueue(true);

    const completedBatches: Batch[] = [];

    for (let i = 0; i < stagedFiles.length; i++) {
      const current = stagedFiles[i];
      if (current.status === "completed" && current.batch) {
        completedBatches.push(current.batch);
        continue;
      }

      // 1. Uploading
      setStagedFiles((prev) =>
        prev.map((f) =>
          f.id === current.id ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const batch = await uploadStatement(current.file, (p) => {
          setStagedFiles((prev) =>
            prev.map((f) => (f.id === current.id ? { ...f, progress: p } : f))
          );
        });

        // 2. Classifying
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === current.id ? { ...f, status: "processing", progress: 100 } : f
          )
        );

        let processedBatch = batch;
        try {
          processedBatch = await api.process(batch.id);
        } catch {
          // Mantém o batch criado mesmo se a classificação falhar
        }

        // 3. Completed
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === current.id
              ? { ...f, status: "completed", batch: processedBatch }
              : f
          )
        );

        completedBatches.push(processedBatch);
        if (onUploaded) onUploaded(processedBatch);
      } catch (err: any) {
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === current.id
              ? {
                  ...f,
                  status: "error",
                  errorMessage: err?.message || "Falha ao processar arquivo.",
                }
              : f
          )
        );
      }
    }

    setIsProcessingQueue(false);
    if (completedBatches.length > 0 && onBatchesUploaded) {
      onBatchesUploaded(completedBatches);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  const hasStaged = stagedFiles.length > 0;
  const queuedCount = stagedFiles.filter((f) => f.status === "queued").length;
  const completedCount = stagedFiles.filter((f) => f.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed bg-elevated px-6 py-6 transition-all duration-200",
          dragging
            ? "border-action bg-copper/10 scale-[1.002]"
            : "border-border hover:border-copper/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".ofx,.csv,.pdf"
          onChange={(event) => {
            if (event.target.files?.length) {
              addFiles(event.target.files);
              // Limpa o input para permitir selecionar o mesmo arquivo novamente se desejado
              event.target.value = "";
            }
          }}
        />

        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-copper/30 bg-copper/10 text-action sm:mb-0 sm:mr-4 shrink-0">
            {isProcessingQueue ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            ) : completedCount > 0 && queuedCount === 0 ? (
              <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            ) : (
              <UploadCloud className="size-6" aria-hidden="true" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-title">
              Importação em Lote e Conciliação Contábil
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Selecione um ou múltiplos extratos (OFX, CSV ou PDF) · até 10 MB cada · duplicidades verificadas automaticamente
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            {import.meta.env.VITE_DEMO === "true" && (
              <Button variant="secondary" size="sm" onClick={addSampleStatement} disabled={isProcessingQueue}>
                <FileText className="size-4 mr-1.5" />
                Usar extrato de exemplo
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessingQueue}
            >
              <FileUp className="size-4 mr-1.5" />
              {hasStaged ? "Adicionar mais" : "Selecionar arquivos"}
            </Button>
          </div>
        </div>
      </div>

      {/* Fila de Arquivos Selecionados / Em Processamento */}
      {hasStaged && (
        <div className="rounded-xl border border-border bg-sidebar p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-title">
                Fila de Arquivos ({stagedFiles.length})
              </span>
              {completedCount > 0 && (
                <Badge tone="success" className="text-[10px]">
                  {completedCount} concluído(s)
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {queuedCount > 0 && (
                <Button
                  size="sm"
                  onClick={processQueue}
                  disabled={isProcessingQueue}
                  className="h-8"
                >
                  {isProcessingQueue ? (
                    <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Play className="size-3.5 mr-1.5" />
                  )}
                  {isProcessingQueue
                    ? "Processando lote…"
                    : `Processar ${queuedCount} arquivo(s)`}
                </Button>
              )}
              {!isProcessingQueue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStagedFiles([])}
                  className="h-8 text-xs text-muted hover:text-danger"
                >
                  Limpar fila
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Arquivos com status individual */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stagedFiles.map((staged) => (
              <div
                key={staged.id}
                className="flex items-center justify-between rounded-lg border border-border/80 bg-elevated px-3.5 py-2.5 text-xs transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                  <div className="rounded bg-sidebar p-1.5 text-copper shrink-0">
                    {staged.extension === "PDF" ? (
                      <FileText className="size-4" />
                    ) : (
                      <FileSpreadsheet className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-title">{staged.name}</p>
                    <p className="text-[11px] text-muted">
                      {staged.extension} • {formatFileSize(staged.size)}
                    </p>
                  </div>
                </div>

                {/* Status e Ações */}
                <div className="flex items-center gap-3 shrink-0">
                  {staged.status === "queued" && (
                    <span className="text-[11px] text-muted font-medium">Aguardando</span>
                  )}
                  {staged.status === "uploading" && (
                    <span className="flex items-center gap-1.5 text-action text-[11px] font-semibold">
                      <LoaderCircle className="size-3 animate-spin" /> Enviando ({staged.progress}%)
                    </span>
                  )}
                  {staged.status === "processing" && (
                    <span className="flex items-center gap-1.5 text-copper text-[11px] font-semibold">
                      <LoaderCircle className="size-3 animate-spin" /> Classificando…
                    </span>
                  )}
                  {staged.status === "completed" && (
                    <span className="flex items-center gap-1.5 text-success text-[11px] font-semibold">
                      <CheckCircle2 className="size-3.5" /> Pronto
                    </span>
                  )}
                  {staged.status === "error" && (
                    <span className="flex items-center gap-1 text-danger text-[11px] font-semibold" title={staged.errorMessage}>
                      <AlertCircle className="size-3.5" /> Erro
                    </span>
                  )}

                  {!isProcessingQueue && staged.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => removeStagedFile(staged.id)}
                      className="text-muted hover:text-danger transition-colors p-1"
                      title="Remover arquivo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
