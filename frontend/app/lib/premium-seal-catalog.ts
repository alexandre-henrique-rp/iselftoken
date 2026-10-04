/**
 * Catálogo dos 4 selos curatoriais (ação "Coroar" em /admin/startups).
 *
 * Fonte canônica:
 *   - Backend seed: `backendnode/prisma/seed-premium-seals.ts` (idempotente)
 *   - Backend main seed: `backendnode/prisma/seed.ts` (mesmos 4 entries)
 *
 * Este arquivo é o espelho frontend — necessário porque o modal exibe
 * o selo mesmo quando o catálogo backend (`/api/admin/seals`) ainda está
 * carregando, e como fallback se algum selo não estiver no banco (e.g. PNG
 * faltando no deploy). Sincronizar manualmente se algum slug/nome mudar.
 *
 * @see CASE.md §Curadoria Premium
 */
export interface PremiumSealCatalogEntry {
  /** Slug único no banco. Usado em `assign-seal` e em `<img src>`. */
  slug: "alta_performance" | "aws" | "founders_hunter" | "potencial_unicornio";
  /** Nome exibido no card do modal. */
  name: string;
  /** Descrição completa (curta — até 280 chars). Exibida no card. */
  description: string;
  /** Categoria editorial (usada apenas como label visual). */
  category: "ACHIEVEMENT" | "PARTNERSHIP";
  /** Caminho do ícone no bucket público. */
  imagePath: string;
}

export const PREMIUM_SEAL_CATALOG: readonly PremiumSealCatalogEntry[] = [
  {
    slug: "alta_performance",
    name: "Alta Performance",
    description:
      "Startup com KPIs operacionais e financeiros acima da média do segmento, validado pela curadoria iSelfToken.",
    category: "ACHIEVEMENT",
    imagePath: "/icons/alta_performance.png",
  },
  {
    slug: "aws",
    name: "AWS Partner",
    description:
      "Startup parceira do programa AWS for Startups, com créditos e suporte técnico ativo da Amazon Web Services.",
    category: "PARTNERSHIP",
    imagePath: "/icons/aws.png",
  },
  {
    slug: "founders_hunter",
    name: "Founders Hunter",
    description:
      "Destaque editorial na comunidade Founders Hunter — validação por founders referência do ecossistema.",
    category: "PARTNERSHIP",
    imagePath: "/icons/founders_hunter.png",
  },
  {
    slug: "potencial_unicornio",
    name: "Potencial Unicórnio",
    description:
      "Valuation ≥ US$ 1B validado pela curadoria iSelfToken, com rodada aberta para novos investidores.",
    category: "ACHIEVEMENT",
    imagePath: "/icons/potencial_unicornio.png",
  },
] as const;

/** Mapeia slug → entry do catálogo (ou undefined se não existir). */
export function findPremiumSeal(slug: string): PremiumSealCatalogEntry | undefined {
  return PREMIUM_SEAL_CATALOG.find((s) => s.slug === slug);
}
