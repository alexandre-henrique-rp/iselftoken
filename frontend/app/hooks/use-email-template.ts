import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { EmailTemplateDetail } from "~/types/email-template";

export const emailTemplateQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.emailTemplate(slug),
    queryFn: async (): Promise<EmailTemplateDetail> => {
      const res = await fetch(`/api/admin/email-templates/${slug}`);
      if (!res.ok) throw new Error("Falha ao carregar template");
      const body = await res.json();
      return body.data as EmailTemplateDetail;
    },
    staleTime: 60_000,
  });

export function useEmailTemplate(slug: string) {
  return useQuery(emailTemplateQueryOptions(slug));
}
