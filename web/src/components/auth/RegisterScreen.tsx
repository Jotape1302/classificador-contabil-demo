import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { useRegister } from "../../hooks/use-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  cleanDigits,
  maskDocument,
  validateDocument,
} from "../../lib/validators";
import { Zaeron3DLogo } from "./Zaeron3DLogo";

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Documento (CPF/CNPJ) com máscara dinâmica e validação estrita
  const [docRaw, setDocRaw] = useState("");
  const [docStatus, setDocStatus] = useState<{
    isValid: boolean;
    type: "cpf" | "cnpj" | null;
  }>({ isValid: false, type: null });

  // Aceite explícito de Termos de Uso e Política de Privacidade (LGPD)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const register = useRegister();

  function handleDocumentChange(val: string) {
    const masked = maskDocument(val);
    setDocRaw(masked);
    const result = validateDocument(masked);
    setDocStatus({ isValid: result.isValid, type: result.type });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    if (!docStatus.isValid) {
      return;
    }
    if (!termsAccepted) {
      return;
    }

    register.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      document_number: cleanDigits(docRaw),
      terms_accepted: true,
    });
  }

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    docStatus.isValid &&
    password.length >= 12 &&
    passwordsMatch &&
    termsAccepted;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-canvas">
      {/* Background Spatial Grid & Technical Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(200,117,61,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(240,138,62,0.04),transparent_40%)]" />

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* HERO 3D: Protagonista Tecnológica Zaeron */}
        <section className="flex flex-col items-center text-center">
          <Zaeron3DLogo size="md" showText={false} />

          <div className="mt-3 space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-title">
              Cadastro Profissional de Escritório
            </h1>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              Inicie imediatamente a conciliação contábil com aprendizado contínuo por regras e relatórios executivos.
            </p>
          </div>
        </section>

        {/* Formulário Estrutural de Cadastro */}
        <section className="rounded-[4px] border border-border bg-sidebar/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-border/80 pb-3 flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-copper">
                Nova Operação
              </span>
              <h2 className="text-base font-semibold text-title mt-0.5">
                Crie sua conta no Zaeron
              </h2>
            </div>
            <span className="font-mono text-[10px] text-muted border border-border/70 px-2 py-0.5 rounded-[2px] bg-canvas">
              LGPD Safe
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={register.isPending}>
            {/* 1. Nome Completo */}
            <label className="block space-y-1 text-xs font-medium text-title">
              Nome completo do responsável
              <div className="relative flex items-center">
                <UserIcon className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" />
                <Input
                  className="h-10 pl-10 pr-3 text-xs w-full"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana Paula Silva"
                />
              </div>
            </label>

            {/* 2. E-mail Corporativo */}
            <label className="block space-y-1 text-xs font-medium text-title">
              E-mail corporativo
              <div className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" />
                <Input
                  className="h-10 pl-10 pr-3 text-xs w-full"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@escritorio.com.br"
                />
              </div>
            </label>

            {/* 3. CPF ou CNPJ */}
            <label className="block space-y-1 text-xs font-medium text-title">
              <div className="flex items-center justify-between">
                <span>CPF ou CNPJ do escritório</span>
                {docRaw && (
                  <span
                    className={`font-mono text-[10px] font-semibold flex items-center gap-1 ${
                      docStatus.isValid ? "text-success" : "text-danger"
                    }`}
                  >
                    {docStatus.isValid ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        {docStatus.type?.toUpperCase()} Válido
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3" />
                        Documento inválido
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <FileText className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" />
                <Input
                  className={`h-10 pl-10 pr-3 font-mono text-xs w-full ${
                    docRaw && (docStatus.isValid ? "border-success/60" : "border-danger/60")
                  }`}
                  type="text"
                  required
                  value={docRaw}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            </label>

            {/* 4. Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-medium text-title">
                Senha (mín. 12 caracteres)
                <div className="relative flex items-center">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" />
                  <Input
                    className="h-10 pl-10 pr-3 text-xs w-full"
                    type="password"
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>
              </label>

              <label className="block space-y-1 text-xs font-medium text-title">
                Confirmar senha
                <div className="relative flex items-center">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 size-4 text-muted shrink-0 z-10" />
                  <Input
                    className={`h-10 pl-10 pr-3 text-xs w-full ${
                      showPasswordMismatch
                        ? "border-danger"
                        : passwordsMatch
                        ? "border-success/60"
                        : ""
                    }`}
                    type="password"
                    required
                    minLength={12}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>
              </label>
            </div>


            {showPasswordMismatch && (
              <p className="text-[11px] text-danger">As senhas digitadas não conferem.</p>
            )}

            {/* 5. Aceite Explícito de Termos e Política de Privacidade (LGPD) */}
            <div className="rounded-[4px] border border-border/80 bg-canvas/60 p-3 space-y-2">
              <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="size-3.5 mt-0.5 rounded-[2px] border-border accent-[#C8753D] cursor-pointer shrink-0"
                  required
                />
                <span className="leading-relaxed">
                  Declaro que li e concordo com os{" "}
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="font-medium text-action underline underline-offset-2 hover:text-action/80"
                  >
                    Termos de Uso
                  </button>{" "}
                  e com a{" "}
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="font-medium text-action underline underline-offset-2 hover:text-action/80"
                  >
                    Política de Privacidade (LGPD)
                  </button>
                  .
                </span>
              </label>
            </div>

            {register.isError && (
              <p
                role="alert"
                className="rounded-[3px] border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs text-danger animate-in fade-in duration-200"
              >
                {register.error?.message || "Não foi possível concluir o cadastro. Verifique os dados."}
              </p>
            )}

            <Button
              className="w-full h-10 mt-2 text-xs"
              type="submit"
              disabled={register.isPending || !isFormValid}
            >
              {register.isPending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin mr-2" />
                  Criando conta do escritório…
                </>
              ) : (
                <>
                  Criar Conta Operacional
                  <ArrowRight className="size-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <div className="border-t border-border/80 pt-4 text-center">
            <p className="text-xs text-muted">
              Já possui uma conta ativa?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-action hover:underline transition-colors focus-visible:underline"
              >
                Acesse aqui
              </button>
            </p>
          </div>
        </section>

        {/* Rodapé */}
        <footer className="flex items-center justify-center gap-2 text-center text-[11px] text-muted/70">
          <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
          <span>Ambiente seguro • Conformidade com a Lei Geral de Proteção de Dados (LGPD)</span>
        </footer>
      </div>

      {/* Modal de Termos de Uso e Política de Privacidade (LGPD) */}
      {isTermsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Termos de Uso e Política de Privacidade"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[4px] border border-border bg-sidebar p-6 text-title shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-copper" />
                <h3 className="text-base font-semibold text-title">
                  Termos de Uso e Privacidade LGPD
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="rounded-[3px] p-1.5 text-muted hover:bg-elevated hover:text-title transition-colors"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-muted max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <h4 className="text-sm font-semibold text-title mb-1">
                  1. Finalidade e Base Legal (LGPD)
                </h4>
                <p>
                  O Zaeron Contábil atua no tratamento de dados para execução de contrato (art. 7º, V da Lei nº 13.709/2018), oferecendo motor de classificação, auditoria e conciliação contábil para escritórios e profissionais contábeis.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-title mb-1">
                  2. Tratamento Seguro e Sanitização de PII
                </h4>
                <p>
                  Todos os extratos e transações submetidos à plataforma passam por rotinas automáticas de ofuscação de dados pessoais sensíveis (CPFs, e-mails, telefones e chaves Pix) antes de qualquer interação externa ou contextual.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-title mb-1">
                  3. Confidencialidade e Armazenamento
                </h4>
                <p>
                  Seus dados e regras personalizadas de classificação são armazenados com isolamento multi-tenant estrito e criptografia de credenciais via Bcrypt. Sessões são protegidas via cookies seguros HttpOnly.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-title mb-1">
                  4. Direitos do Titular (LGPD)
                </h4>
                <p>
                  Você pode a qualquer momento consultar, corrigir ou solicitar a exclusão de seus dados de cadastro entrando em contato com nosso canal de privacidade pelo painel de configurações.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTermsOpen(false)}
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setTermsAccepted(true);
                  setIsTermsOpen(false);
                }}
              >
                Aceitar Termos
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
