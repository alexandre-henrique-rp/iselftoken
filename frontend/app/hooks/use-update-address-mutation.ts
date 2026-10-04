/**
 * Hook: useUpdateAddressMutation
 *
 * Persiste dados de endereço do usuário via PATCH /api/users/me.
 * Atualiza o cache `[me]` OTIMISTAMENTE — checkout/profile veem o
 * endereço novo imediatamente. Rollback em erro.
 *
 * STATE-02D — extraido de `profile-address-card.tsx`.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "~/lib/queries";
import type { Pais, UserData } from "~/types/auth";

export interface AddressInput {
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  pais: Pais | null;
}

export function useUpdateAddressMutation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, AddressInput, { prev: UserData | null }>({
    mutationFn: async (payload) => {
      const body: Record<string, unknown> = {
        endereco: payload.endereco.trim() || undefined,
        numero: payload.numero.trim() || undefined,
        complemento: payload.complemento.trim() || undefined,
        bairro: payload.bairro.trim() || undefined,
        cep: payload.cep.replace(/\D/g, "") || undefined,
        cidade: payload.cidade.trim() || undefined,
        uf: payload.uf.trim() || undefined,
        pais: payload.pais === null ? null : (payload.pais?.id ?? undefined),
      };
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { message?: string })?.message || "Erro ao salvar endereço",
        );
      }
      return data;
    },
    // Otimista: aplica endereço novo no cache antes do PATCH voltar.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: meQueryOptions.queryKey });
      const prev = qc.getQueryData<UserData>(meQueryOptions.queryKey) ?? null;
      if (prev) {
        const next: UserData = {
          ...prev,
          endereco: payload.endereco.trim() || prev.endereco,
          numero: payload.numero.trim() || prev.numero,
          complemento: payload.complemento.trim() || prev.complemento,
          bairro: payload.bairro.trim() || prev.bairro,
          cep: payload.cep.replace(/\D/g, "") || prev.cep,
          cidade: payload.cidade.trim() || prev.cidade,
          uf: payload.uf.trim() || prev.uf,
          pais: payload.pais ?? prev.pais,
          bandeira: payload.pais?.emoji ?? prev.bandeira,
        };
        qc.setQueryData<UserData>(meQueryOptions.queryKey, next);
      }
      return { prev };
    },
    onSuccess: (response) => {
      // Após PATCH OK, o backend retorna o usuário atualizado do Prisma
      // (select inclui todos os campos de endereço). Mescla no cache como
      // source of truth para garantir que o preview reflita o save mesmo
      // se a sessão Redis ainda não foi refrescada pelo refreshUserProfile.
      const data = (response as { data?: Partial<UserData> })?.data;
      if (data && Object.keys(data).length > 0) {
        qc.setQueryData<UserData>(meQueryOptions.queryKey, (prev) =>
          prev ? { ...prev, ...data } : (data as UserData),
        );
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<UserData>(meQueryOptions.queryKey, (current) => {
          if (!current || !ctx.prev) return ctx.prev ?? current ?? undefined;
          return {
            ...current,
            endereco: ctx.prev.endereco,
            numero: ctx.prev.numero,
            complemento: ctx.prev.complemento,
            bairro: ctx.prev.bairro,
            cep: ctx.prev.cep,
            cidade: ctx.prev.cidade,
            uf: ctx.prev.uf,
            pais: ctx.prev.pais,
            bandeira: ctx.prev.bandeira,
          };
        });
      }
    },
    onSettled: () => {
      // Revalida contra o backend — fonte da verdade — em paralelo.
      qc.invalidateQueries({ queryKey: meQueryOptions.queryKey }).catch(() => {});
    },
  });
}
