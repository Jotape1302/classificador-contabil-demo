/**
 * Constantes globais e parâmetros de negócio da Zaeron.
 */

export const APP_VERSION = "0.3.0";
export const APP_VERSION_DISPLAY = "v0.3.0";

// Valor médio por hora de um operador contábil (R$ 11,00/h)
export const DEFAULT_HOURLY_RATE = 11.0;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function calculateHoursSaved(processedCount: number): number {
  if (processedCount <= 0) return 0.0;
  return Math.max(0.2, Number((processedCount * 0.025).toFixed(1)));
}

export function calculateFinancialSavings(
  hoursSaved: number,
  hourlyRate: number = DEFAULT_HOURLY_RATE,
): number {
  if (hoursSaved <= 0) return 0.0;
  return Number((hoursSaved * hourlyRate).toFixed(2));
}

/**
 * Sanitiza e gera nome de arquivo profissional e seguro sem fallbacks genéricos.
 */
export function sanitizeExportFilename(
  originalFilename?: string | null,
  format: string = "xlsx",
  prefix: string = "analise_contabil",
): string {
  const extension = format.toLowerCase().replace(/^\./, "");
  
  if (originalFilename && originalFilename.trim()) {
    // Remove extensão existente e caracteres inseguros
    const cleanBase = originalFilename
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();

    if (cleanBase && cleanBase !== "anonymous" && cleanBase !== "extrato") {
      return `${cleanBase}.${extension}`;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return `${prefix}_${today}.${extension}`;
}
