import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Tipo de um serviço do catálogo exposto pelo BFF /api/founder/services.
 *
 * Origem: rota backend `/admin/config/fundraising` para valores monetários
 * configuráveis (fastTrackFee, complianceFee) + constantes estaticas para
 * os demais. Mantemos tudo no mesmo shape para a UI.
 */
export interface FounderService {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDesc?: string | null;
  /** Preço em REAIS (Prisma Decimal). `null` = valor varia por contexto
   *  (ex.: prorrogação depende do valor adicional escolhido). */
  price: number | null;
  currency: string;
  category: string;
  /** PaymentPurpose correspondente — bate 1:1 com o enum Prisma. */
  purpose: string;
  /** `false` = "Em breve" na UI (não tem CTA). */
  available: boolean;
  /** Serviço de destaque — exibido primeiro + com borda magenta. */
  highlight?: boolean;
  benefits?: string[];
  /** Endpoint BFF/mutation para criar o Payment (path relativo a /api). */
  endpoint?: string | null;
  /** Status[] da campanha em que o servico pode ser contratado. */
  requiresCampaignStatus?: string | null;
}

/**
 * Hook: lista os serviços do catálogo com preços vigentes.
 *
 * Cache 5 minutos — config do admin raramente muda + evita refetch a cada
 * navegação. Invalidação explícita quando o founder contrata um serviço.
 */
export function useFounderServices() {
  return useQuery<FounderService[]>({
    queryKey: queryKeys.founder.servicesCatalog,
    queryFn: async () => {
      const res = await fetch("/api/founder/services", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Falha ao carregar serviços (${res.status})`);
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? (data as FounderService[]) : [];
    },
    staleTime: 5 * 60 * 1_000,
    refetchOnWindowFocus: true,
  });
}

/** Helper: filtra só os serviços com CTA habilitado (disponíveis + endpoint). */
export function getActionableServices(
  services: FounderService[],
): FounderService[] {
  return services.filter((s) => s.available && s.endpoint);
}