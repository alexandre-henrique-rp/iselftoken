import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { FinanceiroSplitScreen } from "~/components/admin/financeiro/financeiro-split-screen";

/**
 * Rota: /admin/financeiro/split
 *
 * Auditoria admin do split financeiro (repasse × lucro plataforma) por
 * campanha. Apenas leitura. Guards via AuthGuard + AdminGuard no backend
 * (BFF passa cookie; backend rejeita 403 se não-ADMIN).
 */
export function meta() {
  return [
    { title: "Split Repasse × Lucro · Admin · iSelfToken" },
    {
      name: "description",
      content:
        "Auditoria do split financeiro das campanhas — repasse às startups, spread e taxa da plataforma.",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const filters = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : 1,
    pageSize: url.searchParams.get("pageSize")
      ? Number(url.searchParams.get("pageSize"))
      : 20,
  };
  return { filters };
}

export default function AdminFinanceiroSplitRoute() {
  const { filters } = useLoaderData<typeof loader>();
  return <FinanceiroSplitScreen filters={filters} />;
}
