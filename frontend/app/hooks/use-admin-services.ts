import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Tipo do servico no catalogo (mesmo shape em ambos os endpoints — founder e
 * admin). Campos JSON (benefits, requiresCampaignStatus) vem serializados
 * como string do Prisma.
 */
export interface AdminService {
  id: number;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  benefits: string | null;
  category: string;
  paymentPurpose: string;
  /** Decimal serializado como string — converter com Number() se precisar. */
  price: string | number | null;
  currency: string;
  highlight: boolean;
  available: boolean;
  order: number;
  requiresCampaignStatus: string | null;
  endpoint: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  slug: string;
  name: string;
  description: string;
  shortDesc?: string;
  benefits?: string[];
  category: string;
  paymentPurpose: string;
  price?: number;
  currency?: string;
  highlight?: boolean;
  available?: boolean;
  order?: number;
  requiresCampaignStatus?: string[];
  endpoint?: string;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

/** Hook: lista todos os serviços (incluindo desabilitados). */
export function useAdminServices() {
  return useQuery<AdminService[]>({
    queryKey: queryKeys.admin.services,
    queryFn: async () => {
      const res = await fetch("/api/admin/services", { credentials: "include" });
      if (!res.ok) throw new Error(`Falha ao listar serviços (${res.status})`);
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? (data as AdminService[]) : [];
    },
    staleTime: 30_000,
  });
}

/** Hook: cria um novo serviço. */
export function useCreateService() {
  const qc = useQueryClient();
  return useMutation<AdminService, Error, CreateServiceInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? `Falha ao criar (${res.status})`);
      }
      const created = json?.data ?? json;
      return created as AdminService;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.services }),
  });
}

/** Hook: atualiza serviço existente. */
export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation<AdminService, Error, { id: number; input: UpdateServiceInput }>({
    mutationFn: async ({ id, input }) => {
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? `Falha ao atualizar (${res.status})`);
      }
      const updated = json?.data ?? json;
      return updated as AdminService;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.services }),
  });
}

/** Hook: deleta serviço. */
export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? `Falha ao deletar (${res.status})`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.services }),
  });
}