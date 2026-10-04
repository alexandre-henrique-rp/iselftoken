import { AdminUserHeader } from "~/components/admin/admin-user-header";
import { AdminUsersContent } from "~/components/admin/admin-users-content";
import type { Route } from "./+types/admin-users";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Gestão de Usuários | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Painel administrativo para monitoramento e gestão de usuários da plataforma.",
    },
  ];
}

/**
 * Loader mínimo: parseia query params da URL. Listagem é client-side
 * via TanStack Query (`useAdminUsersQuery`).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    filters: {
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || "",
      createdFrom: url.searchParams.get("createdFrom") || "",
    },
  };
}

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-0 pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
      <div className="w-full max-w-7xl xl:max-w-[1400px] mx-auto">
        <AdminUserHeader />

        <AdminUsersContent
          search={loaderData.filters.search}
          status={loaderData.filters.status}
          createdFrom={loaderData.filters.createdFrom}
        />
      </div>
    </div>
  );
}
