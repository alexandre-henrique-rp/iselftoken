import { useState, useRef, useEffect, type SyntheticEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  navigateAfter2fa,
  useResend2faCodeMutation,
  useVerify2faMutation,
} from "~/hooks/use-verify-2fa-mutation";

export function TwoFactorForm() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const navigate = useNavigate();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyMutation = useVerify2faMutation();
  const resendMutation = useResend2faCodeMutation();

  const handleChange = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split("");
      const newOtp = [...otp];
      chars.forEach((char, i) => {
        if (i + index < 6) newOtp[i + index] = char;
      });
      setOtp(newOtp);
      setTimeout(() => {
        inputs.current[Math.min(index + chars.length, 5)]?.focus();
      }, 0);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    if (cleaned && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && index > 0 && otp[index] === "") {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData("text");
    const cleaned = pasteText.replace(/\D/g, "").slice(0, 6);

    if (cleaned.length >= 1) {
      e.preventDefault();
      setOtp(cleaned.split(""));
      setTimeout(() => inputs.current[Math.min(cleaned.length - 1, 5)]?.focus(), 0);
    }
  };

  useEffect(() => {
    const handleDocPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === "INPUT") return;

      const pasteText = e.clipboardData?.getData("text") || "";
      const cleaned = pasteText.replace(/\D/g, "").slice(0, 6);

      if (cleaned.length >= 1) {
        e.preventDefault();
        setOtp(cleaned.split(""));
        setTimeout(() => inputs.current[Math.min(cleaned.length - 1, 5)]?.focus(), 0);
      }
    };

    document.addEventListener("paste", handleDocPaste, true);
    return () => document.removeEventListener("paste", handleDocPaste, true);
  }, []);

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;
    verifyMutation.mutate(
      { codigo: code },
      {
        onSuccess: ({ role }) => {
          // Role-aware landing: ADMIN/FINANCEIRO/COMPLIANCE → /admin/dashboard;
          // USER → /home. Helper único garante consistência com o
          // fluxo de login (post-auth-redirect) e o loader de /2fa.
          navigate(navigateAfter2fa(role), { replace: true });
        },
      },
    );
  };

  const loading = verifyMutation.isPending;
  const resending = resendMutation.isPending;

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500">
      <div className="lg:hidden mb-8 text-center">
        <h2 className="text-3xl font-black text-primary tracking-tighter italic">
          iSelfToken
        </h2>
      </div>

      <header className="mb-6 lg:mb-8">
        <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 lg:mb-3">Verificação</h3>
        <p className="text-muted-foreground text-sm lg:text-base font-medium leading-relaxed">
          Insira o código de 6 dígitos enviado para o seu email cadastrado.
        </p>
      </header>

      <form className="space-y-6 lg:space-y-8" onSubmit={handleSubmit}>
        <div className="flex justify-between sm:justify-center gap-1.5 sm:gap-3">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              value={data}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handleInputPaste : undefined}
              className={cn(
                "w-[calc(100%/6-6px)] aspect-4/5 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black bg-accent border-none border-b-4 border-transparent focus:border-primary text-primary rounded-xl transition-all outline-none",
                data !== "" ? "border-primary/40" : "border-border/30"
              )}
            />
          ))}
        </div>

        <div className="pt-2 lg:pt-4">
          <button
            className="w-full kinetic-gradient text-primary-foreground font-black py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] hover:shadow-[0_20px_48px_-8px_rgba(213,0,249,0.6)] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar Código
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      <footer className="mt-8 lg:mt-12 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="pt-6 flex flex-col items-center gap-4">
          <p className="text-sm lg:text-base text-muted-foreground font-medium flex flex-wrap justify-center items-center gap-2">
            Não recebeu o código?
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resending}
              className="text-primary font-bold hover:underline underline-offset-8 transition-all flex items-center gap-1 group disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Enviando..." : "Reenviar"}
            </button>
          </p>

          <div className="flex justify-between items-center w-full px-4 text-[9px] lg:text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold mt-2">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 bg-primary/20 rounded-full"></span>
              Encrypted Session
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              Security Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}