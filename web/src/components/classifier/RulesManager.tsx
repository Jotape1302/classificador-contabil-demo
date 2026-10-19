import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useCreateRule,
  useDeleteRule,
  useRules,
  useUpdateRule,
} from "../../hooks/use-rules";
import type { Rule, RuleCreatePayload, User } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Sidebar } from "./Sidebar";

const categories = [
  "Vendas e Receitas",
  "Aluguel",
  "Serviços de Terceiros",
  "Impostos e Taxas",
  "Despesas Bancárias",
  "Salários e Encargos",
  "Energia Elétrica",
  "Água e Esgoto",
  "Internet e Telefone",
  "Materiais de Escritório",
  "Equipamentos",
  "Manutenção",
  "Transporte e Combustível",
  "Alimentação",
  "Publicidade e Marketing",
  "Honorários",
  "Empréstimos e Financiamentos",
  "Transferências e Aplicações",
  "Outras Despesas",
];

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * FÓRMULA OFICIAL DE TEMPO ECONOMIZADO EXCLUSIVAMENTE POR REGRAS OPERACIONAIS:
 *
 * Tempo_Economizado_Regras (horas) = transacoes_classificadas_diretamente_por_regra * 0.0333h (2.0 min)
 * Economia_Financeira_Regras (R$) = Tempo_Economizado_Regras * R$ 11,00/hora
 *
 * Esta métrica contabiliza ESTRITAMENTE transações resolvidas por regras de memória operacional do escritório,
 * excluindo inferências assistidas gerais, edições manuais ou classificações não baseadas em regras.
 */
