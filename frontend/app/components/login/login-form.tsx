import { useState, type SyntheticEvent } from "react";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useLoginMutation } from "~/hooks/use-login-mutation";
import { useToast } from "~/context/ToastContext";
import { loginSchema } from "~/lib/login-schema";
import { postAuthRedirect } from "~/lib/post-auth-redirect";
import { setClientCookie, clearClientCookie } from "~/lib/cookies";

interface LoginFormProps {
  rememberedEmail?: string;
}

export function LoginForm({ rememberedEmail = "" }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const { showToast } = useToast();
  const loading = loginMutation.isPending;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    setEmailError(null);
    setPasswordError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (field === "email") setEmailError(issue.message);
        else if (field === "password") setPasswordError(issue.message);
      }
      return;
    }

    if (rememberMe) {
      setClientCookie("remembered_email", email);
    } else {
      clearClientCookie("remembered_email");
    }

    try {
      const result = await loginMutation.mutateAsync({ email, senha: password });
      const redirect = postAuthRedirect(result);
      const needs2FA = result?.requiresVerification === true;

      showToast(
        needs2FA
          ? "Enviamos um código de 6 dígitos para o seu email"
          : "Login realizado com sucesso!",
        needs2FA ? "info" : "success",
      );

      navigate(redirect, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      showToast(message, "error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500">
      {/* Mobile Branding */}
      <div className="lg:hidden mb-8 text-center">
        <h2 className="text-2xl font-bold text-primary tracking-tighter">
          iSelfToken
        </h2>
      </div>

      <header className="mb-6 lg:mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-2 lg:mb-3">Bem-vindo</h3>
        <p className="text-muted-foreground text-sm lg:text-base font-medium">
          Acesse sua conta para continuar sua jornada de investimento.
        </p>
      </header>

      <form className="space-y-5 lg:space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="group">
          <label
            className="block text-xs font-bold tracking-widest text-primary uppercase mb-2 lg:mb-3 ml-1"
            htmlFor="email"
          >
            Email Corporativo
          </label>
          <div className="relative">
            <input
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              className={`w-full bg-accent border-none border-b-2 ${
                emailError
                  ? "border-red-500 focus:border-red-500"
                  : "border-transparent focus:border-primary"
              } focus:ring-0 text-foreground px-4 lg:px-5 py-3 lg:py-3.5 rounded-xl transition-all placeholder:text-muted-foreground/30 text-sm lg:text-base`}
              id="email"
              name="email"
              placeholder="nome@empresa.com"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
          </div>
          {emailError && (
            <p id="email-error" role="alert" className="mt-2 ml-1 text-xs text-red-500 font-medium">
              {emailError}
            </p>
          )}
        </div>

        <div className="group">
          <label
            className="block text-xs font-bold tracking-widest text-primary uppercase mb-2 lg:mb-3 ml-1"
            htmlFor="password"
          >
            Senha de Acesso
          </label>
          <div className="relative">
            <input
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-error" : undefined}
              className={`w-full bg-accent border-none border-b-2 ${
                passwordError
                  ? "border-red-500 focus:border-red-500"
                  : "border-transparent focus:border-primary"
              } focus:ring-0 text-foreground px-4 lg:px-5 py-3 lg:py-3.5 rounded-xl transition-all placeholder:text-muted-foreground/30 text-sm lg:text-base`}
              id="password"
              name="password"
              placeholder="············"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
            <button
              className="absolute right-4 lg:right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
              ) : (
                <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
              )}
            </button>
          </div>
          {passwordError && (
            <p id="password-error" role="alert" className="mt-2 ml-1 text-xs text-red-500 font-medium">
              {passwordError}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs lg:text-sm">
          <label className="flex items-center gap-3 lg:gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                className="peer appearance-none w-4 h-4 lg:w-5 lg:h-5 border-2 border-border rounded-lg checked:bg-primary checked:border-primary transition-all"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Check className="w-3 h-3 lg:w-4 lg:h-4 absolute text-primary-foreground opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none stroke-[3]" />
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
              Lembrar credenciais
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-primary hover:text-primary/80 transition-colors font-bold border-b border-transparent hover:border-primary w-fit"
          >
            Recuperar senha
          </Link>
        </div>

        <button
          className="w-full kinetic-gradient text-primary-foreground font-bold py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] hover:shadow-[0_20px_48px_-8px_rgba(213,0,249,0.6)] active:scale-[0.98] transition-all uppercase tracking-widest mt-2 lg:mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      <footer className="mt-8 lg:mt-10 text-center border-t border-border pt-6 lg:pt-8">
        <p className="text-muted-foreground text-sm lg:text-base">
          Novo no ecossistema?
          <Link
            to="/register"
            className="text-primary font-bold ml-2 hover:underline underline-offset-8 decoration-2 transition-all block sm:inline mt-2 sm:mt-0"
          >
            Crie sua conta agora
          </Link>
        </p>
      </footer>
    </div>
  );
}
