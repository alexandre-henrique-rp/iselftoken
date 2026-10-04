import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { CentralCouponsContent } from "~/components/coupons/central-coupons-content";
import { couponsQueryOptions, fetchCouponsServer } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";

const PAGE_SIZE = 20;

export function meta() {
  return [
    { title: "Central de Cupons | iSelfToken" },
    {
      name: "description",
      content: "Gestão administrativa de cupons de desconto.",
    },
  ];
}

export async function loader({ request }: { request: Request }) {
  const filters = {
    status: "all" as const,
    percent: "all" as const,
    search: undefined,
    page: 1,
    limit: PAGE_SIZE,
  };
  const queryClient = createQueryClient();

  try {
    const data = await fetchCouponsServer(request, filters);
    queryClient.setQueryData(couponsQueryOptions(filters).queryKey, data);
  } catch {
    // O componente assume o estado de erro e oferece retry no cliente.
  }

  return { dehydratedState: dehydrate(queryClient) };
}

export default function CentralCouponsPage() {
  const { dehydratedState } = useLoaderData<typeof loader>();

  return (
    <HydrationBoundary state={dehydratedState}>
      <CentralCouponsContent />
    </HydrationBoundary>
  );
}
