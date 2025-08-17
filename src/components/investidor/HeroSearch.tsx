"use client";

import { IconSearch } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";

/**
 * HeroSearch
 * Bloco de destaque com título, subtítulo, busca e chips de categorias.
 * Stateless: emite callbacks opcionais para busca e seleção de chip.
 */
export function HeroSearch({
  title = "Descubra oportunidades em alta",
  subtitle = "Explore startups por categoria, performance e potencial.",
  chips = [
    "Todos",
    "Saúde",
    "Agro",
    "Fintech",
    "Educação",
    "Energia",
    "Mobilidade",
  ],
  onSearch,
  onChipSelect,
}: {
  title?: string;
  subtitle?: string;
  chips?: string[];
  onSearch?: (term: string) => void;
  onChipSelect?: (chip: string) => void;
}) {
  const [term, setTerm] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(term);
  }

  return (
    <section className="px-4 lg:px-6">
      <div className="bg-card relative overflow-hidden rounded-xl border p-6">
        <div className="from-primary/10 via-primary/5 absolute inset-0 -z-10 bg-gradient-to-br to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 md:w-96">
            <div className="relative w-full">
              <IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar startups, segmentos, tags..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <Button type="submit" className="whitespace-nowrap">Pesquisar</Button>
          </form>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Badge
              key={chip}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onChipSelect?.(chip)}
            >
              {chip}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
