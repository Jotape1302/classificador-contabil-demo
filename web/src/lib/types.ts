export type User = {
  id: number;
  name: string;
  email: string;
  office_name: string | null;
  document_number?: string;
  postal_code?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  number?: string;
  complement?: string | null;
  is_verified?: boolean;
  plan_tier?: string;
  monthly_usage_count?: number;
  usage_reset_at?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  terms_version?: string | null;
};

export type OfficeProfile = {
  erp_system: string | null;
  client_range: string | null;
  custom_rules?: unknown;
};

export type Quota = {
  monthly_processes: number;
  max_monthly_processes?: number | null;
  monthly_transactions: number;
  max_monthly_transactions?: number | null;
  plan_tier?: string;
  monthly_usage_count?: number;
  max_monthly_usages?: number | null;
  usage_reset_at?: string | null;
};

export type CurrentUser = {
  user: User;
  profile?: OfficeProfile | null;
  quotas?: Quota;
  onboarding_completed: boolean;
  terms_accepted?: boolean;
};

export type Transaction = {
  id: number;
  position: number;
  date: string;
  original_description: string;
  clean_description: string;
  amount: number;
  transaction_type: string;
  category: string;
  debit_account: string | null;
  credit_account: string | null;
  accounting_history: string;
  history_code: string | null;
  classification_source: string;
  confidence: number;
  is_duplicate: boolean;
  version: number;
};

export type TopCategorySummary = {
  name: string;
  total: number;
  count: number;
  percentage: number;
};

export type BatchHistoryItem = {
  id: number;
  source_filename: string;
  source_format: string;
  status: "uploaded" | "processing" | "processed" | "failed" | "exported";
  total_transactions: number;
  duplicate_transactions: number;
  processed_transactions: number;
  version: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  period_start: string | null;
  period_end: string | null;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  average_confidence: number;
  review_count: number;
  hours_saved: number;
  financial_saved: number;
  top_categories: TopCategorySummary[];
};

export type BatchHistoryListResponse = {
  batches: BatchHistoryItem[];
  total: number;
};

export type Batch = {
  id: number;
  source_filename: string;
  source_format: string;
  status: "uploaded" | "processing" | "processed" | "failed" | "exported";
  total_transactions: number;
  duplicate_transactions: number;
  processed_transactions: number;
  version: number;
  error_message: string | null;
  metrics: {
    hours_saved: number;
    accuracy_percent: number;
    zero_cost_percent: number;
  };
  transactions: Transaction[];
};

export type TransactionPatch = Pick<Transaction, "id" | "version"> &
  Partial<
    Pick<
      Transaction,
      | "category"
      | "debit_account"
      | "credit_account"
      | "accounting_history"
      | "history_code"
    >
  >;

export type FinancialSummary = {
  total_expenses: number;
  total_income: number;
  net_balance: number;
  average_ticket: number;
  total_transactions: number;
};

export type OperationalImpact = {
  hours_saved: number;
  financial_savings: number;
  accuracy_percent: number;
  zero_cost_percent: number;
  total_processed_transactions: number;
};

export type BatchMetricsResponse = {
  batch_id: number;
  source_filename: string;
  status: string;
  total_transactions: number;
  duplicate_transactions: number;
  processed_transactions: number;
  financial: FinancialSummary;
  impact: OperationalImpact;
};

export type MetricsSummaryResponse = {
  total_batches: number;
  total_transactions: number;
  duplicate_transactions: number;
  processed_transactions: number;
  financial: FinancialSummary;
  impact: OperationalImpact;
};

export type ExportFormat =
  | "dominio"
  | "questor"
  | "omie"
  | "fortes"
  | "xlsx"
  | "csv"
  | "html"
  | "pdf";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  document_number: string;
  office_name?: string;
};

export type RegisterStartPayload = {
  name: string;
  email: string;
  password: string;
  document_number: string;
  postal_code?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  number?: string;
  complement?: string;
  office_name?: string;
};

export type Rule = {
  id: number;
  search_term: string;
  category: string;
  debit_account: string | null;
  credit_account: string | null;
  history_code: string | null;
  times_applied: number;
  created_at: string;
  updated_at: string;
};

export type RuleCreatePayload = {
  search_term: string;
  category: string;
  debit_account?: string | null;
  credit_account?: string | null;
  history_code?: string | null;
};

export type ImpactPeriod = "week" | "month" | "year" | "all";

export type ImpactKPISummary = {
  hours_saved: number;
  financial_saved: number;
  total_reconciled: number;
  zero_cost_percent: number;
  hourly_rate: number;
};

export type ImpactTimeSeriesPoint = {
  date: string;
  label: string;
  hours_saved: number;
  financial_saved: number;
  total_rows: number;
};

export type BatchExecutionItem = {
  id: number;
  batch_id: number | null;
  filename: string;
  total_rows: number;
  rules_matched: number;
  ai_matched: number;
  hours_saved: number;
  financial_saved: number;
  zero_cost_percent: number;
  created_at: string;
};

export type ImpactMetricsResponse = {
  period: ImpactPeriod;
  kpis: ImpactKPISummary;
  time_series: ImpactTimeSeriesPoint[];
  history: BatchExecutionItem[];
};


