import { Globe } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatedThemeToggler } from "~/components/ui/animated-theme-toggler";
import { Button } from "~/components/ui/button";

const languageOptions = [
  { value: "pt-BR", label: "BR 🇧🇷" },
  { value: "pt-PT", label: "PT 🇵🇹" },
  { value: "en-US", label: "EN 🇺🇸" },
  { value: "es-ES", label: "ES 🇪🇸" },
];

/**
 * @name Header
 * @description Renderiza o header fixo da homepage com ações principais.
 *
 * @returns {JSX.Element} Cabeçalho com logo, seletor de idioma e CTA de login.
 *
 * @example
 * <Header />
 *
 * Fluxo de execução:
 * 1. Controla o idioma selecionado
 * 2. Exibe navegação e botão de acesso
 */
export function Header() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("pt-BR");

  const handleLogin = () => {
    navigate("/login");
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 shadow-sm shadow-primary/10 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button
            type="button"
            onClick={handleHome}
            className="text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            iSelfToken
          </button>

          <div className="flex items-center gap-3">
            <label className="relative flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span className="sr-only">Selecionar idioma</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="appearance-none rounded-md border border-border bg-background px-2 py-1 pr-6 text-sm text-foreground shadow-sm shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Selecionar idioma"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-0 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </label>
            <AnimatedThemeToggler />
            <Button
              type="button"
              onClick={handleLogin}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
