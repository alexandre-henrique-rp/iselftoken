import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

export interface UpdateConfigInput {
  key: string;
  value: number;
  effectiveFrom?: string;
  note?: string;
}

/**
 * Hook: useUpdateConfigMutation
 *
 * POST /api/admin/config/parameters { key, value, effectiveFrom, note }
 * Em sucesso: invalida ["admin-config"].
 */
export function useUpdateConfigMutation() {
  const qc = useQueryClient();

  return useMutation<unknown, Error, UpdateConfigInput>({
    mutationFn: async ({ key, value, effectiveFrom, note }) => {
      const res = await fetch("/api/admin/config/parameters", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value,
          effectiveFrom: effectiveFrom ?? new Date().toISOString(),
          note: note || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? "Não foi possível salvar a configuração.",
        );
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminConfig });
      // Invalida tambem as queries do founder para que wizards abertos
      // em outras abas vejam o novo valor quando o foco voltar.
      qc.invalidateQueries({ queryKey: queryKeys.adminConfig });
      qc.invalidateQueries({ queryKey: queryKeys.adminConfig });
      toast.success("Alteração agendada!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    },
  });
}
