import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useResetPasswordMutation } from "~/hooks/use-reset-password-mutation";
import { cn } from "~/lib/utils";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const resetPasswordMutation = useResetPasswordMutation();
  const success = resetPasswordMutation.isSuccess;
  const loading = resetPasswordMutation.isPending;
  const error =
    localError ||
    (resetPasswordMutation.isError ? resetPasswordMutation.error.message : "");

  useEffect(() => {
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    setPasswordStrength(Math.min(strength, 4));
  }, [newPassword]);

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!token) {
      setLocalError(
        "Link de redefinição inválido ou incompleto. Solicite um novo link.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setLocalError("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setLocalError("A senha deve conter letra maiúscula, minúscula e número");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("As senhas não coincidem");
      return;
    }

    resetPasswordMutation.mutate(
      {
        token,
        senha: newPassword,
        confirmarSenha: confirmPassword,
      },
      {
        onSuccess: () => {
          setLocalError("");
          setTimeout(() => navigate("/login"), 3000);
        },
      },
    );
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto transition-all duration-500">
        <header className="mb-8 lg:mb-10 text-center md:text-left space-y-3">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Senha Alterada!
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground font-medium">
            Sua senha foi atualizada com sucesso. Redirecionando para o login...
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500">
      <header className="mb-8 lg:mb-10 text-center md:text-left">
        <p className="text-primary font-bold tracking-[0.2em] mb-2 uppercase text-[10px] lg:text-xs">
          Nova Senha
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-3">
          Redefinir Acesso
        </h2>
        <p className="text-sm lg:text-base text-muted-foreground font-medium">
          Crie uma senha forte e única para proteger seus ativos e dados.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="group space-y-2">
          <label className="block text-[10px] lg:text-xs font-bold tracking-widest text-primary uppercase ml-1">
            Nova Senha
          </label>
          <div className="relative flex items-center">
            <LockKeyhole className="absolute left-4 text-muted-foreground w-4 h-4 lg:w-5 lg:h-5 transition-colors group-focus-within:text-primary" />
            <input
              className="w-full bg-accent border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 text-foreground placeholder:text-muted-foreground/30 py-3 lg:py-3.5 pl-12 pr-12 transition-all duration-300 rounded-xl text-sm lg:text-base"
              placeholder="Mínimo 8 caracteres"
              required
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
              ) : (
                <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
              )}
            </button>
          </div>

          {newPassword && (
            <div className="pt-1 px-1">
              <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all",
                      i <= passwordStrength
                        ? passwordStrength <= 2
                          ? "bg-red-500"
                          : passwordStrength === 3
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        : "bg-border/20",
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                <span
                  className={cn(
                    passwordStrength <= 2
                      ? "text-red-500"
                      : passwordStrength === 3
                        ? "text-yellow-500"
                        : "text-green-500",
                  )}
                >
                  {passwordStrength <= 2
                    ? "Senha Fraca"
                    : passwordStrength === 3
                      ? "Senha Moderada"
                      : "Senha Forte"}
                </span>
                <span className="text-muted-foreground/50">
                  Mín. 8 caracteres
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="group space-y-2">
          <label className="block text-[10px] lg:text-xs font-bold tracking-widest text-primary uppercase ml-1">
            Confirmar Nova Senha
          </label>
          <div className="relative flex items-center">
            <CheckCircle2
              className={cn(
                "absolute left-4 w-4 h-4 lg:w-5 lg:h-5 transition-colors",
                confirmPassword && newPassword === confirmPassword
                  ? "text-green-500"
                  : "text-muted-foreground",
              )}
            />
            <input
              className="w-full bg-accent border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 text-foreground placeholder:text-muted-foreground/30 py-3 lg:py-3.5 pl-12 pr-6 transition-all duration-300 rounded-xl text-sm lg:text-base"
              placeholder="Repita a senha"
              required
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
            />
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              type="button"
              aria-label={
                showConfirmPassword
                  ? "Ocultar confirmação"
                  : "Mostrar confirmação"
              }
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
              ) : (
                <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            className="w-full kinetic-gradient text-primary-foreground font-black py-3.5 lg:py-4 rounded-xl text-base lg:text-lg shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] hover:shadow-[0_20px_48px_-8px_rgba(213,0,249,0.6)] active:scale-[0.95] transition-all uppercase tracking-widest flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span>Atualizar Senha</span>
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      <footer className="mt-6 text-center">
        <Link
          to="/login"
          className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors tracking-[0.2em] uppercase flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Voltar ao Login
        </Link>
      </footer>
    </div>
  );
}
