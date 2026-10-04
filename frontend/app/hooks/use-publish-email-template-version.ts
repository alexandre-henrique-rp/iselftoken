import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { EmailTemplateVersion } from "~/types/email-template";

export function usePublishEmailTemplateVersion(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(
        `/api/admin/email-templates/${slug}/versions/${versionId}/publish`,
        { method: "POST", credentials: "include" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao publicar versão");
      }
      return json.data as EmailTemplateVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEmailTemplates.all });
      qc.invalidateQueries({ queryKey: queryKeys.emailTemplate(slug) });
      toast.success("Versão publicada com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao publicar versão");
    },
  });
}
