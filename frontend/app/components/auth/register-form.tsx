import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useToast } from "~/context/ToastContext";
import { useRegisterMutation } from "~/hooks/use-register-mutation";
import { applyPhoneMask, unmaskValue } from "~/lib/mask-utils";
import { postAuthRedirect } from "~/lib/post-auth-redirect";
import { countriesQueryOptions } from "~/lib/queries";
import {
  ConsentCheckbox,
  PasswordField,
  PasswordRule,
} from "./register-form-fields";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-card px-4 py-3.5 text-sm text-foreground transition placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const labelClass =
  "ml-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export function RegisterForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState("55");
  const [telefoneLocal, setTelefoneLocal] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [senhaConfirmacaoTouched, setSenhaConfirmacaoTouched] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [politicaAceita, setPoliticaAceita] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showSenhaConfirmacao, setShowSenhaConfirmacao] = useState(false);
  const [isDdiOpen, setIsDdiOpen] = useState(false);

  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const { showToast } = useToast();
  const loading = registerMutation.isPending;

  const [affiliateCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) return fromUrl.trim();
    const match = document.cookie.match(/(?:^|;\s*)aff_ref=([^;]+)/);
    return match ? decodeURIComponent(match[1]).trim() : null;
  });

  const { data: serverCountries = [], isLoading: countriesLoading } = useQuery(
    countriesQueryOptions,
  );
  const countries = serverCountries.filter((country) => country.phonecode);
  const sortedCountries = [...countries].sort(
    (a, b) => (Number(a.phonecode) || 0) - (Number(b.phonecode) || 0),
  );
  const selectedCountry =
    sortedCountries.find((country) => country.phonecode === ddi) ??
    sortedCountries.find((country) => country.iso2 === "BR") ??
    sortedCountries[0];

  const isMinLength = senha.length >= 12;
  const hasUppercase = /[A-Z]/.test(senha);
  const hasLowercase = /[a-z]/.test(senha);
  const hasNumber = /\d/.test(senha);
  const hasSpecial = /[^A-Za-z0-9]/.test(senha);
  const telefoneLimpo = unmaskValue(telefoneLocal);
  const isFormComplete =
    nome.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@") &&
    [10, 11].includes(telefoneLimpo.length) &&
    isMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    senha === senhaConfirmacao &&
    termosAceitos &&
    politicaAceita;
  const senhaNaoCoincide =
    senhaConfirmacaoTouched &&
    senhaConfirmacao.length > 0 &&
    senha !== senhaConfirmacao;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nome.trim()) return showToast("Nome completo é obrigatório", "error");
    if (!email.trim() || !email.includes("@")) {
      return showToast("E-mail inválido", "error");
    }
    if (![10, 11].includes(telefoneLimpo.length)) {
      return showToast(
        "Informe um telefone fixo com 10 dígitos ou celular com 11 dígitos",
        "error",
      );
    }
    if (!isMinLength) {
      return showToast("A senha deve ter no mínimo 12 caracteres", "error");
    }
    if (!hasUppercase) {
      return showToast(
        "A senha deve conter pelo menos 1 letra maiúscula",
        "error",
      );
    }
    if (!hasLowercase) {
      return showToast(
        "A senha deve conter pelo menos 1 letra minúscula",
        "error",
      );
    }
    if (!hasNumber) {
      return showToast("A senha deve conter pelo menos 1 número", "error");
    }
    if (!hasSpecial) {
      return showToast(
        "A senha deve conter pelo menos 1 caractere especial",
        "error",
      );
    }
    if (senha !== senhaConfirmacao) {
      return showToast("As senhas não coincidem", "error");
    }
    if (!termosAceitos) {
      return showToast(
        "Você deve aceitar os Termos de Uso do iSelfToken",
        "error",
      );
    }
    if (!politicaAceita) {
      return showToast(
        "Você deve aceitar a Política de Privacidade de dados",
        "error",
      );
    }

    try {
      const result = await registerMutation.mutateAsync({
        email: email.toLowerCase(),
        nome: nome.trim(),
        senha,
        senhaConfirmacao,
        telefone: `${ddi}${telefoneLimpo}`,
        termosAceitos,
        politicaAceita,
        role: "INVESTOR",
        affiliateCode: affiliateCode || undefined,
      });

      showToast("Conta criada com sucesso!", "success");
      setTimeout(() => navigate(postAuthRedirect(result)), 2000);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao criar conta",
        "error",
      );
    }
  };

  return (
    <div className="relative z-10 w-full max-w-xl transition-all duration-500">
      <header className="mb-8 space-y-3 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Cadastro
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Crie sua conta
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          Comece sua jornada no ecossistema de investimentos da iSelfToken.
        </p>
        {affiliateCode && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Indicação de afiliado
            </span>
            <span className="font-mono text-xs text-foreground">
              {affiliateCode}
            </span>
          </div>
        )}
      </header>

      <form
        className="space-y-5 md:space-y-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="space-y-5 md:space-y-6">
          <div className="space-y-2">
            <label htmlFor="register-name" className={labelClass}>
              Nome completo
            </label>
            <input
              id="register-name"
              name="nome"
              className={inputClass}
              placeholder="Digite seu nome completo"
              required
              autoComplete="name"
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="register-email" className={labelClass}>
              E-mail
            </label>
            <input
              id="register-email"
              name="email"
              className={inputClass}
              placeholder="nome@empresa.com"
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="px-1 text-xs text-muted-foreground">
              O e-mail será convertido automaticamente para minúsculas.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-phone" className={labelClass}>
              Telefone
            </label>
            <div className="flex min-w-0 gap-2 sm:gap-3">
              <div className="relative w-28 shrink-0 sm:w-32">
                <button
                  id="register-ddi"
                  type="button"
                  aria-label="Selecionar país e DDI"
                  aria-expanded={isDdiOpen}
                  aria-haspopup="listbox"
                  aria-busy={countriesLoading}
                  disabled={countriesLoading || sortedCountries.length === 0}
                  onClick={() => setIsDdiOpen((open) => !open)}
                  className="flex h-full w-full items-center justify-between rounded-xl border border-white/10 bg-card px-3 text-sm text-foreground transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg" aria-hidden="true">
                      {selectedCountry?.emoji ??
                        (countriesLoading ? "…" : "🌐")}
                    </span>
                    <span className="font-semibold">
                      {selectedCountry
                        ? `+${selectedCountry.phonecode}`
                        : "DDI"}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
                {isDdiOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Fechar seleção de país"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsDdiOpen(false)}
                    />
                    <ul
                      id="register-ddi-options"
                      role="listbox"
                      aria-label="Países disponíveis"
                      className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full min-w-40 overflow-y-auto rounded-xl border border-white/10 bg-surface-container-highest p-1 shadow-2xl"
                    >
                      {sortedCountries.map((country) => (
                        <li
                          key={country.id || country.iso2}
                          role="option"
                          aria-selected={country.phonecode === ddi}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setDdi(country.phonecode);
                              setIsDdiOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="text-lg" aria-hidden="true">
                              {country.emoji}
                            </span>
                            <span className="font-semibold">
                              +{country.phonecode}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {country.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <input
                id="register-phone"
                name="telefone"
                className={`${inputClass} min-w-0`}
                placeholder="(11) 9 8765-4321"
                required
                autoComplete="tel-national"
                inputMode="tel"
                maxLength={16}
                type="tel"
                value={telefoneLocal}
                onChange={(event) =>
                  setTelefoneLocal(applyPhoneMask(event.target.value))
                }
              />
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              Aceitamos telefone fixo (10 dígitos) ou celular (11 dígitos).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <PasswordField
              id="register-password"
              label="Senha"
              value={senha}
              visible={showSenha}
              onChange={setSenha}
              onToggle={() => setShowSenha((visible) => !visible)}
            />
            <div className="space-y-2">
              <PasswordField
                id="register-password-confirmation"
                label="Confirmar senha"
                value={senhaConfirmacao}
                visible={showSenhaConfirmacao}
                onChange={setSenhaConfirmacao}
                onToggle={() => setShowSenhaConfirmacao((visible) => !visible)}
                onBlur={() => setSenhaConfirmacaoTouched(true)}
              />
              {senhaNaoCoincide && (
                <p className="px-1 text-xs text-destructive" role="alert">
                  As senhas não coincidem.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-accent/20 p-4 md:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Segurança da senha
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PasswordRule valid={isMinLength}>
                Mínimo 12 caracteres
              </PasswordRule>
              <PasswordRule valid={hasUppercase}>
                1 letra maiúscula
              </PasswordRule>
              <PasswordRule valid={hasLowercase}>
                1 letra minúscula
              </PasswordRule>
              <PasswordRule valid={hasNumber}>1 número</PasswordRule>
              <PasswordRule valid={hasSpecial}>
                1 caractere especial
              </PasswordRule>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-5">
          <ConsentCheckbox
            id="register-terms"
            checked={termosAceitos}
            onChange={setTermosAceitos}
          >
            Aceito os{" "}
            <Link
              to="/termos-de-uso"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Termos de Uso
            </Link>{" "}
            do iSelfToken.
          </ConsentCheckbox>
          <ConsentCheckbox
            id="register-privacy"
            checked={politicaAceita}
            onChange={setPoliticaAceita}
          >
            Aceito a{" "}
            <Link
              to="/politica-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Política de Privacidade
            </Link>{" "}
            de dados.
          </ConsentCheckbox>
        </div>

        <div className="pt-2">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-[0_12px_32px_-10px_rgba(213,0,249,0.5)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            type="submit"
            disabled={loading || !isFormComplete}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Criar conta"
            )}
          </button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              className="font-bold text-primary transition hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
