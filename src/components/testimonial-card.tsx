import React from "react";

export type TestimonialData = {
  name: string;
  testimonial: string;
  role?: string;
};

type TestimonialCardProps = {
  data: TestimonialData;
};

/**
 * Componente para exibir card de depoimento simples
 * com nome, depoimento e função/cargo opcional
 */
export function TestimonialCard({ data }: TestimonialCardProps) {
  return (
    <div className="bg-black rounded-xl border border-zinc-800">
      <div className="p-6">
        <p className="text-zinc-400 italic">&quot;{data.testimonial}&quot;</p>
      </div>
      <div className="flex items-center p-6 pt-0">
        <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
        <div>
          <p className="font-semibold text-zinc-100">{data.name}</p>
          {data.role && (
            <p className="text-sm text-blue-400">{data.role}</p>
          )}
        </div>
      </div>
    </div>
  );
}
