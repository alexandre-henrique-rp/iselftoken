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

  return (
    <div className="bg-black rounded-xl border border-zinc-800">
      <div className="p-6">
        <p className="text-zinc-400 italic">&quot;{quote}&quot;</p>
      </div>
      <div className="flex items-center p-6 pt-0">
        <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
        <div>
          <p className="font-semibold text-zinc-100">{name}</p>
          {role && <p className="text-sm text-blue-400">{role}</p>}
        </div>
      </div>
    </div>
  );
}
