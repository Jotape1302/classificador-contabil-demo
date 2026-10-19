// API simulada do modo demonstração (VITE_DEMO=true): responde às mesmas rotas /api/* do
// FastAPI com os mesmos formatos, usando o estado local de store.ts.
import type { AcademyCertificate, AcademyCourse, AcademyLesson, QuizResult } from "../features/academy/types";
import { ApiError } from "../lib/api";
import { sanitizeExportFilename } from "../lib/constants";
import type {
  Batch,
  BatchHistoryItem,
  BatchMetricsResponse,
  CurrentUser,
  ExportFormat,
  FinancialSummary,
  ImpactMetricsResponse,
  ImpactTimeSeriesPoint,
  OperationalImpact,
  Rule,
  Transaction,
} from "../lib/types";
import { COURSE } from "./academy.generated";
import { generateAccountingHistory } from "./engine";
import { parseStatement } from "./parsers";
import {
  DEMO_USER_EMAIL,
  HOURLY_RATE,
  createBatch,
  hoursSaved,
  isAiSource,
  loadState,
  money,
  processBatch,
  saveState,
  type DemoState,
  type StoredBatch,
} from "./store";

const LESSON_PASSING_SCORE = 60;
const FINAL_PASSING_SCORE = 70;
const latency = (ms = 180) => new Promise((r) => setTimeout(r, ms + Math.random() * 120));

const fail = (status: number, detail: string, code?: string): never => {
  throw new ApiError(detail, status, code);
};

function body<T>(init?: RequestInit): T {
  try {
    return JSON.parse(typeof init?.body === "string" ? init.body : "{}") as T;
  } catch {
    return {} as T;
  }
}

function currentUser(state: DemoState): CurrentUser {
  const count = state.executions.reduce((n, e) => n + e.total_rows, 0);
  return {
    user: { ...state.user, monthly_usage_count: state.executions.length },
    profile: state.profile,
    quotas: {
      monthly_processes: state.executions.length,
      max_monthly_processes: null,
      monthly_transactions: count,
      max_monthly_transactions: null,
      plan_tier: state.user.plan_tier,
      monthly_usage_count: state.executions.length,
      max_monthly_usages: null,
    },
    onboarding_completed: true,
    terms_accepted: true,
  };
}

function findBatch(state: DemoState, id: number): StoredBatch {
  return state.batches.find((b) => b.id === id) ?? fail(404, "Lote não encontrado.", "batch_not_found");
}

/** batch_read: assertividade conta confiança >= 0.9. */
function batchRead(batch: StoredBatch): Batch {
  const processable = batch.transactions.filter((t) => !t.is_duplicate);
  const confident = processable.filter((t) => t.confidence >= 0.9).length;
  const { created_at: _c, updated_at: _u, processed_at: _p, zero_cost_percent, ...rest } = batch;
  return {
    ...rest,
    metrics: {
      hours_saved: Math.round(batch.processed_transactions * 0.025 * 10) / 10,
      accuracy_percent: processable.length ? Math.round((confident / processable.length) * 1000) / 10 : 0,
      zero_cost_percent: Math.round(zero_cost_percent * 10) / 10,
    },
    transactions: batch.transactions.map((t) => ({ ...t })),
  };
}

