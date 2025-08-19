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
  return (
    <div className="bg-black rounded-xl border border-zinc-800">
      <div className="p-6">
        <p className="text-zinc-400 italic">&quot;{quote}&quot;</p>
      </div>
      <div className="p-6 pt-0">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
          <div>
            <p className="font-semibold text-zinc-100">{name}</p>
            {role && (
              <p className="text-sm text-blue-400">{role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.linkedinUrl && (
            <Link
              href={data.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-blue-400 transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          )}
          {data.youtubeUrl && (
            <Link
              href={data.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Youtube className="h-5 w-5" />
            </Link>
          )}
          {data.websiteUrl && (
            <Link
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-green-400 transition-colors"
            >
              <Globe className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
