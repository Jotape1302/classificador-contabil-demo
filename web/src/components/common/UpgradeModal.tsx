import { CheckCircle2, MessageCircle, Sparkles, X, Zap } from "lucide-react";
import { Button } from "../ui/button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  if (!isOpen) return null;

  const whatsappUrl =
    "https://wa.me/5543991986605?text=" +
    encodeURIComponent(
      "Olá! Gostaria de conhecer os planos Zaeron Pro para conciliação contábil ilimitada e relatórios executivos."
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-[4px] border border-copper/40 bg-elevated p-6 shadow-2xl sm:p-8 space-y-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-[2px] p-1.5 text-muted hover:bg-sidebar hover:text-title"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[4px] border border-copper/30 bg-copper/10 text-action shadow-inner">
            <Zap className="size-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-[2px] border border-copper/30 bg-copper/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-action">
            <Sparkles className="size-3" />
            Zaeron Pro
          </div>

          <h2 className="mt-2 text-xl font-bold tracking-tight text-title">
            Limite de Conciliações Atingido
          </h2>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Você atingiu o limite da sua sessão gratuita. Atualize para o plano Zaeron Pro para conciliações ilimitadas e relatórios avançados.
          </p>
        </div>

        <div className="space-y-2.5 rounded-[4px] border border-border bg-sidebar p-4 text-xs text-title">
          <p className="font-mono font-semibold text-action text-[10px] uppercase tracking-wider">
            Vantagens da Assinatura Pro:
          </p>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
            <span>Processamento de extratos e conciliações <strong>ilimitadas</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
            <span>Memória contínua com regras operacionais ilimitadas do escritório</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
            <span>Relatórios executivos completos em PDF institucional, HTML e XLSX</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
            <span>Suporte técnico prioritário e consultoria de implantação</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full bg-[#25D366] text-black font-semibold hover:bg-[#20bd5a] h-9 text-xs">
              <MessageCircle className="size-3.5 mr-1.5" />
              Falar com Consultor
            </Button>
          </a>
          <Button variant="secondary" onClick={onClose} className="h-9 text-xs">
            Talvez depois
          </Button>
        </div>
      </div>
    </div>
  );
}
