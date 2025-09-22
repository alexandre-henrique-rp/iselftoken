"use client";

import React from "react";
import { setLanguage } from "@/i18n";

/**
 * Componente client para seleção de idioma.
 * - Salva o locale em cookie ("locale") e funciona com i18n.
 * - Suporta todos os locales: pt-BR, pt-PT, en-US, en-UK, es-ES.
 */
interface LanguageSelectProps {
  defaultLocale?: "pt-BR" | "pt-PT" | "en-US" | "en-UK" | "es-ES";
}

// Configuração de locales suportados
const supportedLocales = ["pt-BR", "pt-PT", "en-US", "en-UK", "es-ES"] as const;
type SupportedLocale = typeof supportedLocales[number];

// Mapeamento para verificar se um locale é suportado
function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function LanguageSelect({ defaultLocale = "pt-BR" }: LanguageSelectProps) {
  const [value, setValue] = React.useState<SupportedLocale>(() => {
    // Inicialização lazy - só executa no cliente
    if (typeof window === 'undefined') {
      return defaultLocale;
    }

    // Verifica cookie na inicialização
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    const cookieLocale = match ? decodeURIComponent(match[1]) : null;

    if (cookieLocale && isSupportedLocale(cookieLocale)) {
      return cookieLocale;
    }

    return defaultLocale;
  });

  React.useEffect(() => {
    // Sincroniza o i18n com o valor atual
    setLanguage(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLocale = e.target.value;

    if (isSupportedLocale(selectedLocale)) {
      setValue(selectedLocale);

      // Salva cookie (1 ano)
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `locale=${encodeURIComponent(selectedLocale)}; expires=${expires.toUTCString()}; path=/`;

      // Aplica mudança de idioma
      setLanguage(selectedLocale);
    }
  };

  return (
    <div className="relative">
      <select
        className="appearance-none rounded-md border border-border bg-muted py-2 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        value={value}
        onChange={handleChange}
      >
        <option value="pt-BR">BR 🇧🇷</option>
        <option value="pt-PT">PT 🇵🇹</option>
        <option value="en-US">EN 🇺🇸</option>
        {/* <option value="en-UK">UK 🇬🇧</option> */}
        <option value="es-ES">ES 🇪🇸</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
