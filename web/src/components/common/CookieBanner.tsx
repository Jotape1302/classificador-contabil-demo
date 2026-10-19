import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, Check, SlidersHorizontal, Info } from "lucide-react";
import { Button } from "../ui/button";

export interface CookiePreferences {
  essential: boolean; // always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

const STORAGE_KEY = "zaeron_cookie_consent_v1";

export function getStoredCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredCookiePreferences();
    if (!stored) {
      setIsOpen(true);
    } else {
      setFunctional(stored.functional);
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }

    const handleOpenSettings = () => {
      setIsCustomizeOpen(true);
      setIsOpen(true);
    };

    window.addEventListener("zaeron-open-cookie-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("zaeron-open-cookie-settings", handleOpenSettings);
    };
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    setIsOpen(false);
    setIsCustomizeOpen(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      decidedAt: new Date().toISOString(),
    });
  };

  const handleAcceptEssentialOnly = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      essential: true,
      functional,
      analytics,
      marketing,
      decidedAt: new Date().toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Consentimento de Cookies e Privacidade LGPD"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-sidebar/95 p-5 sm:p-6 shadow-2xl backdrop-blur-md pointer-events-auto">
        <div className="flex flex-col gap-4">
          {/* Header e Descrição */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-copper/15 text-action border border-copper/30">
                <Cookie className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-title flex items-center gap-2">
                  Privacidade e Cookies (LGPD)
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-copper/10 text-action border border-copper/20">
                    Transparência
                  </span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Utilizamos cookies e tecnologias essenciais para garantir o funcionamento seguro da autenticação e personalizar sua experiência na plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* Modal de Personalização Granular */}
          {isCustomizeOpen && (
            <div className="mt-2 space-y-3 rounded-xl border border-border/70 bg-elevated p-4 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" />
                  <div>
                    <p className="font-semibold text-title">Cookies Necessários (Obrigatórios)</p>
                    <p className="text-muted text-[11px]">
                      Indispensáveis para a sessão segura (JWT HttpOnly) e isolamento multi-tenant.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-canvas border border-border/60 px-2 py-1 rounded">
                  Sempre Ativo
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-copper" />
                  <div>
                    <p className="font-semibold text-title">Cookies Funcionais (Preferências)</p>
                    <p className="text-muted text-[11px]">
                      Salvam o tema visual (Dark/Light) e preferências de navegação local.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="size-4 rounded border-border accent-[#C8753D] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-muted" />
                  <div>
                    <p className="font-semibold text-title">Cookies Analíticos (Métricas)</p>
                    <p className="text-muted text-[11px]">
                      Auxiliam na análise de performance e aprimoramento da interface.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="size-4 rounded border-border accent-[#C8753D] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-muted" />
                  <div>
                    <p className="font-semibold text-title">Cookies de Marketing / Comunicação</p>
                    <p className="text-muted text-[11px]">
                      Comunicações direcionadas sobre atualizações do Zaeron Contábil.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="size-4 rounded border-border accent-[#C8753D] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className="text-xs text-muted hover:text-title underline-offset-4 hover:underline transition-colors"
            >
              {isCustomizeOpen ? "Ocultar preferências" : "Gerenciar preferências"}
            </button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {isCustomizeOpen ? (
                <Button size="sm" onClick={handleSaveCustom} className="w-full sm:w-auto">
                  <Check className="size-3.5 mr-1" />
                  Salvar preferências
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAcceptEssentialOnly}
                    className="w-full sm:w-auto text-xs"
                  >
                    Apenas essenciais
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    className="w-full sm:w-auto text-xs"
                  >
                    Aceitar todos
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
