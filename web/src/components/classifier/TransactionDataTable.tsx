import { useMemo, useState } from "react";
import { Check, Filter, RotateCcw, Save, Search, TriangleAlert } from "lucide-react";
import { usePatchTransactions } from "../../hooks/use-classifier";
import type { Batch, Transaction, TransactionPatch } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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

type Draft = Partial<
  Pick<
    Transaction,
    "category" | "debit_account" | "credit_account" | "accounting_history" | "history_code"
  >
>;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function TransactionDataTable({
  batch,
  onMessage,
}: {
  batch: Batch;
  onMessage: (message: string, error?: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [duplicate, setDuplicate] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saved, setSaved] = useState<number | null>(null);
  const patch = usePatchTransactions(batch);

  const filtered = useMemo(
    () =>
      batch.transactions.filter((transaction) => {
        const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
        const matchesSearch =
          !normalizedSearch ||
          transaction.clean_description.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
          transaction.accounting_history.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
        const matchesCategory = category === "all" || transaction.category === category;
        const matchesDuplicate =
          duplicate === "all" || String(transaction.is_duplicate) === duplicate;
        const matchesStart = !dateStart || transaction.date >= dateStart;
        const matchesEnd = !dateEnd || transaction.date <= dateEnd;
        const absoluteAmount = Math.abs(transaction.amount);
        const matchesMin = !amountMin || absoluteAmount >= Number(amountMin);
        const matchesMax = !amountMax || absoluteAmount <= Number(amountMax);
        return (
          matchesSearch &&
          matchesCategory &&
          matchesDuplicate &&
          matchesStart &&
          matchesEnd &&
          matchesMin &&
          matchesMax
        );
      }),
    [
      amountMax,
      amountMin,
      batch.transactions,
      category,
      dateEnd,
      dateStart,
      duplicate,
      search,
    ],
  );

  function change(id: number, field: keyof Draft, value: string) {
    setSaved(null);
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function save(transaction: Transaction) {
    const draft = drafts[transaction.id];
    if (!draft) return;
    const update: TransactionPatch = {
      id: transaction.id,
      version: transaction.version,
      ...draft,
    };
    try {
      await patch.mutateAsync([update]);
      setDrafts((current) => {
        const next = { ...current };
        delete next[transaction.id];
        return next;
      });
      setSaved(transaction.id);
      onMessage("Lançamento conciliado e versionado.");
      window.setTimeout(() => setSaved(null), 1800);
    } catch {
      onMessage("Os dados mudaram em outra sessão. A tabela foi recarregada.", true);
    }
  }

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setDuplicate("all");
    setDateStart("");
    setDateEnd("");
    setAmountMin("");
    setAmountMax("");
  }

  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-elevated shadow-sm">
      <div className="border-b border-border p-4 bg-sidebar/50">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-title">
              Conciliação de Lançamentos Contábeis
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {filtered.length} de {batch.transactions.length} registros auditáveis
            </p>
          </div>
          <Badge
            tone={
              batch.status === "processed" || batch.status === "exported"
                ? "success"
                : "warning"
            }
          >
            {batch.status === "processed" || batch.status === "exported"
              ? "Pronto para Revisão"
              : "Aguardando Processamento"}
          </Badge>
        </div>

        {/* Barra de Filtros */}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted" aria-hidden="true" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar descrição ou histórico…"
              aria-label="Buscar lançamentos"
            />
          </div>
          <select
            className="h-9 rounded-[4px] border border-border bg-canvas px-3 text-xs text-title focus:border-copper focus:outline-none"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar categoria"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-[4px] border border-border bg-canvas px-3 text-xs text-title focus:border-copper focus:outline-none"
            value={duplicate}
            onChange={(event) => setDuplicate(event.target.value)}
            aria-label="Filtrar duplicidade"
          >
            <option value="all">Todos os registros</option>
            <option value="false">Somente novos</option>
            <option value="true">Duplicados</option>
          </select>
          <div className="flex gap-1">
            <Input
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              aria-label="Data inicial"
            />
            <Input
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              aria-label="Data final"
            />
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amountMin}
              onChange={(event) => setAmountMin(event.target.value)}
              placeholder="R$ mín."
              aria-label="Valor mínimo"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amountMax}
              onChange={(event) => setAmountMax(event.target.value)}
              placeholder="R$ máx."
              aria-label="Valor máximo"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={resetFilters}
            aria-label="Limpar filtros"
            title="Limpar filtros"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      <div className="scrollbar-subtle max-h-[540px] overflow-auto">
        <table className="w-full min-w-[960px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-sidebar border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="w-28 px-3 py-2.5">Data</th>
              <th className="min-w-[260px] max-w-[380px] px-3 py-2.5">Descrição</th>
              <th className="w-32 px-3 py-2.5 text-right">Valor</th>
              <th className="w-60 min-w-[200px] px-3 py-2.5">Categoria Contábil</th>
              <th className="min-w-[300px] px-3 py-2.5">Histórico Narrativo</th>
              <th className="w-28 px-3 py-2.5">Confiança</th>
              <th className="w-24 px-3 py-2.5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((transaction) => {
              const draft = drafts[transaction.id] ?? {};
              const editable =
                !transaction.is_duplicate &&
                (batch.status === "processed" || batch.status === "exported");
              return (
                <tr
                  key={transaction.id}
                  className="transition-colors duration-150 hover:bg-sidebar/70"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-muted">
                    {new Date(`${transaction.date}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    <p
                      className="truncate font-medium text-title"
                      title={transaction.original_description}
                    >
                      {transaction.clean_description}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {transaction.is_duplicate && (
                        <Badge tone="warning">
                          <TriangleAlert className="mr-1 size-3" />
                          Duplicado
                        </Badge>
                      )}
                      <Badge tone="neutral">{transaction.classification_source}</Badge>
                    </div>
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right font-mono font-semibold ${
                      transaction.amount < 0 ? "text-title" : "text-success"
                    }`}
                  >
                    {money.format(transaction.amount)}
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      disabled={!editable}
                      className="h-8 w-full rounded-[4px] border border-border bg-canvas px-2 text-xs text-title focus:border-copper focus:outline-none"
                      value={draft.category ?? transaction.category}
                      onChange={(event) => change(transaction.id, "category", event.target.value)}
                    >
                      {categories.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      disabled={!editable}
                      className="h-8 text-xs focus:border-copper"
                      value={draft.accounting_history ?? transaction.accounting_history}
                      onChange={(event) =>
                        change(transaction.id, "accounting_history", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {Math.round(transaction.confidence * 100)}%
                      </span>
                      <div className="h-1.5 flex-1 min-w-10 overflow-hidden rounded-[2px] bg-border">
                        <div
                          className={`h-full rounded-[2px] ${
                            transaction.confidence >= 0.8
                              ? "bg-success"
                              : transaction.confidence >= 0.5
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          style={{ width: `${transaction.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant={saved === transaction.id ? "default" : "secondary"}
                      disabled={!drafts[transaction.id] || patch.isPending}
                      onClick={() => save(transaction)}
                      className="h-7 text-xs"
                    >
                      {saved === transaction.id ? (
                        <>
                          <Check className="size-3" />
                          Salvo
                        </>
                      ) : (
                        <>
                          <Save className="size-3" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Filter className="size-6 text-muted" />
            <p className="mt-3 text-sm font-medium text-title">Nenhum lançamento encontrado</p>
            <p className="mt-1 text-xs text-muted">Ajuste os filtros para ampliar a busca.</p>
          </div>
        )}
      </div>
    </section>
  );
}
