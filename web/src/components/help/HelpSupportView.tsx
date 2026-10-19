import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  MessageSquare,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "../../lib/types";
import { Input } from "../ui/input";
import { Sidebar } from "../classifier/Sidebar";

interface FaqItem {
  id: string;
  category: "formatos" | "regras" | "analises" | "seguranca" | "roi";
  question: string;
  answer: string;
  highlights?: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "formatos",
    category: "formatos",
    question: "Quais formatos de extrato bancário são suportados?",
    answer:
      "Oferecemos suporte completo a arquivos OFX (padrão bancário recomendado), planilhas CSV estruturadas (com colunas de data, descrição e valor) e extratos bancários em PDF gerados diretamente pelo internet banking.",
    highlights: ["OFX", "CSV", "PDF bancário nativo"],
  },
  {
    id: "regras",
    category: "regras",
    question: "Como funcionam as Regras Operacionais?",
    answer:
      "As regras registram critérios específicos do seu escritório para reduzir ambiguidades, aumentar a confiança das classificações e acelerar decisões recorrentes. Quando um lançamento corresponde a uma regra cadastrada (ex.: tarifas bancárias recorrentes, aluguel, concessionárias públicas), a classificação é aplicada de forma instantânea com 100% de confiança técnica.",
    highlights: ["Critérios do escritório", "Execução instantânea", "Zero ambiguidade"],
  },
  {
    id: "analises",
    category: "analises",
    question: "Como exportar relatórios gerenciais e dashboards?",
    answer:
      "A plataforma gera relatórios executivos de alta fidelidade em três formatos principais: HTML Interativo (dashboard analítico completo standalone), PDF Institucional (relatório executivo pronto para apresentação) e Planilha XLSX (dados estruturados com fórmulas de auditoria).",
    highlights: ["HTML Interativo", "PDF Institucional", "Planilhas XLSX"],
  },
  {
    id: "seguranca",
    category: "seguranca",
    question: "Os dados dos clientes do escritório ficam protegidos?",
    answer:
      "Sim. Os dados são processados de ponta a ponta com criptografia e isolamento rigoroso, em total conformidade com as diretrizes da LGPD (Lei Geral de Proteção de Dados). As informações financeiras nunca são expostas a terceiros e permanecem segregadas por escritório.",
    highlights: ["Criptografia ponta a ponta", "Conformidade LGPD", "Segregação por escritório"],
  },
  {
    id: "roi",
    category: "roi",
    question: "Como funciona o cálculo de ROI e economia de tempo?",
    answer:
      "O impacto é calculado comparando o tempo de digitação manual médio com a conciliação automatizada da Zaeron. No painel de Impacto, os cálculos aplicam a taxa contábil base de R$ 11,00/h sobre as horas economizadas para apurar com precisão o retorno financeiro da sua operação.",
    highlights: ["Taxa Base R$ 11,00/h", "Tempo poupado em tempo real", "Auditoria de produtividade"],
  },
];

const CATEGORIES = [
  { id: "all", label: "Todas as Dúvidas" },
  { id: "formatos", label: "Formatos & Importação" },
  { id: "regras", label: "Regras Operacionais" },
  { id: "analises", label: "Análises & Relatórios" },
  { id: "seguranca", label: "Segurança & LGPD" },
  { id: "roi", label: "Impacto & ROI" },
] as const;

