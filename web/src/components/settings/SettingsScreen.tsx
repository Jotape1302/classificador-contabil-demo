import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  KeyRound,
  Lock,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useCurrentUser, useUpdateUser, useChangePassword } from "../../hooks/use-auth";
import { useTheme } from "../../hooks/use-theme";
import type { User } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Sidebar } from "../classifier/Sidebar";

const clientRanges = [
  "1 a 20 empresas",
  "21 a 50 empresas",
  "51 a 100 empresas",
  "Mais de 100 empresas",
];

export function SettingsScreen({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<"appearance" | "account">("appearance");
  const { theme, setTheme } = useTheme();
  const currentUserQuery = useCurrentUser();
  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();

  // Account form state
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [officeName, setOfficeName] = useState(user.office_name || "");
  const [clientRange, setClientRange] = useState(
    currentUserQuery.data?.profile?.client_range || "1 a 20 empresas"
  );

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  function notify(message: string, error = false) {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        office_name: officeName.trim() || undefined,
        client_range: clientRange,
      });
      notify("Configurações do escritório salvas com sucesso!");
    } catch (err: any) {
      notify(err.message || "Erro ao salvar configurações.", true);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify("A nova senha e a confirmação não coincidem.", true);
      return;
    }
    if (newPassword.length < 12) {
      notify("A nova senha deve ter no mínimo 12 caracteres.", true);
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Senha alterada com sucesso!");
    } catch (err: any) {
      notify(err.message || "Erro ao alterar a senha.", true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <header className="border-b border-border pb-5">
            <div className="flex items-center gap-2">
              <Badge tone="copper">PREFERÊNCIAS</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-title sm:text-3xl">
              Configurações da Plataforma
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              Gerencie a identidade visual, dados do escritório e credenciais de segurança.
            </p>
          </header>

          {/* Abas */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "appearance"
                  ? "border-copper text-action"
                  : "border-transparent text-muted hover:text-title"
              }`}
            >
              <Palette className="size-3.5" />
              Aparência & Tema
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "account"
                  ? "border-copper text-action"
                  : "border-transparent text-muted hover:text-title"
              }`}
            >
              <Building2 className="size-3.5" />
              Conta & Escritório
            </button>
          </div>

          {/* Conteúdo da Aba Aparência */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                  Tema da Interface
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Alterne entre o Dark Mode corporativo da Zaeron e o Light Mode para ambientes de alta luminosidade.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Card Dark Mode */}
                  <div
                    onClick={() => setTheme("dark")}
                    className={`group relative cursor-pointer rounded-[4px] border p-4 transition-all duration-200 ${
                      theme === "dark"
                        ? "border-copper/80 bg-copper/[0.06] ring-1 ring-copper/30"
                        : "border-border bg-sidebar hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-[3px] bg-[#090B0D] p-2 text-copper border border-border">
                          <Moon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-title">Dark Mode (Padrão)</p>
                          <p className="text-[11px] text-muted">Estética corporativa Zaeron</p>
                        </div>
                      </div>
                      {theme === "dark" && (
                        <div className="rounded-full bg-copper p-0.5 text-canvas">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    {/* Mock preview */}
                    <div className="mt-4 overflow-hidden rounded-[3px] border border-[#2A3038] bg-[#090B0D] p-2.5">
                      <div className="flex items-center justify-between border-b border-[#2A3038] pb-1.5">
                        <div className="h-2 w-14 rounded-[1px] bg-[#C8753D]" />
                        <div className="h-2 w-6 rounded-[1px] bg-[#2A3038]" />
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="h-2 w-full rounded-[1px] bg-[#171B20]" />
                        <div className="h-2 w-3/4 rounded-[1px] bg-[#171B20]" />
                      </div>
                    </div>
                  </div>

                  {/* Card Light Mode */}
                  <div
                    onClick={() => setTheme("light")}
                    className={`group relative cursor-pointer rounded-[4px] border p-4 transition-all duration-200 ${
                      theme === "light"
                        ? "border-copper/80 bg-copper/[0.06] ring-1 ring-copper/30"
                        : "border-border bg-sidebar hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-[3px] bg-white p-2 text-action border border-border shadow-sm">
                          <Sun className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-title">Light Mode</p>
                          <p className="text-[11px] text-muted">Contraste diurno suave</p>
                        </div>
                      </div>
                      {theme === "light" && (
                        <div className="rounded-full bg-copper p-0.5 text-white">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    {/* Mock preview */}
                    <div className="mt-4 overflow-hidden rounded-[3px] border border-[#CCD3DE] bg-[#EEF1F6] p-2.5">
                      <div className="flex items-center justify-between border-b border-[#CCD3DE] pb-1.5">
                        <div className="h-2 w-14 rounded-[1px] bg-[#B25820]" />
                        <div className="h-2 w-6 rounded-[1px] bg-[#CCD3DE]" />
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="h-2 w-full rounded-[1px] bg-white border border-[#CCD3DE]/60 shadow-sm" />
                        <div className="h-2 w-3/4 rounded-[1px] bg-white border border-[#CCD3DE]/60 shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card Privacidade & Cookies (LGPD) */}
              <Card className="p-6">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <ShieldCheck className="size-4 text-copper" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-title">
                    Privacidade e Cookies (LGPD)
                  </h2>
                </div>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  Controle suas escolhas de privacidade e consentimento de cookies da plataforma Zaeron Contábil conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-muted">
                    <span className="font-medium text-title">Status:</span> Consentimentos registrados.
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.dispatchEvent(new CustomEvent("zaeron-open-cookie-settings"))}
                  >
                    Gerenciar Cookies & Consentimentos
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Conteúdo da Aba Conta & Escritório */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Card 1: Perfil do Contador & Escritório */}
              <Card className="p-6">
                <div className="flex items-center gap-2 border-b border-border/60 pb-4">
                  <UserIcon className="size-4 text-copper" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-title">
                    Dados do Escritório Contábil
                  </h2>
                </div>

                <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      Nome do Responsável
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome completo"
                        required
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      E-mail Corporativo
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@escritorio.com.br"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      Nome do Escritório Contábil
                      <Input
                        type="text"
                        value={officeName}
                        onChange={(e) => setOfficeName(e.target.value)}
                        placeholder="Ex: Prime Contabilidade & Consultoria"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      Porte / Faixa de Clientes Atendidos
                      <select
                        className="h-9 w-full rounded-[4px] border border-border bg-canvas px-3 text-xs text-title focus:border-copper focus:outline-none"
                        value={clientRange}
                        onChange={(e) => setClientRange(e.target.value)}
                      >
                        {clientRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-border/80">
                    <Button type="submit" disabled={updateUser.isPending}>
                      <Save className="size-3.5 mr-1.5" />
                      {updateUser.isPending ? "Salvando..." : "Salvar Dados do Escritório"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Card 2: Segurança & Alteração de Senha */}
              <Card className="p-6">
                <div className="flex items-center gap-2 border-b border-border/60 pb-4">
                  <KeyRound className="size-4 text-copper" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-title">
                    Segurança & Credenciais de Acesso
                  </h2>
                </div>

                <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                  <label className="block space-y-1.5 text-xs font-medium text-title">
                    Senha Atual
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted" />
                      <Input
                        className="pl-9"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      Nova Senha (mín. 12 caracteres)
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 size-4 text-muted" />
                        <Input
                          className="pl-9"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nova senha segura"
                          minLength={12}
                          required
                        />
                      </div>
                    </label>

                    <label className="block space-y-1.5 text-xs font-medium text-title">
                      Confirmar Nova Senha
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-2.5 size-4 text-muted" />
                        <Input
                          className="pl-9"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          minLength={12}
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-border/80">
                    <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
                      {changePassword.isPending ? "Atualizando..." : "Atualizar Senha de Acesso"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Notificação Toast */}
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
