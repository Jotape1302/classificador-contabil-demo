import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export function PrivacyPage() {
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
              <Badge tone="copper">Privacidade & LGPD</Badge>
              <span className="text-[11px] font-mono text-muted">
                Versão 1.0 • Atualizado em 28/08/2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-title flex items-center gap-3">
              <LockKeyhole className="size-8 text-copper shrink-0" />
              Política de Privacidade e Proteção de Dados
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Diretrizes de transparência, tratamento de dados, sanitização de PII e segurança em conformidade com a Lei nº 13.709/2018 (LGPD).
            </p>
          </div>

          {/* Seções Legais Estruturadas */}
          <div className="space-y-8 text-sm leading-relaxed text-muted">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">1. Papéis e Enquadramento no Âmbito da LGPD</h2>
              <p>
                O Zaeron Contábil atua com divisão estrita de responsabilidades no tratamento de dados pessoais:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong className="text-title">Como Controladora:</strong> para os dados cadastrais do usuário (nome, e-mail institucional, CPF/CNPJ do responsável, credenciais criptografadas via Bcrypt e logs de auditoria de segurança).
                </li>
                <li>
                  <strong className="text-title">Como Operadora:</strong> no processamento de extratos, lançamentos e movimentações contábeis inseridos pelo escritório contratante (Controlador), tratando as informações exclusivamente sob as instruções técnicas e limites contratuais.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">2. Dados Tratados e Coleta Minimizado</h2>
              <p>
                Tratamos apenas os dados estritamente necessários para a prestação dos serviços: identificação cadastral para emissão de licenças e certificados da Academy, além de dados financeiros constantes em extratos (OFX, PDF, CSV, XLSX).
              </p>
              <div className="rounded-[4px] border border-border bg-elevated p-3.5 space-y-1.5 text-xs">
                <strong className="text-title block">Motor Automático de Sanitização de PII</strong>
                <p>
                  Antes de qualquer processamento ou análise contextual de transações, a plataforma aplica filtros determinísticos de ofuscação sobre CPFs, e-mails, números de telefone e chaves Pix para blindar os dados pessoais sensíveis de titulares finais.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">3. Finalidades e Bases Legais</h2>
              <p>
                O tratamento de dados fundamenta-se nos seguintes artigos da Lei nº 13.709/2018:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong className="text-title">Execução de Contrato (art. 7º, V):</strong> autenticação corporativa, isolamento multi-tenant, conciliação e emissão de relatórios;</li>
                <li><strong className="text-title">Cumprimento de Obrigação Legal (art. 7º, II):</strong> guarda de registros de acesso a aplicações (Marco Civil da Internet, art. 15);</li>
                <li><strong className="text-title">Legítimo Interesse (art. 7º, IX):</strong> proteção contra fraudes, auditoria de integridade e segurança perimetral.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">4. Inteligência Artificial e Transparência</h2>
              <p>
                Lançamentos contábeis que necessitem de desambiguação podem acionar modelos de inteligência artificial via APIs corporativas isoladas. O envio ocorre após a etapa de sanitização de PII, sob parâmetros que impedem a retenção ou uso das movimentações contábeis do cliente para retreinamento de modelos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">5. Medidas Técnicas e Segurança da Informação</h2>
              <p>
                Adotamos medidas rigorosas de segurança cibernética:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Tokens de sessão JWT emitidos estritamente via cookies HttpOnly, SameSite=Lax e flag Secure;</li>
                <li>Criptografia de credenciais via algoritmo Bcrypt de alto custo computacional;</li>
                <li>Tráfego 100% criptografado com TLS/HTTPS moderno e cabeçalhos de segurança (HSTS, CSP, X-Frame-Options);</li>
                <li>Isolamento de banco de dados por chave de organização (tenant ID) e sem permissão de execução de scripts destrutivos.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">6. Direitos dos Titulares de Dados</h2>
              <p>
                Em conformidade com o artigo 18 da LGPD, o titular de dados cadastrais pode exercer seus direitos de confirmação de existência de tratamento, acesso, correção de dados incompletos, bloqueio, anonimização ou exclusão através do painel de Configurações ou canal dedicado de privacidade.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-title">7. Contato do Encarregado de Proteção de Dados (DPO)</h2>
              <p>
                Para dúvidas, requisições de titulares ou notificações de compliance referentes a dados pessoais, entre em contato pelo canal de privacidade no painel de suporte da plataforma.
              </p>
            </section>
          </div>

          {/* Rodapé do Artigo */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-success" />
              <span>Segurança da informação e privacidade por design</span>
            </div>
            <Link
              to="/terms"
              className="text-xs text-action hover:underline font-medium"
            >
              Consultar Termos de Uso →
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
