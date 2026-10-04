import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { UpdateVersionPayload, EmailTemplateVersion } from "~/types/email-template";

export function useUpdateEmailTemplateVersion(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      versionId,
      ...payload
    }: UpdateVersionPayload & { versionId: string }) => {
      const res = await fetch(`/api/admin/email-templates/${slug}/versions/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao atualizar versão");
      }
      return json.data as EmailTemplateVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEmailTemplates.all });
      qc.invalidateQueries({ queryKey: queryKeys.adminEmailTemplates.detail(slug) });
      toast.success("Versão atualizada com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao atualizar versão");
    },
  });
}
