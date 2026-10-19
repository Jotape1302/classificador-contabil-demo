import { sanitizeExportFilename } from "./constants";
import type {
  Batch,
  BatchHistoryListResponse,
  BatchMetricsResponse,
  CurrentUser,
  ExportFormat,
  ImpactMetricsResponse,
  ImpactPeriod,
  MetricsSummaryResponse,
  Rule,
  RuleCreatePayload,
  TransactionPatch,
} from "./types";


export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Modo demonstração (GitHub Pages): sem backend, as rotas são atendidas no navegador.
  if (import.meta.env.VITE_DEMO === "true") return (await import("../demo/mock-api")).demoRequest<T>(path, init);
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      detail?: string | Array<{ loc?: (string | number)[]; msg?: string; type?: string }> | Record<string, unknown>;
      message?: string;
      code?: string;
    };
    let errorMessage = "Não foi possível concluir a operação.";
    if (typeof payload.detail === "string") {
      errorMessage = payload.detail;
    } else if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      errorMessage = payload.detail.map((err) => err.msg || JSON.stringify(err)).join(". ");
    } else if (typeof payload.message === "string") {
      errorMessage = payload.message;
    }
    throw new ApiError(errorMessage, response.status, payload.code);
  }
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<CurrentUser>("/api/auth/me"),
  login: (email: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  registerStart: (payload: import("./types").RegisterStartPayload) =>
    request<{ message: string; email: string }>("/api/auth/register-start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyCode: (email: string, code: string) =>
    request<CurrentUser>("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  resendCode: (email: string) =>
    request<{ message: string }>("/api/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  register: (payload: {
    name: string;
    email: string;
    password: string;
    document_number: string;
    office_name?: string;
    terms_accepted?: boolean;
  }) =>
    request<{ user: import("./types").User; session_expires_at: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recordConsent: (terms_accepted = true, privacy_accepted = true, version = "1.0") =>
    request<{ message: string }>("/api/auth/consent", {
      method: "POST",
      body: JSON.stringify({ terms_accepted, privacy_accepted, version }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST", body: "{}" }),
  listBatches: () => request<BatchHistoryListResponse>("/api/classifier/batches"),
  batch: (batchId: number) => request<Batch>(`/api/classifier/batches/${batchId}`),
  process: (batchId: number) =>
    request<Batch>("/api/classifier/process", {
      method: "POST",
      body: JSON.stringify({ batch_id: batchId }),
    }),
  patchTransactions: (batch: Batch, transactions: TransactionPatch[]) =>
    request<Batch>(`/api/classifier/batches/${batch.id}/transactions`, {
      method: "PATCH",
      body: JSON.stringify({ batch_version: batch.version, transactions }),
    }),
  batchMetrics: (batchId: number) =>
    request<BatchMetricsResponse>(`/api/metrics/batches/${batchId}`),
  metricsSummary: () => request<MetricsSummaryResponse>("/api/metrics/summary"),
  impactMetrics: (period: ImpactPeriod = "month") =>
    request<ImpactMetricsResponse>(`/api/metrics/impact?period=${period}`),
  updateUser: (payload: {

    name?: string;
    email?: string;
    office_name?: string;
    erp_system?: string;
    client_range?: string;
  }) =>
    request<CurrentUser>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listRules: () => request<{ rules: Rule[] }>("/api/rules"),
  createRule: (payload: RuleCreatePayload) =>
    request<Rule>("/api/rules", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRule: (ruleId: number, payload: RuleCreatePayload) =>
    request<Rule>(`/api/rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteRule: (ruleId: number) =>
    request<{ message: string }>(`/api/rules/${ruleId}`, {
      method: "DELETE",
    }),
};

export function uploadStatement(
  file: File,
  onProgress: (percent: number) => void,
): Promise<Batch> {
  if (import.meta.env.VITE_DEMO === "true") return import("../demo/mock-api").then((m) => m.demoUpload(file, onProgress));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/classifier/upload");
    xhr.withCredentials = true;
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      const payload = JSON.parse(xhr.responseText || "{}") as Batch & {
        detail?: string;
        code?: string;
      };
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new ApiError(payload.detail ?? "Falha no upload.", xhr.status, payload.code));
    });
    xhr.addEventListener("error", () => reject(new ApiError("Conexão indisponível.", 0)));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export async function downloadExport(batchId: number, format: ExportFormat, originalFilename?: string) {
  if (import.meta.env.VITE_DEMO === "true") return (await import("../demo/mock-api")).demoExport(batchId, format, originalFilename);
  const response = await fetch("/api/classifier/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: batchId, format }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new ApiError(payload.detail ?? "Falha na exportação.", response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fallback = sanitizeExportFilename(originalFilename, format, `relatorio_lote_${batchId}`);
  const filename = match?.[1] && match[1] !== "anonymous" && !match[1].includes("anonymous") ? match[1] : fallback;
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
