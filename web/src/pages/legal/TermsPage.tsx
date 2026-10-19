import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-canvas text-title transition-colors duration-200">
      {/* Header Superior */}
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-semibold text-title hover:text-action transition-colors"
            >
              <img
                src="/assets/zaeron_brand_assets.jpeg"
                alt="Zaeron"
                className="size-6 rounded-md border border-copper object-cover"
              />
              <span>Zaeron Contábil</span>
            </Link>
            <span className="text-muted">/</span>
            <span className="text-xs text-muted">Documentos Legais</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-xs text-muted hover:text-title flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao acesso
          </Button>
        </div>
      </header>

      {/* Conteúdo do Documento */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="space-y-8">
          {/* Cabeçalho Editorial */}
          <div className="border-b border-border pb-6 space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="copper">Jurídico & Compliance</Badge>
              <span className="text-[11px] font-mono text-muted">
                Versão 1.0 • Atualizado em 28/08/2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-title flex items-center gap-3">
              <FileText className="size-8 text-copper shrink-0" />
              Termos de Uso da Plataforma
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Regras e condições para utilização dos serviços de inteligência, conciliação e apoio operacional do Zaeron Contábil.
            </p>
          </div>

          {/* Seções Legais Estruturadas */}
          <div className="space-y-8 text-sm leading-relaxed text-muted">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">1. Partes e Objeto</h2>
              <p>
                Estes Termos de Uso regulam o acesso e a utilização da plataforma Zaeron Contábil, destinada ao apoio à classificação, organização, conciliação e auditoria de movimentações contábeis, Academy e módulos operacionais correlatos.
              </p>
              <p className="text-xs text-muted/90 bg-elevated border border-border p-3 rounded-[4px]">
                <strong className="text-title">Aviso de Responsabilidade Profissional:</strong> A plataforma atua como ferramenta tecnológica de apoio ao profissional e ao escritório contábil. Os resultados, sugestões de classificação e relatórios emitidos não substituem o julgamento técnico, a conferência humana, nem a revisão contábil, fiscal e tributária especializada.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">2. Elegibilidade, Cadastro e Segurança da Conta</h2>
              <p>
                O usuário declara possuir poderes para representar sua organização ou escritório contábil e fornecer dados cadastrais fidedignos. Cada usuário é integralmente responsável por preservar a confidencialidade de suas credenciais de acesso, não compartilhando senhas ou tokens de autenticação.
              </p>
              <p>
                Qualquer suspeita de violação ou acesso não autorizado à conta corporativa deve ser imediatamente comunicada aos canais de suporte e privacidade da Zaeron.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">3. Uso Permitido e Obrigações do Cliente</h2>
              <p>
                O cliente compromete-se a carregar e processar exclusivamente dados financeiros e transacionais que esteja formalmente autorizado a tratar sob a legislação aplicável. É estritamente vedado:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Violar o isolamento multi-tenant e os limites técnicos da infraestrutura;</li>
                <li>Tentar realizar engenharia reversa, extração indevida de prompts ou segredos comerciais da plataforma;</li>
                <li>Inserir arquivos corrompidos, maliciosos ou scripts executáveis no motor de upload;</li>
                <li>Utilizar a plataforma para finalidades ilícitas ou geração de decisões automatizadas de alto impacto sem supervisão humana.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">4. Dados, Privacidade e Proteção de Informações (LGPD)</h2>
              <p>
                A nossa Política de Privacidade é parte integrante e indissociável destes Termos. Para os dados de terceiros enviados no âmbito da prestação de serviços B2B, a Zaeron atua prioritariamente como Operadora de dados, observando as instruções lícitas do escritório contratante (Controlador), aplicando protocolos de minimização e rotinas de sanitização prévia de identificadores pessoais (PII).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">5. Integrações, Motores de IA e Modelos de Linguagem</h2>
              <p>
                Para transações financeiras de alta ambiguidade cadastral, descrições anonimizadas podem ser processadas por provedores de inteligência artificial homologados (Google Gemini / Groq), sob isolamento de credenciais e estrita proibição de utilização de dados operacionais do cliente para treinamento público de modelos de terceiros.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">6. Disponibilidade, Suporte e Atualizações</h2>
              <p>
                A Zaeron envida seus melhores esforços técnicos para assegurar alta disponibilidade e resiliência dos microsserviços. Manutenções programadas, melhorias de infraestrutura e atualizações de segurança serão informadas previamente sempre que houver impacto relevante no fluxo operacional.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">7. Propriedade Intelectual e Portabilidade</h2>
              <p>
                Todos os direitos autorais sobre a plataforma, código-fonte, algoritmos de classificação, marcas, design system e materiais instrucionais da Zaeron Academy permanecem de titularidade exclusiva da Zaeron.
              </p>
              <p>
                O cliente mantém integral propriedade sobre seus dados e movimentações contábeis, podendo realizar a exportação integral de relatórios nos formatos abertos suportados (HTML standalone, XLSX e PDF) a qualquer momento.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">8. Legislação Aplicável e Foro</h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
              </p>
            </section>
          </div>

          {/* Rodapé do Artigo */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-success" />
              <span>Ambiente em conformidade técnica e jurídica LGPD</span>
            </div>
            <Link
              to="/privacy"
              className="text-xs text-action hover:underline font-medium"
            >
              Consultar Política de Privacidade (LGPD) →
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