function historyItem(batch: StoredBatch): BatchHistoryItem {
  const processable = batch.transactions.filter((t) => !t.is_duplicate);
  const dates = processable.map((t) => t.date).sort();
  const income = processable.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = processable.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totals = new Map<string, { total: number; count: number }>();
  for (const t of processable) {
    const cur = totals.get(t.category) ?? { total: 0, count: 0 };
    cur.total += Math.abs(t.amount);
    cur.count += 1;
    totals.set(t.category, cur);
  }
  const all = [...totals.values()].reduce((s, c) => s + c.total, 0);
  const hours = hoursSaved(processable.length);
  return {
    id: batch.id,
    source_filename: batch.source_filename,
    source_format: batch.source_format,
    status: batch.status,
    total_transactions: batch.total_transactions,
    duplicate_transactions: batch.duplicate_transactions,
    processed_transactions: batch.processed_transactions,
    version: batch.version,
    created_at: batch.created_at,
    updated_at: batch.updated_at,
    processed_at: batch.processed_at,
    period_start: dates[0] ?? null,
    period_end: dates[dates.length - 1] ?? null,
    total_income: money(income),
    total_expenses: money(expenses),
    net_balance: money(income - expenses),
    average_confidence: processable.length ? Math.round((processable.reduce((s, t) => s + t.confidence, 0) / processable.length) * 1000) / 10 : 0,
    review_count: processable.filter((t) => t.confidence < 0.8 || ["pendente", "não classificado", ""].includes(t.category.toLowerCase())).length,
    hours_saved: hours,
    financial_saved: money(hours * HOURLY_RATE),
    top_categories: [...totals.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, c]) => ({ name, total: money(c.total), count: c.count, percentage: all ? Math.round((c.total / all) * 1000) / 10 : 0 })),
  };
}

/** _build_financial_and_operational_impact (assertividade: confiança >= 0.8). */
function impactOf(txs: Transaction[], processed: number): { financial: FinancialSummary; impact: OperationalImpact } {
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const volume = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const base = processed || txs.length;
  const confident = txs.filter((t) => t.confidence >= 0.8).length;
  const local = txs.filter((t) => t.classification_source !== "Não classificado" && !isAiSource(t.classification_source)).length;
  const hours = hoursSaved(processed);
  return {
    financial: {
      total_expenses: money(expenses),
      total_income: money(income),
      net_balance: money(income - expenses),
      average_ticket: txs.length ? money(volume / txs.length) : 0,
      total_transactions: txs.length,
    },
    impact: {
      hours_saved: hours,
      financial_savings: money(hours * HOURLY_RATE),
      accuracy_percent: base ? Math.round((confident / base) * 1000) / 10 : 0,
      zero_cost_percent: base ? Math.round((local / base) * 1000) / 10 : 0,
      total_processed_transactions: processed,
    },
  };
}

