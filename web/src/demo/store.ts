// Estado da demonstração: vive no localStorage do visitante (nada sai do navegador).
// O histórico inicial é gerado pelo próprio motor a partir de extratos fictícios.
import type { AcademyCertificate, QuizResult } from "../features/academy/types";
import type { Batch, BatchExecutionItem, Rule, Transaction, User } from "../lib/types";
import { classify, cleanBankDescription, generateAccountingHistory, normalizeText, type OfficeRule } from "./engine";
import { parseOfx, sampleOfx, type ParsedRow } from "./parsers";

export type StoredBatch = Omit<Batch, "metrics"> & {
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  zero_cost_percent: number;
};

export type DemoState = {
  loggedIn: boolean;
  user: User;
  profile: { erp_system: string | null; client_range: string | null };
  pending: { name: string; email: string; office_name?: string } | null;
  batches: StoredBatch[];
  processedHashes: string[];
  rules: Rule[];
  executions: BatchExecutionItem[];
  seq: { batch: number; tx: number; rule: number; exec: number; cert: number };
  academy: {
    accessed: string[];
    completed: string[];
    latest: Record<string, { score: number; passed: boolean }>;
    attempts: Record<string, QuizResult>;
  };
  certificates: AcademyCertificate[];
};

const KEY = "zaeron-demo-v1";
export const HOURLY_RATE = 11;
export const DEMO_USER_EMAIL = "demo@zaeron.example";

const AI_TERMS = ["ia", "gemini", "gpt", "openai", "inteligência", "deepseek"];
export const isAiSource = (source: string) => AI_TERMS.some((t) => source.toLowerCase().includes(t));
export const hoursSaved = (count: number) => (count > 0 ? Math.max(0.2, Math.round(count * 0.025 * 10) / 10) : 0);
export const money = (n: number) => Math.round(n * 100) / 100;

const hash = (date: string, amount: number, clean: string) => `${date}|${amount.toFixed(2)}|${normalizeText(clean)}`;

function officeRules(state: DemoState): OfficeRule[] {
  return state.rules.map((r) => ({ ...r }));
}

export function createBatch(state: DemoState, filename: string, format: string, rows: ParsedRow[], at = new Date()): StoredBatch {
  const seen = new Set(state.processedHashes);
  const inBatch = new Set<string>();
  const transactions: Transaction[] = rows.map((row, position) => {
    const clean = cleanBankDescription(row.description);
    const h = hash(row.date, row.amount, clean);
    const duplicate = seen.has(h) || inBatch.has(h);
    inBatch.add(h);
    return {
      id: ++state.seq.tx,
      position,
      date: row.date,
      original_description: row.description,
      clean_description: clean,
      amount: money(row.amount),
      transaction_type: row.amount < 0 ? "Débito" : "Crédito",
      category: "Pendente",
      debit_account: null,
      credit_account: null,
      accounting_history: generateAccountingHistory(clean, "Pendente", row.amount < 0),
      history_code: null,
      classification_source: "Não classificado",
      confidence: 0,
      is_duplicate: duplicate,
      version: 1,
    };
  });
  const iso = at.toISOString();
  const batch: StoredBatch = {
    id: ++state.seq.batch,
    source_filename: filename,
    source_format: format,
    status: "uploaded",
    total_transactions: transactions.length,
    duplicate_transactions: transactions.filter((t) => t.is_duplicate).length,
    processed_transactions: 0,
    version: 1,
    error_message: null,
    transactions,
    created_at: iso,
    updated_at: iso,
    processed_at: null,
    zero_cost_percent: 0,
  };
  state.batches.push(batch);
  return batch;
}

