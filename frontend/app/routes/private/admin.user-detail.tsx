import { redirect, useLoaderData } from "react-router";
import { AdminUserDetailScreen } from "~/components/admin/admin-user-detail-screen";
import {
  extractData,
  normalizeUserDetail,
  type NormalizedUserDetail,
} from "~/lib/normalize";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/admin.user-detail";

export type AdminUserDetail = NormalizedUserDetail;

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Detalhes do Usuário | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Visão geral completa do perfil do usuário para administradores.",
    },
  ];
}

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id?: string };
}): Promise<AdminUserDetail> {
  const id = params.id;
  if (!id) throw redirect("/admin/users");

  const response = await serverFetch(
    request,
    `/api/admin/users/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) throw redirect("/admin/users");
  if (!response.ok) {
    throw new Response("Falha ao carregar usuário", {
      status: response.status,
    });
  }

  const body = await response.json().catch(() => null);
  const normalized = extractData(body, normalizeUserDetail);
  if (!normalized)
    throw new Response("Resposta inválida do servidor", { status: 502 });
  return normalized;
}

export default function AdminUserDetailPage({
  user: userProp,
}: { user?: AdminUserDetail } = {}) {
  const loaderData = useLoaderData() as AdminUserDetail | undefined;
  const user = userProp ?? loaderData;
  if (!user) return null;
  return <AdminUserDetailScreen user={user} />;
}
