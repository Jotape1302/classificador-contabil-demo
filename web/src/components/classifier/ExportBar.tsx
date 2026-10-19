import { useState } from "react";
import { Download, FileCode, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { downloadExport } from "../../lib/api";
import type { Batch, ExportFormat } from "../../lib/types";
import { Button } from "../ui/button";

const visibleFormats: {
  value: ExportFormat;
  label: string;
  sublabel: string;
  icon: typeof FileText;
}[] = [
  {
    value: "pdf",
    label: "Relatório Executivo (PDF)",
    sublabel: "Documento analítico para impressão e diretoria",
    icon: FileText,
  },
  {
    value: "html",
    label: "Dashboard Interativo (HTML)",
    sublabel: "Visualização standalone completa e auditada",
    icon: FileCode,
  },
  {
    value: "xlsx",
    label: "Planilha Estruturada (XLSX)",
    sublabel: "Dados contábeis com fórmulas e conciliação",
    icon: FileSpreadsheet,
  },
];

export function ExportBar({
  batch,
  onMessage,
}: {
  batch: Batch;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const enabled = batch.status === "processed" || batch.status === "exported";

  async function download(format: ExportFormat) {
    setDownloading(format);
    try {
      await downloadExport(batch.id, format, batch.source_filename);
      onMessage(`Relatório ${format.toUpperCase()} exportado com sucesso.`);
    } catch (error) {
      onMessage(error instanceof Error && error.message ? error.message : "Não foi possível gerar o arquivo de exportação.", true);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-border bg-sidebar p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-[3px] border border-copper/30 bg-copper/10 p-2 text-copper">
          <Download className="size-4" />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-title">
            Exportação Executiva & Relatórios
          </h3>
          <p className="text-[11px] text-muted">
            Formatos padronizados prontos para apresentação e análise contábil
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {visibleFormats.map((format) => {
          const Icon = format.icon;
          const isDownloading = downloading === format.value;

          return (
            <Button
              key={format.value}
              size="sm"
              variant="secondary"
              disabled={!enabled || downloading !== null}
              onClick={() => download(format.value)}
              className="h-8.5 text-xs font-medium border-border hover:border-copper/60 hover:text-action transition-all"
              title={format.sublabel}
            >
              {isDownloading ? (
                <LoaderCircle className="size-3.5 animate-spin mr-1.5 text-copper" />
              ) : (
                <Icon className="size-3.5 mr-1.5 text-copper/80 group-hover:text-copper" />
              )}
              {format.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