/** Mesma sequência de ClassifierService.process + complete_processing. */
export function processBatch(state: DemoState, batch: StoredBatch, at = new Date()) {
  if (batch.status === "processed" || batch.status === "exported") return;
  const rules = officeRules(state);
  const processable = batch.transactions.filter((t) => !t.is_duplicate);
  let local = 0;
  for (const t of processable) {
    const { result, local: isLocal } = classify(t.original_description, t.clean_description, t.amount, rules);
    if (isLocal) local++;
    if (result.rule_id) {
      const rule = state.rules.find((r) => r.id === result.rule_id);
      if (rule) rule.times_applied += 1;
    }
    Object.assign(t, {
      category: result.category,
      debit_account: result.debit_account || null,
      credit_account: result.credit_account || null,
      accounting_history: generateAccountingHistory(t.clean_description, result.category, t.amount < 0),
      history_code: result.history_code || null,
      classification_source: result.source,
      confidence: result.confidence,
    });
    state.processedHashes.push(hash(t.date, t.amount, t.clean_description));
  }
  const iso = at.toISOString();
  const aiMatched = processable.filter((t) => isAiSource(t.classification_source)).length;
  const rulesMatched = processable.filter((t) => !isAiSource(t.classification_source) && !["não classificado", "pendente", ""].includes(t.classification_source.toLowerCase())).length;
  const hours = hoursSaved(processable.length);
  const zeroCost = processable.length ? (local / processable.length) * 100 : 0;
  state.executions.push({
    id: ++state.seq.exec,
    batch_id: batch.id,
    filename: batch.source_filename,
    total_rows: processable.length,
    rules_matched: rulesMatched,
    ai_matched: aiMatched,
    hours_saved: hours,
    financial_saved: money(hours * HOURLY_RATE),
    zero_cost_percent: Math.round(zeroCost * 10) / 10,
    created_at: iso,
  });
  Object.assign(batch, {
    status: "processed",
    processed_transactions: processable.length,
    zero_cost_percent: zeroCost,
    processed_at: iso,
    updated_at: iso,
    version: batch.version + 1,
  });
}

function seed(): DemoState {
  const now = new Date().toISOString();
  const rule = (id: number, search_term: string, category: string, debit: string, credit: string, code: string, times: number): Rule => ({
    id, search_term, category, debit_account: debit, credit_account: credit, history_code: code, times_applied: times, created_at: now, updated_at: now,
  });
  const state: DemoState = {
    loggedIn: false,
    user: {
      id: 1,
      name: "Carla Mendes",
      email: DEMO_USER_EMAIL,
      office_name: "Mendes & Associados Contabilidade",
      city: "Curitiba",
      state: "PR",
      is_verified: true,
      plan_tier: "pro",
      monthly_usage_count: 0,
      terms_accepted_at: now,
      privacy_accepted_at: now,
      terms_version: "1.0",
    },
    profile: { erp_system: "Domínio", client_range: "21-50" },
    pending: null,
    batches: [],
    processedHashes: [],
    rules: [
      rule(1, "ESTUDIO DELTA", "Serviços de Terceiros", "3.1.2.05", "1.1.1.02", "120", 4),
      rule(2, "FORNECEDOR 88213", "Materiais de Escritório", "3.1.3.01", "1.1.1.02", "115", 2),
      rule(3, "PADARIA DO BAIRRO", "Alimentação", "3.1.4.02", "1.1.1.02", "130", 6),
    ],
    executions: [],
    seq: { batch: 0, tx: 0, rule: 3, exec: 0, cert: 0 },
    academy: { accessed: [], completed: [], latest: {}, attempts: {} },
    certificates: [],
  };
  // Três meses anteriores já processados, para histórico, impacto e resumo não começarem vazios.
  for (const offset of [3, 2, 1]) {
    const at = new Date();
    at.setDate(1);
    at.setMonth(at.getMonth() - offset);
    at.setDate(28);
    const label = at.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }).replace("/", "-");
    const batch = createBatch(state, `extrato-banco-${label}.ofx`, "ofx", parseOfx(sampleOfx(offset)), at);
    processBatch(state, batch, at);
  }
  return state;
}

let cache: DemoState | null = null;

export function loadState(): DemoState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw) as DemoState;
  } catch {
    cache = null;
  }
  cache ??= seed();
  return cache;
}

export function saveState() {
  try {
    if (cache) localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Sem armazenamento (aba anônima/bloqueada): a demo segue só em memória.
  }
}

export function resetState() {
  cache = seed();
  saveState();
}