function formatHoursAndMinutes(totalHours: number): string {
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function RulesManager({ user }: { user: User }) {
  const rulesQuery = useRules();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("Outras Despesas");
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [historyCode, setHistoryCode] = useState("");

  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  function notify(message: string, error = false) {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3500);
  }

  const rules = rulesQuery.data ?? [];

  // Estatísticas calculadas com a fórmula canônica estrita
  const stats = useMemo(() => {
    const totalRules = rules.length;
    // Soma de todas as aplicações reais de regras
    const totalAppliedTransactions = rules.reduce(
      (acc, r) => acc + (r.times_applied || 0),
      0
    );
    // Tempo manual canônico: 2.0 min = 0.03333 horas por lançamento
    const hoursSavedByRules = Number(((totalAppliedTransactions * 2.0) / 60).toFixed(2));
    const moneySavedByRules = Number((hoursSavedByRules * 11.0).toFixed(2));

    // Regras mais utilizadas
    const topRules = [...rules]
      .sort((a, b) => (b.times_applied || 0) - (a.times_applied || 0))
      .slice(0, 5);

    return {
      totalRules,
      totalAppliedTransactions,
      hoursSavedByRules,
      moneySavedByRules,
      topRules,
    };
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.search_term.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" || r.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rules, search, categoryFilter]);

  function openCreateModal() {
    setEditingRule(null);
    setSearchTerm("");
    setCategory("Outras Despesas");
    setDebitAccount("");
    setCreditAccount("");
    setHistoryCode("");
    setModalOpen(true);
  }

  function openEditModal(rule: Rule) {
    setEditingRule(rule);
    setSearchTerm(rule.search_term);
    setCategory(rule.category);
    setDebitAccount(rule.debit_account || "");
    setCreditAccount(rule.credit_account || "");
    setHistoryCode(rule.history_code || "");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) {
      notify("Informe o termo de busca.", true);
      return;
    }

    const payload: RuleCreatePayload = {
      search_term: searchTerm.trim().toUpperCase(),
      category,
      debit_account: debitAccount.trim() || null,
      credit_account: creditAccount.trim() || null,
      history_code: historyCode.trim() || null,
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, payload });
        notify(`Regra "${payload.search_term}" atualizada com sucesso!`);
      } else {
        await createRule.mutateAsync(payload);
        notify(`Regra "${payload.search_term}" cadastrada com sucesso!`);
      }
      setModalOpen(false);
    } catch (err: any) {
      notify(err.message || "Não foi possível salvar a regra.", true);
    }
  }

  async function handleDelete(rule: Rule) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a regra para "${rule.search_term}"?`
      )
    ) {
      return;
    }
    try {
      await deleteRule.mutateAsync(rule.id);
      notify(`Regra "${rule.search_term}" removida.`);
    } catch (err: any) {
      notify(err.message || "Erro ao excluir regra.", true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Cabeçalho Editorial */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="copper">MEMÓRIA OPERACIONAL</Badge>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-title sm:text-3xl">
                Regras de Classificação Contábil
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
                As regras operacionais preservam o conhecimento técnico do seu escritório, resolvendo lançamentos recorrentes instantaneamente com 100% de confiança e zero ambiguidade.
              </p>
            </div>
            <Button onClick={openCreateModal} className="shrink-0 h-9">
              <Plus className="size-3.5 mr-1.5" /> Nova Regra
            </Button>
          </header>

          {/* PAINEL EDITORIAL ESTATÍSTICO DE REGRAS OPERACIONAIS (Sem 3 cards genéricos) */}
          <section className="rounded-[4px] border border-border bg-sidebar/80 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-border/80 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-copper">
                  Impacto Exclusivo das Regras
                </span>
                <h2 className="text-base font-semibold text-title mt-0.5">
                  Eficiência Acumulada por Memória Operacional
                </h2>
              </div>
              <span className="font-mono text-xs text-muted">
                Fórmula: transações × 2.0 min @ R$ 11,00/h
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="space-y-1 border-r border-border/60 pr-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Regras Ativas
                </span>
                {rulesQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="font-mono text-3xl font-extrabold text-title">
                    {stats.totalRules}
                  </p>
                )}
                <span className="text-[11px] text-muted block">
                  padrões cadastrados no escritório
                </span>
              </div>

              <div className="space-y-1 border-r border-border/60 pr-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Lançamentos Diretos
                </span>
                {rulesQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="font-mono text-3xl font-extrabold text-title">
                    {stats.totalAppliedTransactions}
                  </p>
                )}
                <span className="text-[11px] text-muted block">
                  conciliados sem intervenção manual
                </span>
              </div>

              <div className="space-y-1 border-r border-border/60 pr-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Tempo Poupado por Regras
                </span>
                {rulesQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="font-mono text-3xl font-extrabold text-action">
                    {formatHoursAndMinutes(stats.hoursSavedByRules)}
                  </p>
                )}
                <span className="text-[11px] text-action font-medium block">
                  economia estritamente por regras
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Retorno Financeiro
                </span>
                {rulesQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="font-mono text-3xl font-extrabold text-success">
                    {formatBRL(stats.moneySavedByRules)}
                  </p>
                )}
                <span className="text-[11px] text-muted block">
                  valor poupado (R$ 11,00/h)
                </span>
              </div>
            </div>
          </section>

          {/* Tabela de Regras Cadastradas */}
          <section className="overflow-hidden rounded-[4px] border border-border bg-elevated shadow-sm">
            <div className="border-b border-border p-4 bg-sidebar/50">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-title">
                    Regras Cadastradas no Escritório
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {filteredRules.length} de {rules.length} regras disponíveis
                  </p>
                </div>
              </div>

              {/* Filtros */}
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar termo ou categoria…"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="h-9 flex-1 rounded-[4px] border border-border bg-canvas px-3 text-xs text-title focus:border-copper focus:outline-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">Todas as categorias</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                    }}
                    title="Limpar filtros"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabela */}
            <div className="scrollbar-subtle max-h-[500px] overflow-auto">
              <table className="w-full min-w-[700px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-sidebar border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Termo / Padrão</th>
                    <th className="px-4 py-3">Tipo de Correspondência</th>
                    <th className="px-4 py-3">Categoria Atribuída</th>
                    <th className="px-4 py-3 text-center">Aplicações</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rulesQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </td>
                    </tr>
                  ) : filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <Filter className="mx-auto size-6 text-muted" />
                        <p className="mt-2 text-sm font-medium text-title">
                          Nenhuma regra encontrada
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Clique em "+ Nova Regra" para cadastrar termos do seu escritório.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="transition-colors duration-150 hover:bg-sidebar/70"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-title">
                          <span className="rounded-[2px] bg-canvas border border-border/80 px-2 py-1 text-action">
                            {rule.search_term}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Sparkles className="size-3 text-copper" /> Contém termo
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">{rule.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-success">
                          {rule.times_applied}x
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditModal(rule)}
                              title="Editar regra"
                            >
                              <Edit2 className="size-3.5 text-muted hover:text-title" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(rule)}
                              title="Excluir regra"
                            >
                              <Trash2 className="size-3.5 text-danger hover:text-danger/80" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Modal de Criação / Edição de Regra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-[4px] border border-border bg-elevated p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-copper" />
                <h3 className="text-base font-semibold text-title">
                  {editingRule ? "Editar Regra de Memória" : "Nova Regra de Classificação"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-title"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-xs font-medium text-title">
                Termo de busca na descrição do extrato
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: COPEL, SANEPAR, POSTO IPIRANGA"
                  required
                />
                <span className="text-[11px] text-muted">
                  Sempre que este termo aparecer no extrato, a regra operacional será aplicada com 100% de confiança e execução instantânea.
                </span>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-title">
                Categoria Contábil
                <select
                  className="h-9 w-full rounded-[4px] border border-border bg-canvas px-3 text-xs text-title focus:border-copper focus:outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-xs font-medium text-title">
                  Conta Débito <span className="text-muted font-normal">(opcional)</span>
                  <Input
                    className="font-mono text-xs"
                    value={debitAccount}
                    onChange={(e) => setDebitAccount(e.target.value)}
                    placeholder="1.1.1.01"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-title">
                  Conta Crédito <span className="text-muted font-normal">(opcional)</span>
                  <Input
                    className="font-mono text-xs"
                    value={creditAccount}
                    onChange={(e) => setCreditAccount(e.target.value)}
                    placeholder="2.1.1.01"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createRule.isPending || updateRule.isPending}
                >
                  {editingRule
                    ? updateRule.isPending
                      ? "Salvando…"
                      : "Salvar Alterações"
                    : createRule.isPending
                    ? "Cadastrando…"
                    : "Cadastrar Regra"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2 rounded-[4px] border px-4 py-3 text-xs shadow-xl animate-in fade-in duration-200 ${
            toast.error
              ? "border-danger/40 bg-elevated text-danger"
              : "border-success/40 bg-elevated text-success"
          }`}
        >
          {toast.error ? <AlertCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
