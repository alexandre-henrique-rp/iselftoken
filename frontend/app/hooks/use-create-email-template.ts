import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { EmailTemplateSummary } from "~/types/email-template";

export interface CreateEmailTemplatePayload {
  name: string;
  slug: string;
  description?: string;
  subject: string;
  htmlTemplate?: string;
  textTemplate?: string;
  variablesSchema?: Record<string, any>;
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEmailTemplatePayload) => {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao criar template");
      }
      return json.data as EmailTemplateSummary;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.emailTemplates });
      toast.success(`Template "${data?.name ?? 'criado'}" com sucesso!`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao criar template");
    },
  });
}
