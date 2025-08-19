"use client";

import React from "react";
import { setLanguage } from "@/i18n";

/**
 * Componente client para seleção de idioma.
 * - Salva o locale em cookie ("locale") e recarrega a página.
 * - Não altera a URL, evitando dependência de rotas /[locale].
 */
interface LanguageSelectProps {
  defaultLocale?: "pt" | "en" | "es";
}

export function LanguageSelect({ defaultLocale = "pt" }: LanguageSelectProps) {
  const [value, setValue] = React.useState<"pt" | "en" | "es">(defaultLocale);

  React.useEffect(() => {
    // tenta obter do cookie 'locale'
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    const cookieLocale = match ? decodeURIComponent(match[1]) : null;
    if (cookieLocale === "pt" || cookieLocale === "en" || cookieLocale === "es") {
      setValue(cookieLocale);
      setLanguage(cookieLocale);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = e.target.value as "pt" | "en" | "es";
    setValue(locale);
    // salva cookie simples (1 ano)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `locale=${encodeURIComponent(locale)}; expires=${expires.toUTCString()}; path=/`;
    // aplica runtime sem reload
    setLanguage(locale);
  };

  return (
    <div className="relative">
      <select
        className="appearance-none bg-black text-zinc-200 border border-zinc-800 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        value={value}
        onChange={handleChange}
      >
        <option value="pt">PT 🇧🇷</option>
        <option value="en">EN 🇺🇸</option>
        <option value="es">ES 🇪🇸</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-200">
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