function impactMetrics(state: DemoState, period: string): ImpactMetricsResponse {
  const now = new Date();
  const p = (["week", "month", "year", "all"].includes(period) ? period : "month") as ImpactMetricsResponse["period"];
  let start: Date | null = null;
  if (p === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  } else if (p === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (p === "year") start = new Date(now.getFullYear(), 0, 1);
  const execs = state.executions
    .filter((e) => !start || new Date(e.created_at) >= start)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sum = (list: typeof execs) => ({
    hours_saved: Math.round(list.reduce((s, e) => s + e.hours_saved, 0) * 10) / 10,
    financial_saved: money(list.reduce((s, e) => s + money(e.hours_saved * HOURLY_RATE), 0)),
    total_rows: list.reduce((s, e) => s + e.total_rows, 0),
  });
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const local = (iso: string) => ymd(new Date(iso));
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const series: ImpactTimeSeriesPoint[] = [];
  const pushDay = (d: Date, label: string) => series.push({ date: ymd(d), label, ...sum(execs.filter((e) => local(e.created_at) === ymd(d))) });
  const pushMonth = (y: number, m: number, label: string) =>
    series.push({ date: `${y}-${String(m + 1).padStart(2, "0")}`, label, ...sum(execs.filter((e) => { const d = new Date(e.created_at); return d.getFullYear() === y && d.getMonth() === m; })) });
  if (p === "week") {
    ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].forEach((name, i) => {
      const d = new Date(start!.getFullYear(), start!.getMonth(), start!.getDate() + i);
      pushDay(d, `${name} (${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")})`);
    });
  } else if (p === "month") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      pushDay(d, `${String(day).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  } else if (p === "year") {
    months.forEach((name, m) => pushMonth(now.getFullYear(), m, name));
  } else {
    const oldest = execs.length ? new Date(execs[execs.length - 1].created_at) : new Date(now.getTime() - 180 * 86400000);
    for (let y = oldest.getFullYear(), m = oldest.getMonth(); y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth()); m === 11 ? (y++, (m = 0)) : m++) {
      pushMonth(y, m, `${months[m]}/${String(y).slice(-2)}`);
    }
  }
  const total = sum(execs);
  const rulesMatched = execs.reduce((s, e) => s + e.rules_matched, 0);
  return {
    period: p,
    kpis: {
      hours_saved: total.hours_saved,
      financial_saved: total.financial_saved,
      total_reconciled: total.total_rows,
      zero_cost_percent: total.total_rows ? Math.round((rulesMatched / total.total_rows) * 1000) / 10 : 0,
      hourly_rate: HOURLY_RATE,
    },
    time_series: series,
    history: execs,
  };
}

// ---------------------------------------------------------------- academy
type CourseLesson = (typeof COURSE.modules)[number]["lessons"][number];
const LESSONS: (CourseLesson & { module_key: string; module_title: string })[] = COURSE.modules
  .slice()
  .sort((a, b) => a.order - b.order)
  .flatMap((m) => m.lessons.slice().sort((a, b) => a.order - b.order).map((l) => ({ ...l, module_key: m.module_key, module_title: m.title })));
const safeQuestion = (q: { question_key: string; prompt: string; options: Record<string, string> }) => ({ question_key: q.question_key, prompt: q.prompt, options: { ...q.options } });
const unlocked = (state: DemoState, key: string) => {
  const index = LESSONS.findIndex((l) => l.lesson_key === key);
  if (index < 0) fail(404, "Aula não encontrada.", "lesson_not_found");
  return LESSONS.slice(0, index).every((l) => state.academy.completed.includes(l.lesson_key));
};
const nextLesson = (state: DemoState) => LESSONS.find((l) => !state.academy.completed.includes(l.lesson_key))?.lesson_key ?? null;

function course(state: DemoState): AcademyCourse {
  const { completed, latest } = state.academy;
  const complete = completed.length === LESSONS.length;
  return {
    course_key: COURSE.course_key,
    version: COURSE.version,
    title: COURSE.title,
    description: COURSE.description,
    estimated_duration_minutes: COURSE.estimated_duration_minutes,
    modules: COURSE.modules.map((m) => ({
      module_key: m.module_key,
      title: m.title,
      description: m.description,
      order: m.order,
      lessons: m.lessons.map((l) => {
        const isUnlocked = unlocked(state, l.lesson_key);
        const status: "completed" | "locked" | "in_progress" = completed.includes(l.lesson_key) ? "completed" : isUnlocked ? "in_progress" : "locked";
        return {
          lesson_key: l.lesson_key,
          title: l.title,
          order: l.order,
          estimated_minutes: l.estimated_minutes,
          passing_score: LESSON_PASSING_SCORE,
          status,
          is_unlocked: isUnlocked,
          score: latest[l.lesson_key]?.score ?? null,
          passed: latest[l.lesson_key]?.passed ?? null,
        };
      }),
    })),
    progress: {
      total_lessons: LESSONS.length,
      completed_lessons: completed.length,
      percentage: Math.round((completed.length / LESSONS.length) * 10000) / 100,
      is_complete: complete,
      continue_lesson_key: nextLesson(state),
    },
    final_quiz: {
      quiz_key: COURSE.quiz.quiz_key,
      title: COURSE.quiz.title,
      passing_score: FINAL_PASSING_SCORE,
      is_unlocked: complete,
      questions: complete ? COURSE.quiz.questions.map(safeQuestion) : [],
    },
  };
}

function grade(questions: readonly { question_key: string; correct_option: string; explanation: string }[], answers: Record<string, string>) {
  const correct = questions.filter((q) => answers[q.question_key] === q.correct_option).length;
  return {
    score: questions.length ? Math.round((correct / questions.length) * 10000) / 100 : 0,
    feedback: questions.map((q) => ({ question_key: q.question_key, correct: answers[q.question_key] === q.correct_option, explanation: q.explanation })),
  };
}

function submitQuiz(state: DemoState, payload: { kind: "lesson" | "final"; lesson_key?: string; attempt_token: string; answers: Record<string, string> }): QuizResult {
  const previous = state.academy.attempts[payload.attempt_token];
  if (previous) return { ...previous, is_new_attempt: false };
  let result: QuizResult;
  if (payload.kind === "lesson") {
    const lesson = LESSONS.find((l) => l.lesson_key === payload.lesson_key) ?? fail(404, "Aula não encontrada.", "lesson_not_found");
    if (!unlocked(state, lesson.lesson_key)) fail(409, "Mini-quiz bloqueado.", "lesson_locked");
    const { score, feedback } = grade(lesson.questions, payload.answers);
    const passed = score >= LESSON_PASSING_SCORE;
    state.academy.latest[lesson.lesson_key] = { score, passed };
    if (passed && !state.academy.completed.includes(lesson.lesson_key)) state.academy.completed.push(lesson.lesson_key);
    result = { kind: "lesson", lesson_key: lesson.lesson_key, attempt_token: payload.attempt_token, score, passing_score: LESSON_PASSING_SCORE, passed, is_new_attempt: true, feedback, next_lesson_key: nextLesson(state), certificate_id: null, certificate_code: null };
  } else {
    if (state.academy.completed.length !== LESSONS.length) fail(409, "Conclua todas as aulas antes do quiz final.", "quiz_locked");
    const { score, feedback } = grade(COURSE.quiz.questions, payload.answers);
    const passed = score >= FINAL_PASSING_SCORE;
    let cert = state.certificates[0];
    if (passed && !cert) {
      const code = `ZAC-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("")}`;
      cert = {
        id: ++state.seq.cert,
        status: "valid",
        public_code: code,
        recipient_name: state.user.name,
        course_title: COURSE.title,
        course_version: COURSE.version,
        score,
        duration_minutes: COURSE.estimated_duration_minutes,
        issued_at: new Date().toISOString(),
        validation_path: `/?certificado=${code}`,
      };
      state.certificates.push(cert);
    }
    result = { kind: "final", lesson_key: null, attempt_token: payload.attempt_token, score, passing_score: FINAL_PASSING_SCORE, passed, is_new_attempt: true, feedback, next_lesson_key: null, certificate_id: cert?.id ?? null, certificate_code: cert?.public_code ?? null };
  }
  state.academy.attempts[payload.attempt_token] = result;
  return result;
}

// ---------------------------------------------------------------- roteador
export async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await latency();
  const state = loadState();
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://demo.local");
  const route = `${method} ${url.pathname}`;
  const match = (pattern: RegExp) => url.pathname.match(pattern);
  const auth = () => (state.loggedIn ? state : fail(401, "Sessão expirada. Entre novamente.", "not_authenticated"));
  const done = <R>(value: R) => {
    saveState();
    return value as unknown as T;
  };

  // Rotas públicas
  if (route === "POST /api/auth/login") {
    state.loggedIn = true;
    return done({ message: "Sessão iniciada (demonstração)." });
  }
  if (route === "POST /api/auth/register-start") {
    const p = body<{ name: string; email: string; office_name?: string }>(init);
    state.pending = { name: p.name, email: p.email, office_name: p.office_name };
    return done({ message: "Na demonstração nenhum e-mail é enviado: digite qualquer código de 6 dígitos.", email: p.email });
  }
  if (route === "POST /api/auth/resend-code") return done({ message: "Demonstração: qualquer código de 6 dígitos é aceito." });
  if (route === "POST /api/auth/verify-code" || route === "POST /api/auth/register") {
    const p = body<{ code?: string; name?: string; email?: string; office_name?: string }>(init);
    if (route.endsWith("verify-code") && !/^\d{6}$/.test(p.code ?? "")) fail(400, "Informe os 6 dígitos do código.", "invalid_code");
    const reg = state.pending ?? { name: p.name ?? "", email: p.email ?? "", office_name: p.office_name };
    Object.assign(state.user, { name: reg.name || state.user.name, email: reg.email || DEMO_USER_EMAIL, office_name: reg.office_name || state.user.office_name });
    state.pending = null;
    state.loggedIn = true;
    return done(route.endsWith("register") ? { user: state.user, session_expires_at: new Date(Date.now() + 8 * 3600000).toISOString() } : currentUser(state));
  }
  const pub = match(/^\/api\/public\/certificates\/([^/]+)$/);
  if (method === "GET" && pub) {
    const cert = state.certificates.find((c) => c.public_code === decodeURIComponent(pub[1]).toUpperCase()) ?? fail(404, "Certificado não encontrado.", "certificate_not_found");
    const { status, public_code, recipient_name, course_title, issued_at, duration_minutes } = cert;
    return done({ status, public_code, recipient_name, course_title, issued_at, duration_minutes });
  }

  auth();
  if (route === "GET /api/auth/me") return done(currentUser(state));
  if (route === "POST /api/auth/logout") {
    state.loggedIn = false;
    return done({ message: "Sessão encerrada." });
  }
  if (route === "POST /api/auth/consent") return done({ message: "Consentimento registrado." });
  if (route === "POST /api/auth/change-password") return done({ message: "Demonstração: nenhuma senha é armazenada." });
  if (route === "PATCH /api/users/me") {
    const p = body<{ name?: string; email?: string; office_name?: string; erp_system?: string; client_range?: string }>(init);
    if (p.name) state.user.name = p.name;
    if (p.email) state.user.email = p.email;
    if (p.office_name !== undefined) state.user.office_name = p.office_name;
    if (p.erp_system !== undefined) state.profile.erp_system = p.erp_system;
    if (p.client_range !== undefined) state.profile.client_range = p.client_range;
    return done(currentUser(state));
  }

  // Classificador
  if (route === "GET /api/classifier/batches") {
    const items = state.batches.slice().reverse().map(historyItem);
    return done({ batches: items, total: items.length });
  }
  let m = match(/^\/api\/classifier\/batches\/(\d+)$/);
  if (method === "GET" && m) return done(batchRead(findBatch(state, Number(m[1]))));
  if (route === "POST /api/classifier/process") {
    const batch = findBatch(state, body<{ batch_id: number }>(init).batch_id);
    await latency(700);
    processBatch(state, batch);
    return done(batchRead(batch));
  }
  m = match(/^\/api\/classifier\/batches\/(\d+)\/transactions$/);
  if (method === "PATCH" && m) {
    const batch = findBatch(state, Number(m[1]));
    const p = body<{ batch_version: number; transactions: (Partial<Transaction> & { id: number; version: number })[] }>(init);
    if (batch.status !== "processed" && batch.status !== "exported") fail(409, "Classifique o lote antes de editar.", "batch_state_conflict");
    if (batch.version !== p.batch_version) fail(409, "O lote foi alterado em outra sessão. Recarregue.", "optimistic_lock");
    for (const u of p.transactions) {
      const t = batch.transactions.find((x) => x.id === u.id) ?? fail(404, "Transação não encontrada.");
      if (t.version !== u.version) fail(409, "A transação foi alterada em outra sessão. Recarregue.", "optimistic_lock");
      for (const field of ["category", "debit_account", "credit_account", "accounting_history", "history_code"] as const) {
        if (field in u) (t as Record<string, unknown>)[field] = u[field] || null;
      }
      if ("category" in u && !("accounting_history" in u)) t.accounting_history = generateAccountingHistory(t.clean_description, t.category, t.amount < 0);
      t.classification_source = "Edição manual";
      t.confidence = 1;
      t.version += 1;
    }
    batch.version += 1;
    batch.updated_at = new Date().toISOString();
    return done(batchRead(batch));
  }

  // Métricas
  m = match(/^\/api\/metrics\/batches\/(\d+)$/);
  if (method === "GET" && m) {
    const batch = findBatch(state, Number(m[1]));
    const txs = batch.transactions.filter((t) => !t.is_duplicate);
    const res: BatchMetricsResponse = {
      batch_id: batch.id,
      source_filename: batch.source_filename,
      status: batch.status,
      total_transactions: batch.total_transactions,
      duplicate_transactions: batch.duplicate_transactions,
      processed_transactions: batch.processed_transactions,
      ...impactOf(txs, batch.processed_transactions),
    };
    return done(res);
  }
  if (route === "GET /api/metrics/summary") {
    const txs = state.batches.flatMap((b) => b.transactions.filter((t) => !t.is_duplicate));
    const processed = state.batches.reduce((s, b) => s + b.processed_transactions, 0);
    return done({
      total_batches: state.batches.length,
      total_transactions: state.batches.reduce((s, b) => s + b.total_transactions, 0),
      duplicate_transactions: state.batches.reduce((s, b) => s + b.duplicate_transactions, 0),
      processed_transactions: processed,
      ...impactOf(txs, processed),
    });
  }
  if (route === "GET /api/metrics/impact") return done(impactMetrics(state, url.searchParams.get("period") ?? "month"));

  // Regras do escritório
  if (route === "GET /api/rules") return done({ rules: state.rules.slice().sort((a, b) => b.times_applied - a.times_applied) });
  if (route === "POST /api/rules") {
    const p = body<Partial<Rule>>(init);
    const term = (p.search_term ?? "").trim().toUpperCase();
    if (term.length < 2 || !p.category) fail(422, "Informe o termo de busca e a categoria.");
    const now = new Date().toISOString();
    let rule = state.rules.find((r) => r.search_term === term);
    if (!rule) {
      rule = { id: ++state.seq.rule, search_term: term, category: "", debit_account: null, credit_account: null, history_code: null, times_applied: 1, created_at: now, updated_at: now };
      state.rules.push(rule);
    }
    Object.assign(rule, { category: p.category, debit_account: p.debit_account || null, credit_account: p.credit_account || null, history_code: p.history_code || null, updated_at: now });
    return done(rule);
  }
  m = match(/^\/api\/rules\/(\d+)$/);
  if (m && method === "PUT") {
    const rule = state.rules.find((r) => r.id === Number(m![1])) ?? fail(404, "Regra não encontrada.");
    const p = body<Partial<Rule>>(init);
    Object.assign(rule, {
      search_term: (p.search_term ?? rule.search_term).trim().toUpperCase(),
      category: p.category ?? rule.category,
      debit_account: p.debit_account || null,
      credit_account: p.credit_account || null,
      history_code: p.history_code || null,
      updated_at: new Date().toISOString(),
    });
    return done(rule);
  }
  if (m && method === "DELETE") {
    const before = state.rules.length;
    state.rules = state.rules.filter((r) => r.id !== Number(m![1]));
    if (state.rules.length === before) fail(404, "Regra não encontrada.");
    return done({ message: "Regra removida." });
  }

  // Academy
  if (route === "GET /api/academy/course") return done(course(state));
  m = match(/^\/api\/academy\/lessons\/([^/]+)$/);
  if (method === "GET" && m) {
    const key = decodeURIComponent(m[1]);
    const lesson = LESSONS.find((l) => l.lesson_key === key) ?? fail(404, "Aula não encontrada.", "lesson_not_found");
    if (!unlocked(state, key)) fail(409, "Conclua as aulas anteriores para acessar esta aula.", "lesson_locked");
    if (!state.academy.accessed.includes(key)) state.academy.accessed.push(key);
    const res: AcademyLesson = {
      lesson_key: lesson.lesson_key,
      module_key: lesson.module_key,
      module_title: lesson.module_title,
      title: lesson.title,
      estimated_minutes: lesson.estimated_minutes,
      passing_score: LESSON_PASSING_SCORE,
      content_markdown: lesson.content_markdown,
      questions: lesson.questions.map(safeQuestion),
    };
    return done(res);
  }
  if (route === "POST /api/academy/quiz/submit") return done(submitQuiz(state, body(init)));
  if (route === "GET /api/academy/certificates") return done({ certificates: state.certificates });
  m = match(/^\/api\/academy\/certificates\/(\d+)$/);
  if (method === "GET" && m) {
    const cert: AcademyCertificate = state.certificates.find((c) => c.id === Number(m![1])) ?? fail(404, "Certificado não encontrado.", "certificate_not_found");
    return done(cert);
  }

  return fail(404, `Rota não disponível na demonstração: ${route}`);
}

export async function demoUpload(file: File, onProgress: (percent: number) => void): Promise<Batch> {
  for (const p of [20, 55, 85, 100]) {
    onProgress(p);
    await latency(90);
  }
  const state = loadState();
  if (!state.loggedIn) fail(401, "Sessão expirada. Entre novamente.");
  if (file.size > 10 * 1024 * 1024) fail(413, "Arquivo acima de 10 MB.");
  let parsed: Awaited<ReturnType<typeof parseStatement>>;
  try {
    parsed = await parseStatement(file);
  } catch (error) {
    return fail(422, error instanceof Error ? error.message : "Não foi possível ler o extrato.");
  }
  const batch = createBatch(state, file.name, parsed.format, parsed.rows);
  saveState();
  return batchRead(batch);
}

// ---------------------------------------------------------------- exportação
const brDate = (iso: string) => iso.split("-").reverse().join("/");
const brValue = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
const semi = (s: string | null | undefined) => String(s ?? "").replace(/;/g, " - ").trim();
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Layouts de export_service.py (Domínio, Questor, Fortes, Omie) e CSV. */
function textExport(format: ExportFormat, txs: Transaction[]): string {
  const hist = (t: Transaction) => semi(t.accounting_history || t.clean_description);
  const cat = (t: Transaction) => semi(t.category || "Outras Despesas");
  const rows: string[] = [];
  if (format === "dominio") {
    rows.push("Data;Conta Débito;Conta Crédito;Valor;Código Histórico;Complemento Histórico");
    txs.forEach((t) => rows.push([brDate(t.date), t.debit_account || `DESPESA - ${cat(t).toUpperCase()}`, t.credit_account || "1.1.1.02.0001", brValue(t.amount), t.history_code || "10", hist(t)].join(";")));
  } else if (format === "questor") {
    rows.push("DATA;DEBITO;CREDITO;VALOR;HISTORICO;DOCUMENTO;COD_HISTORICO");
    txs.forEach((t, i) => rows.push([brDate(t.date), t.debit_account || cat(t).toUpperCase(), t.credit_account || "BANCO", brValue(t.amount), hist(t), i + 1, t.history_code || "10"].join(";")));
  } else if (format === "fortes") {
    rows.push("Data;Conta_Debito;Conta_Credito;Valor;Historico;Categoria_Contabil;Status");
    txs.forEach((t) => rows.push([brDate(t.date), t.debit_account || `DESPESA ${cat(t).toUpperCase()}`, t.credit_account || "BANCO CONTA MOVIMENTO", brValue(t.amount), hist(t), cat(t), t.confidence >= 0.8 ? "Conciliado" : "Pendente"].join(";")));
  } else if (format === "omie") {
    rows.push("Data;Valor;Categoria;Descricao;Conta_Corrente;Tipo_Lancamento");
    txs.forEach((t) => rows.push([brDate(t.date), brValue(t.amount), cat(t), hist(t), "CONTA CORRENTE", t.amount > 0 ? "Receita" : "Despesa"].join(";")));
  } else {
    rows.push("Data;Descrição Original;Descrição Limpa;Valor;Tipo;Categoria;Conta Débito;Conta Crédito;Histórico;Origem;Confiança");
    txs.forEach((t) => rows.push([brDate(t.date), semi(t.original_description), semi(t.clean_description), t.amount.toFixed(2).replace(".", ","), t.transaction_type, cat(t), semi(t.debit_account), semi(t.credit_account), hist(t), semi(t.classification_source), `${Math.round(t.confidence * 100)}%`].join(";")));
  }
  return rows.join("\r\n");
}

function htmlReport(batch: StoredBatch, txs: Transaction[]): string {
  const { financial, impact } = impactOf(txs, batch.processed_transactions);
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const byCat = new Map<string, number>();
  txs.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amount)));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] ?? 1;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório Zaeron — ${escapeHtml(batch.source_filename)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#f6f3ef;color:#1f1b17}main{max-width:1040px;margin:auto;padding:32px 20px}
h1{margin:0 0 4px;font-size:22px}.muted{color:#6b625a}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:24px 0}
.kpi{background:#fff;border:1px solid #e3dbd2;border-radius:4px;padding:14px}.kpi b{display:block;font-size:20px}.bar{height:8px;background:#c8753d;border-radius:2px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:12px}th,td{border-bottom:1px solid #eee;padding:6px 8px;text-align:left}td.n{text-align:right;white-space:nowrap}
.neg{color:#b42318}.pos{color:#067647}@media print{body{background:#fff}}</style></head><body><main>
<h1>Relatório de Classificação Contábil</h1><p class="muted">${escapeHtml(batch.source_filename)} · ${txs.length} lançamentos · gerado em ${new Date().toLocaleString("pt-BR")} · demonstração Zaeron</p>
<section class="kpis"><div class="kpi">Receitas<b class="pos">${brl(financial.total_income)}</b></div><div class="kpi">Despesas<b class="neg">${brl(financial.total_expenses)}</b></div>
<div class="kpi">Saldo<b>${brl(financial.net_balance)}</b></div><div class="kpi">Assertividade<b>${impact.accuracy_percent}%</b></div><div class="kpi">Regras locais (custo zero)<b>${impact.zero_cost_percent}%</b></div></section>
<h2>Volume por categoria</h2><table>${cats.map(([c, v]) => `<tr><td>${escapeHtml(c)}</td><td style="width:50%"><div class="bar" style="width:${(v / max) * 100}%"></div></td><td class="n">${brl(v)}</td></tr>`).join("")}</table>
<h2>Lançamentos</h2><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Origem</th><th>Histórico</th><th>Valor</th></tr></thead><tbody>
${txs.map((t) => `<tr><td>${brDate(t.date)}</td><td>${escapeHtml(t.clean_description)}</td><td>${escapeHtml(t.category)}</td><td>${escapeHtml(t.classification_source)}</td><td>${escapeHtml(t.accounting_history)}</td><td class="n ${t.amount < 0 ? "neg" : "pos"}">${brl(t.amount)}</td></tr>`).join("")}
</tbody></table></main></body></html>`;
}

export async function demoExport(batchId: number, format: ExportFormat, originalFilename?: string) {
  await latency();
  const state = loadState();
  const batch = findBatch(state, batchId);
  if (batch.status !== "processed" && batch.status !== "exported") fail(409, "Classifique o lote antes de exportar.");
  const txs = batch.transactions.filter((t) => !t.is_duplicate);
  const report = htmlReport(batch, txs);

  // PDF: o backend gera com ReportLab; aqui o relatório abre pronto para "Salvar como PDF".
  if (format === "pdf") {
    const url = URL.createObjectURL(new Blob([report], { type: "text/html" }));
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print(), { once: true });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    URL.revokeObjectURL(url);
  }
  // XLSX: o backend gera duas abas com openpyxl; a demo entrega CSV (;) que o Excel abre direto.
  const [content, type, ext] =
    format === "html" || format === "pdf"
      ? [report, "text/html", "html"]
      : [`﻿${textExport(format, txs)}`, "text/csv", format === "xlsx" || format === "csv" ? "csv" : "txt"];
  const href = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = sanitizeExportFilename(originalFilename, ext, `relatorio_lote_${batchId}`);
  anchor.click();
  URL.revokeObjectURL(href);
  batch.status = "exported";
  saveState();
}
