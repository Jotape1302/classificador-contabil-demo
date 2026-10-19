import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { KeyRound, LoaderCircle, Mail, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useResendCode, useVerifyCode } from "../../hooks/use-auth";
import { Button } from "../ui/button";

interface OtpVerificationModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OtpVerificationModal({ email, isOpen, onClose }: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyCode = useVerifyCode();
  const resendCode = useResendCode();

  // Reset timer on open
  useEffect(() => {
    if (isOpen) {
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      setErrorMsg(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Regressive countdown timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

  if (!isOpen) return null;

  function handleDigitChange(index: number, val: string) {
    const numeric = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = numeric;
    setDigits(newDigits);
    setErrorMsg(null);

    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      submitCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setErrorMsg(null);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      submitCode(pasted);
    }
  }

  function submitCode(code: string) {
    if (code.length !== 6) {
      setErrorMsg("Por favor, digite todos os 6 dígitos do código.");
      return;
    }
    verifyCode.mutate(
      { email, code },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err.message || "Código de verificação incorreto ou expirado.");
        },
      }
    );
  }

  function handleResend() {
    if (cooldown > 0) return;
    resendCode.mutate(email, {
      onSuccess: () => {
        setCooldown(60);
        setErrorMsg(null);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      },
      onError: (err: any) => {
        setErrorMsg(err.message || "Não foi possível reenviar o código.");
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-elevated p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-sidebar hover:text-title"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-copper/30 bg-copper/10 text-action">
            <KeyRound className="size-6" />
          </div>
          <h2 className="text-xl font-semibold text-title">Verificação de Segurança</h2>
          <p className="mt-1 text-xs text-muted">
            Enviamos um código de 6 dígitos para o e-mail:
          </p>
          <p className="mt-0.5 text-xs font-semibold text-action flex items-center justify-center gap-1.5">
            <Mail className="size-3.5" />
            {email}
          </p>
        </div>

        {/* Inputs de 6 Dígitos */}
        <div className="mb-6 flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="size-11 sm:size-12 rounded-xl border border-border bg-canvas text-center font-mono text-xl font-bold text-title shadow-inner transition-all focus:border-action focus:bg-elevated focus:outline-none focus:ring-2 focus:ring-action/20"
              autoComplete="one-time-code"
              disabled={verifyCode.isPending}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-center text-xs text-danger animate-in fade-in duration-200">
            {errorMsg}
          </p>
        )}

        <Button
          className="w-full"
          disabled={verifyCode.isPending || digits.some((d) => !d)}
          onClick={() => submitCode(digits.join(""))}
        >
          {verifyCode.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin mr-2" />
              Validando código…
            </>
          ) : (
            <>
              <ShieldCheck className="size-4 mr-2 text-success" />
              Confirmar e Acessar
            </>
          )}
        </Button>

        {/* Reenvio com Cooldown */}
        <div className="mt-5 text-center">
          {cooldown > 0 ? (
            <p className="text-xs text-muted">
              Reenviar código em <span className="font-mono font-semibold text-action">{cooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              disabled={resendCode.isPending}
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action hover:underline"
            >
              {resendCode.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Reenviar código por e-mail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
