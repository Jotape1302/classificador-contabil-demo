import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Database,
  FileCheck,
  History,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLogin } from "../../hooks/use-auth";
import { APP_VERSION_DISPLAY } from "../../lib/constants";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { RegisterScreen } from "./RegisterScreen";
import { Zaeron3DLogo } from "./Zaeron3DLogo";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useLogin();

  if (mode === "register") {
    return <RegisterScreen onSwitchToLogin={() => setMode("login")} />;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-canvas">
      {/* Dynamic Background Ambient Light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(200,117,61,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(240,138,62,0.06),transparent_40%)]" />

      {/* ========================================================================= */}
      {/* 60% LEFT COLUMN: Experiência Visual de Marca e Protagonismo Tecnológico  */}
      {/* ========================================================================= */}
      <section className="relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:w-[58%] xl:w-[60%] lg:p-16 border-b lg:border-b-0 lg:border-r border-border/80">
        {/* Topo: Identificador do Produto */}
        <div className="flex items-center gap-2">
          <Badge tone="copper">ZAERON CONTÁBIL</Badge>
          <span className="font-mono text-[11px] text-muted border border-border/80 px-2 py-0.5 rounded-[2px] bg-sidebar/50">
            {APP_VERSION_DISPLAY} • Edição Executiva
          </span>
        </div>

        {/* Centro: 3D Logo Hero + Headline Editorial */}
        <div className="my-auto py-8 sm:py-12 space-y-6 max-w-2xl">
          <div className="flex justify-center lg:justify-start">
            <Zaeron3DLogo size="lg" showText={false} showWordmark={true} />
          </div>

          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-title leading-[1.15]">
              Inteligência Aplicada à <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-copper via-action to-[#E8803C] dark:from-[#F4EFEA] dark:via-[#E8803C] dark:to-[#FF9A4D] bg-clip-text text-transparent">
                Operação Contábil
              </span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted max-w-xl leading-relaxed">
              Transforme extratos bancários brutos em movimentações auditadas, históricos consolidados e relatórios executivos multiformato com total conformidade.
            </p>
          </div>

          {/* Destaques Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-xs text-muted">
            <div className="flex items-start gap-2.5 rounded-[4px] border border-border/70 bg-sidebar/80 dark:bg-sidebar/40 p-3">
              <Sparkles className="size-4 text-copper shrink-0 mt-0.5" />
              <div>
                <strong className="text-title font-semibold block text-[11px]">Memória de Regras</strong>
                <span>Reaplicação determinística de critérios do escritório</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[4px] border border-border/70 bg-sidebar/80 dark:bg-sidebar/40 p-3">
              <History className="size-4 text-copper shrink-0 mt-0.5" />
              <div>
                <strong className="text-title font-semibold block text-[11px]">Histórico de Lotes</strong>
                <span>Consulta e reabertura de análises sem reclassificação</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[4px] border border-border/70 bg-sidebar/80 dark:bg-sidebar/40 p-3">
              <FileCheck className="size-4 text-copper shrink-0 mt-0.5" />
              <div>
                <strong className="text-title font-semibold block text-[11px]">Relatórios Executivos</strong>
                <span>Dashboards em HTML standalone, PDF e planilhas XLSX</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[4px] border border-border/70 bg-sidebar/80 dark:bg-sidebar/40 p-3">
              <Database className="size-4 text-copper shrink-0 mt-0.5" />
              <div>
                <strong className="text-title font-semibold block text-[11px]">Segurança & LGPD</strong>
                <span>Sanitização estrita de PII e isolamento tenant estrito</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Infraestrutura */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted/70 pt-4 border-t border-border/50">
          <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
          <span>Infraestrutura blindada • Cookies HttpOnly criptografados • Zero vazamento de credenciais</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 40% RIGHT COLUMN: Superfície de Autenticação Limpa e Responsiva           */}
      {/* ========================================================================= */}
      <section className="relative z-10 flex flex-col justify-center lg:justify-start items-center p-6 sm:p-10 lg:w-[42%] xl:w-[40%] lg:px-12 lg:pt-[clamp(3.5rem,10vh,7.5rem)] xl:pt-[clamp(4.5rem,13vh,9.5rem)] bg-canvas/60">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-[4px] border border-border bg-sidebar/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="border-b border-border/80 pb-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-copper">
                  Autenticação Corporativa
                </span>
                <h2 className="text-lg font-semibold text-title mt-0.5">
                  Acesse sua Operação
                </h2>
              </div>
              <span className="font-mono text-[10px] text-muted border border-border/70 px-2 py-0.5 rounded-[2px] bg-canvas">
                Sessão Ativa
              </span>
            </div>

            {import.meta.env.VITE_DEMO === "true" && (
              <div className="rounded-[3px] border border-copper/40 bg-copper/10 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-title">Ambiente de demonstração</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Sem backend: o extrato é lido e classificado no seu navegador, com as mesmas regras do motor
                    real. Nada é enviado a servidores.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full h-9 text-xs font-semibold"
                  disabled={login.isPending}
                  onClick={() => login.mutate({ email: "demo@zaeron.example", password: "demo" })}
                >
                  Entrar na demonstração
                  <ArrowRight className="size-3.5 ml-1" aria-hidden="true" />
                </Button>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" aria-busy={login.isPending}>
              <label className="block space-y-1.5 text-xs font-medium text-title">
                E-mail corporativo
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" aria-hidden="true" />
                  <Input
                    className="h-10 pl-10 pr-3 text-xs w-full"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="contador@escritorio.com.br"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-title">
                Senha de acesso
                <div className="relative flex items-center">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" aria-hidden="true" />
                  <Input
                    className="h-10 pl-10 pr-3 text-xs w-full"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </label>


              {login.isError && (
                <p
                  role="alert"
                  className="rounded-[3px] border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs text-danger animate-in fade-in duration-200"
                >
                  {login.error?.message || "E-mail ou senha inválidos. Revise os dados e tente novamente."}
                </p>
              )}

              <Button className="w-full h-10 mt-2 text-xs font-semibold" type="submit" disabled={login.isPending}>
                {login.isPending ? "Autenticando sessão…" : "Entrar na Operação"}
                {!login.isPending && <ArrowRight className="size-3.5 ml-1" aria-hidden="true" />}
              </Button>

              <p className="text-[10.5px] text-center text-muted/80 pt-1 leading-relaxed">
                Ao acessar, você declara ciência dos{" "}
                <Link
                  to="/terms"
                  className="text-muted font-medium hover:text-action hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-copper rounded-[2px]"
                >
                  Termos de Uso
                </Link>{" "}
                e da{" "}
                <Link
                  to="/privacy"
                  className="text-muted font-medium hover:text-action hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-copper rounded-[2px]"
                >
                  Política de Privacidade (LGPD)
                </Link>
                .
              </p>
            </form>

            {/* Alternador para Cadastro */}
            <div className="border-t border-border/80 pt-4 text-center">
              <p className="text-xs text-muted">
                Novo no Zaeron Contábil?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    login.reset();
                  }}
                  className="font-semibold text-action hover:underline transition-colors focus-visible:underline"
                >
                  Cadastre seu escritório
                </button>
              </p>
            </div>
          </div>

          {/* Rodapé Mobile de Segurança */}
          <footer className="flex lg:hidden items-center justify-center gap-2 text-center text-[11px] text-muted/70">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            <span>Sessão segura criptografada HttpOnly</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
