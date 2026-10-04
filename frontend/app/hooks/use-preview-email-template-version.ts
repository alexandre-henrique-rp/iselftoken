import { useMutation } from "@tanstack/react-query";
import type { RenderedEmail } from "~/types/email-template";

export type PreviewVariables = Record<string, unknown>;

export function usePreviewEmailTemplateVersion(slug: string, versionId: string) {
  return useMutation({
    mutationFn: async (variables: PreviewVariables = {}): Promise<RenderedEmail> => {
      const res = await fetch(
        `/api/admin/email-templates/${slug}/versions/${versionId}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ data: variables }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao gerar preview");
      }
      return json.data as RenderedEmail;
    },
  });
}