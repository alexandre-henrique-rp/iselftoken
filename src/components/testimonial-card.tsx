"use client";
import React from "react";
import { useTranslation } from "react-i18next";

export type TestimonialData = {
  // Valores literais (fallback)
  name?: string;
  testimonial?: string;
  role?: string;
  // Chaves i18n (preferenciais)
  nameKey?: string;
  testimonialKey?: string;
  roleKey?: string;
};

type TestimonialCardProps = {
  data: TestimonialData;
};

/**
 * Componente para exibir card de depoimento simples
 * Suporta textos literais ou chaves i18n (common namespace)
 */
export function TestimonialCard({ data }: TestimonialCardProps) {
  const { t } = useTranslation("common");
  const quote = data.testimonialKey ? t(data.testimonialKey) : data.testimonial;
  const name = data.nameKey ? t(data.nameKey) : data.name;
  const role = data.roleKey ? t(data.roleKey) : data.role;
  // Função para extrair iniciais do nome (máx. 2 letras)
  const getInitials = (fullName?: string): string => {
    if (!fullName) return "";
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => (n[0] ? n[0].toUpperCase() : ""))
      .join("");
  };

  return (
    <div className="rounded-xl border border-zinc-300 dark:border-border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <p className="italic text-muted-foreground">&quot;{quote}&quot;</p>
      </div>
      <div className="flex items-center p-6 pt-0">
        <div className="mr-4 h-12 w-12 rounded-full bg-zinc-600 dark:bg-muted text-white flex items-center justify-center font-semibold uppercase select-none">
          {getInitials(name)}
        </div>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          {role && <p className="text-sm text-blue-600 dark:text-muted-foreground">{role}</p>}
        </div>
      </div>
    </div>
  );
}
