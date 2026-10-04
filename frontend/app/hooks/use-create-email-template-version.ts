import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { CreateVersionPayload, EmailTemplateVersion } from "~/types/email-template";

export function useCreateEmailTemplateVersion(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateVersionPayload) => {
      const res = await fetch(`/api/admin/email-templates/${slug}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao criar versão");
      }
      return json.data as EmailTemplateVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEmailTemplates.all });
      qc.invalidateQueries({ queryKey: queryKeys.emailTemplate(slug) });
      toast.success("Versão criada com sucesso");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao criar versão");
    },
  });
}
