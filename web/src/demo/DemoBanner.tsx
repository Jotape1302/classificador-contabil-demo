import { RotateCcw } from "lucide-react";
import { resetState } from "./store";

/** Faixa fixa do modo demonstração: deixa claro que os dados são locais e permite recomeçar. */
export function DemoBanner() {
  return (
    <div className="fixed right-3 top-3 z-40 flex items-center gap-3 rounded-[3px] border border-copper/40 bg-sidebar/95 px-3 py-1.5 text-[11px] text-muted shadow-lg backdrop-blur">
      <span>
        <strong className="text-copper">Demonstração</strong> · dados fictícios, salvos só neste navegador
      </span>
      <button
        type="button"
        onClick={() => {
          resetState();
          window.location.reload();
        }}
        className="flex items-center gap-1 font-semibold text-action hover:underline"
      >
        <RotateCcw className="size-3" aria-hidden="true" />
        Reiniciar
      </button>
    </div>
  );
}
