import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Mail,
} from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router";
import { useForgotPasswordMutation } from "~/hooks/use-forgot-password-mutation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const forgotPassword = useForgotPasswordMutation();

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    forgotPassword.mutate(
      { email },
      {
        onSuccess: () => {
          // O backend envia o link com o token por email. Não redirecionar
          // para o reset sem esse token na URL.
        },
      },
    );
  };

  const loading = forgotPassword.isPending;
  const success = forgotPassword.isSuccess;
  const error = forgotPassword.isError ? forgotPassword.error.message : "";

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto transition-all duration-500">
        <header className="mb-8 lg:mb-10 text-center md:text-left space-y-3">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Link Enviado!
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground font-medium">
            Enviamos um link de redefinição para <strong>{email}</strong>.
            Verifique sua caixa de entrada.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500">
      {/* Mobile Branding */}
      <div className="lg:hidden mb-10 text-center">
        <h2 className="text-3xl font-black text-primary tracking-tighter italic uppercase">
          iSelfToken
        </h2>
      </div>

      <header className="mb-8 lg:mb-10 text-center md:text-left space-y-3">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Recuperar Senha
        </h2>
        <p className="text-sm lg:text-base text-muted-foreground font-medium">
          Insira seu e-mail para receber o link de redefinição e retomar seu
          acesso.
        </p>
      </header>

      <form className="space-y-6 lg:space-y-8" onSubmit={handleSubmit}>
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Email Field */}
        <div className="group relative">
          <label
            className="block text-[10px] lg:text-xs font-bold uppercase tracking-widest text-primary mb-2 lg:mb-3 ml-1"
            htmlFor="email"
          >
            E-mail
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-4 text-muted-foreground w-4 h-4 lg:w-5 lg:h-5 transition-colors group-focus-within:text-primary" />
            <input
              className="w-full bg-accent border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 text-foreground placeholder:text-muted-foreground/30 py-3 lg:py-3.5 pl-12 pr-6 transition-all duration-300 rounded-xl text-sm lg:text-base"
              id="email"
              name="email"
              placeholder="exemplo@iself.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Primary CTA */}
        <button
          className="w-full kinetic-gradient text-primary-foreground font-black py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] hover:shadow-[0_20px_48px_-8px_rgba(213,0,249,0.6)] active:scale-[0.95] transition-all uppercase tracking-widest flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading || !email}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <span>Enviar Código</span>
              <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <footer className="pt-8 flex flex-col items-center gap-6">
        <Link
          to="/login"
          className="text-xs lg:text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Voltar para o login
        </Link>

        <div className="flex items-center gap-4 opacity-30 w-full">
          <div className="h-px flex-1 bg-linear-to-r from-transparent to-muted-foreground"></div>
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">
            Secure Hub Access
          </span>
          <div className="h-px flex-1 bg-linear-to-l from-transparent to-muted-foreground"></div>
        </div>
      </footer>
    </div>
  );
}
