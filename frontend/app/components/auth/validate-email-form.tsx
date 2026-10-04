import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { MailCheck, Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useValidateEmailMutation } from "~/hooks/use-validate-email-mutation";

export function ValidateEmailForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [countdown, setCountdown] = useState(5);
  const hasFetched = useRef(false);

  const mutation = useValidateEmailMutation();

  useEffect(() => {
    if (!token || hasFetched.current) return;
    hasFetched.current = true;
    mutation.mutate({ token });
  }, [token, mutation]);

  useEffect(() => {
    if (!mutation.isSuccess) return;

    let counter = 5;
    const interval = setInterval(() => {
      counter--;
      setCountdown(counter);
      if (counter <= 0) {
        clearInterval(interval);
        navigate("/");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mutation.isSuccess, navigate]);

  const status: "loading" | "success" | "error" = !token
    ? "error"
    : mutation.isSuccess
      ? "success"
      : mutation.isError
        ? "error"
        : "loading";

  const message = !token
    ? "Nenhum token de validação foi fornecido. Verifique o link enviado para o seu email."
    : mutation.isSuccess
      ? "Conta liberada para uso! Você será redirecionado em instantes..."
      : mutation.isError
        ? mutation.error.message
        : "";

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500 text-center">
      <div className="lg:hidden mb-8 text-center">
        <h2 className="text-3xl font-black text-primary tracking-tighter italic">
          iSelfToken
        </h2>
      </div>

      <header className="mb-6 lg:mb-8 flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border shadow-[0_0_20px_rgba(213,0,249,0.15)] animate-in zoom-in duration-500 ${
          status === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
          status === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' :
          'bg-primary/10 text-primary border-primary/20'
        }`}>
          {status === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
           status === 'error' ? <XCircle className="w-8 h-8" /> :
           <MailCheck className="w-8 h-8" />}
        </div>
        <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 lg:mb-3">
          {status === 'success' ? 'Email Verificado' :
           status === 'error' ? 'Falha na Validação' :
           'Verificação de Email'}
        </h3>
        <p className="text-muted-foreground text-sm lg:text-base font-medium leading-relaxed">
          {status === 'loading'
            ? "Processando a validação do seu email. Por favor, aguarde um momento."
            : message}
        </p>
      </header>

      <div className="pt-4 pb-8 flex flex-col items-center justify-center">
        {status === 'loading' ? (
           <div className="flex flex-col items-center gap-4 text-primary">
             <Loader2 className="w-10 h-10 animate-spin" />
             <span className="text-sm font-bold uppercase tracking-widest animate-pulse">Validando...</span>
           </div>
        ) : status === 'success' ? (
           <button
             onClick={() => navigate("/")}
             className="w-full bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 font-black py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(34,197,94,0.3)] hover:shadow-[0_20px_48px_-8px_rgba(34,197,94,0.4)] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-3"
           >
             Ir para Home ({countdown}s)
             <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
           </button>
        ) : (
           <button
             onClick={() => navigate("/login")}
             className="w-full kinetic-gradient text-primary-foreground font-black py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] hover:shadow-[0_20px_48px_-8px_rgba(213,0,249,0.6)] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-3"
           >
             Ir para o Login
             <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
           </button>
        )}
      </div>

      <footer className="mt-4 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="pt-6">
          <div className="flex justify-center items-center w-full px-4 text-[9px] lg:text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 bg-primary/20 rounded-full"></span>
              Secure Connection
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}