"use client";
import React from "react";
import Link from "next/link";
import { Linkedin, Youtube, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export type StartupTestimonialData = {
  // Valores literais (fallback)
  name?: string;
  testimonial?: string;
  role?: string;
  // Chaves i18n (preferenciais)
  nameKey?: string;
  testimonialKey?: string;
  roleKey?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;
};

type StartupTestimonialCardProps = {
  data: StartupTestimonialData;
};

/**
 * Componente para exibir card de depoimento de startup
 * com nome, depoimento, função e links sociais (LinkedIn, YouTube, Website)
 */
export function StartupTestimonialCard({ data }: StartupTestimonialCardProps) {
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
      <div className="p-6 pt-0">
        <div className="mb-4 flex items-center">
          <div className="mr-4 h-12 w-12 rounded-full bg-zinc-600 dark:bg-muted text-white flex items-center justify-center font-semibold uppercase select-none">
            {getInitials(name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            {role && (
              <p className="text-sm text-blue-600 dark:text-muted-foreground">{role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.linkedinUrl && (
            <Link
              href={data.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0A66C2] transition-colors hover:text-[#004182]"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          )}
          {data.youtubeUrl && (
            <Link
              href={data.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 transition-colors hover:text-red-700"
            >
              <Youtube className="h-5 w-5" />
            </Link>
          )}
          {data.websiteUrl && (
            <Link
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 transition-colors hover:text-green-600"
            >
              <Globe className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
