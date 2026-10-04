/**
 * Hook: useUpdateIdentityMutation
 *
 * Persiste dados de identidade (nome, telefone, doc) via PATCH /api/users/me.
 * Atualiza o cache `[me]` OTIMISTAMENTE com os novos valores para feedback
 * instantâneo no checkout/profile. Faz rollback em erro.
 *
 * STATE-02D — extraido de `profile-identity-card.tsx`.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "~/lib/queries";
import type { UserData } from "~/types/auth";

export interface IdentityInput {
  nome: string;
  telefone: string;
  data_nascimento: string;
  genero: UserData["genero"] | "";
  tipo_documento: UserData["tipo_documento"] | "";
  reg_documento: string;
}

export function useUpdateIdentityMutation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, IdentityInput, { prev: UserData | null }>({
    mutationFn: async (payload) => {
      const body: Record<string, unknown> = {
        nome: payload.nome.trim(),
        telefone: payload.telefone.trim(),
        genero: payload.genero || undefined,
        tipo_documento: payload.tipo_documento || undefined,
        reg_documento: payload.reg_documento.trim(),
      };
      if (payload.data_nascimento) body.data_nascimento = payload.data_nascimento;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Erro ao salvar identidade");
      }
      return data;
    },
    // Otimista: aplica no cache ANTES do PATCH voltar. Checkout/profile
    // veem o campo novo imediatamente (sem refetch visível).
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: meQueryOptions.queryKey });
      const prev = qc.getQueryData<UserData>(meQueryOptions.queryKey) ?? null;
      if (prev) {
        const docType = payload.tipo_documento
          ? (payload.tipo_documento as UserData["tipo_documento"])
          : (prev.tipo_documento as UserData["tipo_documento"]);
        const next: UserData = {
          ...prev,
          nome: payload.nome.trim() || prev.nome,
          telefone: payload.telefone.trim(),
          data_nascimento: payload.data_nascimento || prev.data_nascimento,
          genero: (payload.genero || prev.genero) as UserData["genero"],
          tipo_documento: docType,
          reg_documento: payload.reg_documento.trim() || prev.reg_documento,
        };
        qc.setQueryData<UserData>(meQueryOptions.queryKey, next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<UserData>(meQueryOptions.queryKey, (current) => {
          if (!current || !ctx.prev) return ctx.prev ?? current ?? undefined;
          return {
            ...current,
            nome: ctx.prev.nome,
            telefone: ctx.prev.telefone,
            data_nascimento: ctx.prev.data_nascimento,
            genero: ctx.prev.genero,
            tipo_documento: ctx.prev.tipo_documento,
            reg_documento: ctx.prev.reg_documento,
          };
        });
      }
    },
    onSettled: () => {
      // Revalida contra o backend (fonte da verdade) sem manter snapshot
      // otimista — reconcilia divergências silenciosas.
      qc.invalidateQueries({ queryKey: meQueryOptions.queryKey }).catch(() => {});
    },
  });
}