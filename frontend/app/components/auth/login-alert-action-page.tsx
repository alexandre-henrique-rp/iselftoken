import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

type Action = "confirm-login" | "dismiss-session";
type State = "loading" | "success" | "error";
interface Result { error: boolean; message: string; data?: { status?: string; sessionsDeleted?: number; forcePasswordReset?: boolean; }; }

export function LoginAlertActionPage({ action }: { action: Action }) {
  const [state, setState] = useState<State>("loading");
  const [result, setResult] = useState<Result | null>(null);
  const isConfirm = action === "confirm-login";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setState("error");
      setResult({ error: true, message: "Link inválido. Solicite um novo alerta de segurança." });
      return;
    }
    let cancelled = false;
    fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => ({ ok: response.ok, body: (await response.json().catch(() => null)) as Result | null }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        setResult(body ?? { error: true, message: "Não foi possível processar o alerta." });
        setState(ok && body && !body.error ? "success" : "error");
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ error: true, message: "Não foi possível conectar ao serviço. Tente novamente em alguns minutos." });
          setState("error");
        }
      });
    return () => { cancelled = true; };
  }, [action]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <article className="w-full max-w-lg rounded-3xl border border-white/10 bg-card p-8 shadow-xl space-y-6">
        <header className="text-center space-y-2">
          {state === "loading" && <><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><h1 className="text-xl font-bold text-foreground">Processando...</h1></>}
          {state === "success" && <><ShieldCheck className="mx-auto h-12 w-12 text-primary" /><h1 className="text-xl font-bold text-foreground">{isConfirm ? "Login confirmado" : "Sessões desconectadas"}</h1></>}
          {state === "error" && <><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><h1 className="text-xl font-bold text-foreground">Não foi possível concluir</h1></>}
        </header>
        {result && <p className="text-center text-sm leading-relaxed text-muted-foreground">{result.message}</p>}
        {state === "success" && !isConfirm && <p className="text-center text-sm text-muted-foreground">Por segurança, altere sua senha antes de tentar acessar a conta novamente.</p>}
        {state !== "loading" && <Link to={isConfirm ? "/home" : "/login"} className="block rounded-full bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-[0_0_18px_rgba(213,0,249,0.25)]">{isConfirm ? "Ir para a conta" : "Ir para o login"}</Link>}
      </article>
    </main>
  );
}
