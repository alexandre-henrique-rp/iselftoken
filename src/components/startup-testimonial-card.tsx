import React from "react";
import Link from "next/link";
import { Linkedin, Youtube, Globe } from "lucide-react";

export type StartupTestimonialData = {
  name: string;
  testimonial: string;
  role?: string;
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
  return (
    <div className="bg-black rounded-xl border border-zinc-800">
      <div className="p-6">
        <p className="text-zinc-400 italic">&quot;{data.testimonial}&quot;</p>
      </div>
      <div className="p-6 pt-0">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
          <div>
            <p className="font-semibold text-zinc-100">{data.name}</p>
            {data.role && (
              <p className="text-sm text-blue-400">{data.role}</p>
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
