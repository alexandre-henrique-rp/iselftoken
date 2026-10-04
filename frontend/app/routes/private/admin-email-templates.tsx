import { useLoaderData } from "react-router";
import { serverFetch } from "~/lib/server-fetch";
import { EmailTemplatesList } from "~/components/admin/email-templates/email-templates-list";

export function meta() {
  return [{ title: "Templates de Email | iSelfToken Admin" }];
}

export async function loader({ request }: { request: Request }) {
  const res = await serverFetch(request, "/api/admin/email-templates");
  if (!res.ok) {
    return { data: [] };
  }
  const body = await res.json().catch(() => null);
  return { data: body?.data ?? [] };
}

export default function AdminEmailTemplatesPage() {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <EmailTemplatesList initialData={data ?? []} />
    </div>
  );
}