export function HelpSupportView({ user }: { user: User }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    formatos: true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    FAQ_ITEMS.forEach((item) => {
      allOpen[item.id] = true;
    });
    setOpenItems(allOpen);
  };

  const collapseAll = () => {
    setOpenItems({});
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !normalizedSearch ||
        item.question.toLowerCase().includes(normalizedSearch) ||
        item.answer.toLowerCase().includes(normalizedSearch) ||
        (item.highlights &&
          item.highlights.some((h) => h.toLowerCase().includes(normalizedSearch)));

      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-10">
          {/* Cabeçalho Editorial */}
          <header className="space-y-3 border-b border-border pb-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-copper">
                Central de Suporte & Conhecimento
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-title sm:text-3xl">
              Como podemos apoiar sua operação?
            </h1>
            <p className="text-sm text-muted max-w-2xl">
              Orientações sobre conciliação bancária, regras operacionais, formatos de extratos e relatórios executivos.
            </p>

            {/* Barra de Busca Estruturada */}
            <div className="pt-2">
              <div className="relative max-w-xl">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquise por formatos (OFX, PDF), relatórios, regras ou dúvidas..."
                  className="h-10 pl-10 text-xs bg-sidebar border-border rounded-[4px] focus:border-copper"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-title"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Atendimento Direto WhatsApp */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[4px] border border-border bg-sidebar/70 p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-action">
                  Suporte Técnico Especializado
                </span>
              </div>
              <p className="text-sm font-medium text-title">
                Precisa de auxílio com rotinas de conciliação ou relatórios?
              </p>
              <p className="text-xs text-muted">
                Nossos consultores prestam suporte direto para implantação e rotinas no escritório.
              </p>
            </div>
            <a
              href="https://wa.me/5543991986605?text=Olá,%20preciso%20de%20ajuda%20com%20o%20Zaeron%20Contábil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] bg-copper px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-action"
            >
              <MessageSquare className="size-3.5 shrink-0" />
              <span>Falar no WhatsApp</span>
              <ExternalLink className="size-3 opacity-80" />
            </a>
          </section>

          {/* Seção: Comece Por Aqui */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Navegação Rápida
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link
                to="/academy"
                className="group block rounded-[4px] border border-border bg-sidebar/50 p-4 transition-all duration-150 hover:border-copper/60 hover:bg-sidebar"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <BookOpen className="size-4 text-copper" />
                  <h3 className="text-sm font-semibold text-title group-hover:text-action">
                    Zaeron Academy
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Treinamentos estruturados e certificação técnica em rotinas contábeis com IA.
                </p>
              </Link>

              <Link
                to="/rules"
                className="group block rounded-[4px] border border-border bg-sidebar/50 p-4 transition-all duration-150 hover:border-copper/60 hover:bg-sidebar"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <FileCheck2 className="size-4 text-copper" />
                  <h3 className="text-sm font-semibold text-title group-hover:text-action">
                    Regras Operacionais
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Cadastre termos de busca e contas contábeis para classificação instantânea recorrente.
                </p>
              </Link>

              <div className="rounded-[4px] border border-border bg-sidebar/50 p-4">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <FileSpreadsheet className="size-4 text-copper" />
                  <h3 className="text-sm font-semibold text-title">
                    Análises & Relatórios
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Exportação executiva em HTML interativo, PDF formal e planilhas estruturadas XLSX.
                </p>
              </div>
            </div>
          </section>

          {/* Seção: Perguntas Frequentes (Editorial com Linhas) */}
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-semibold text-title uppercase tracking-wide">
                  Perguntas Frequentes
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Respostas diretas para dúvidas operacionais e técnicas.
                </p>
              </div>

              {/* Botões Expandir/Recolher */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-title transition-colors"
                >
                  Expandir tudo
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-title transition-colors"
                >
                  Recolher tudo
                </button>
              </div>
            </div>

            {/* Categorias (Filtro em Linha) */}
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-elevated text-action border border-border"
                        : "text-muted hover:text-title hover:bg-sidebar/50 border border-transparent"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Lista Editorial de Perguntas */}
            {filteredFaqs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                Nenhum resultado encontrado para "{searchTerm}".
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredFaqs.map((faq) => {
                  const isOpen = !!openItems[faq.id];

                  return (
                    <div key={faq.id} className="py-4">
                      <button
                        type="button"
                        onClick={() => toggleItem(faq.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 text-left transition-colors hover:text-action"
                      >
                        <span className="text-sm font-medium text-title">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-muted transition-transform duration-150 ${
                            isOpen ? "rotate-180 text-action" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="pt-3 pr-6 text-xs sm:text-sm leading-relaxed text-muted animate-in fade-in duration-150 space-y-2.5">
                          <p>{faq.answer}</p>

                          {faq.highlights && faq.highlights.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {faq.highlights.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-[2px] border border-border/80 bg-sidebar px-2 py-0.5 text-[10px] font-mono text-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Rodapé da Página */}
          <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted">
            <p>Zaeron Contábil • Infraestrutura de Inteligência Operacional</p>
            <a
              href="https://wa.me/5543991986605"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-action transition-colors inline-flex items-center gap-1"
            >
              <span>Suporte Direto</span>
              <ExternalLink className="size-3" />
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
