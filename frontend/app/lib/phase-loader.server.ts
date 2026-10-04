import { dehydrate } from "@tanstack/react-query";
import { redirect } from "react-router";
import { createQueryClient } from "~/lib/query-client";
import { adminStartupPaymentStatusQueryOptions } from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";
import type { PhaseStartup } from "~/components/admin/phase/phase-screen";

/**
 * Loader SSR compartilhado das páginas de Fase 1/2/3 (S3).
 *
 * Busca o detalhe da startup e o status de pagamento por fase no servidor,
 * hidratando o cache do TanStack Query (zero waterfall no cliente — skill
 * frontend-architecture §3).
 */
export async function loadPhaseData(request: Request, id: string | undefined) {
  if (!id) throw redirect("/admin/startups");

  const queryClient = createQueryClient();

  const [detailRes, paymentRes] = await Promise.all([
    serverFetch(request, `/api/admin/startups/${encodeURIComponent(id)}`),
    serverFetch(
      request,
      `/api/admin/startups/${encodeURIComponent(id)}/payment-status`,
    ),
  ]);

  if (detailRes.status === 404) throw redirect("/admin/startups");
  if (!detailRes.ok) {
    throw new Response("Falha ao carregar startup", {
      status: detailRes.status,
    });
  }

  const detailBody = await detailRes.json().catch(() => null);
  const startup = (detailBody?.data ?? detailBody) as PhaseStartup | null;
  if (!startup) {
    throw new Response("Resposta inválida do servidor", { status: 502 });
  }

  // Hidrata o payment-status no cache para o PhaseScreen ler sem refetch.
  if (paymentRes.ok) {
    const payBody = await paymentRes.json().catch(() => null);
    const payData = payBody?.data ?? payBody;
    if (payData) {
      queryClient.setQueryData(
        adminStartupPaymentStatusQueryOptions(startup.id).queryKey,
        payData,
      );
    }
  }

  return { startup, dehydratedState: dehydrate(queryClient) };
}
