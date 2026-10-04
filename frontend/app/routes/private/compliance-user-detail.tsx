import { redirect, useLoaderData, Outlet } from "react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { ComplianceUserDetailHeader } from "~/components/compliance/compliance-user-detail-header";
import { ComplianceUserDetailNav } from "~/components/compliance/compliance-user-detail-nav";
import { ComplianceUserDetailActionBar } from "~/components/compliance/compliance-user-detail-action-bar";
import { BACKEND_URL } from "~/lib/api-config";
import { extractData, normalizeUserDetail, type NormalizedUserDetail } from "~/lib/normalize";

export type UserDetail = NormalizedUserDetail;

export async function loader({ request, params }: LoaderFunctionArgs): Promise<UserDetail> {
  const id = params.id;
  if (!id) {
    throw redirect("/compliance/users");
  }

  const response = await fetch(`${BACKEND_URL}/api/admin/users/${encodeURIComponent(id)}`, {
    headers: { Cookie: request.headers.get("cookie") ?? "" },
  });

  if (response.status === 404) {
    throw redirect("/compliance/users");
  }
  if (!response.ok) {
    throw new Response("Falha ao carregar usuário", { status: response.status });
  }

  const body = await response.json().catch(() => null);
  const normalized = extractData(body, normalizeUserDetail);
  if (!normalized) {
    throw new Response("Resposta inválida do servidor", { status: 502 });
  }
  return normalized;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Detalhes do Usuário | Compliance | iSelfToken" },
    { name: "description", content: "Visualizar e gerenciar perfil completo do usuário." },
  ];
}

export default function ComplianceUserDetailPage() {
  const user = useLoaderData<typeof loader>();

  return (
    <div className="relative pb-32">
      <div
        aria-hidden="true"
        className="fixed bottom-[-5%] right-[-2%] font-black text-primary/5 text-[15rem] pointer-events-none select-none -z-10 rotate-[-5deg] whitespace-nowrap uppercase tracking-tighter"
      >
        iSelfToken
      </div>
      <ComplianceUserDetailHeader
        nome={user.nome}
        email={user.email}
        role={user.role}
        isActive={user.isActive}
      />
      <ComplianceUserDetailNav id={user.id} />
      <div className="relative z-10">
        <Outlet />
      </div>
      <ComplianceUserDetailActionBar user={user} />
    </div>
  );
}