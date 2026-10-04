import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

type NormalizedReservationContext = {
  kind: "STARTUP_RESERVATION";
  displayName: string | null;
  nameSource: "PERSISTED_STARTUP" | "DRAFT_PAYLOAD" | "NONE";
  startup: { slug: string | null; displayName: string | null } | null;
  campaign: { title: string | null } | null;
};

function normalizeReservationContext(
  value: unknown,
): NormalizedReservationContext | null {
  if (!value || typeof value !== "object") return null;

  const context = value as Record<string, unknown>;
  const startup =
    context.startup && typeof context.startup === "object"
      ? (context.startup as Record<string, unknown>)
      : null;
  const campaign =
    context.campaign && typeof context.campaign === "object"
      ? (context.campaign as Record<string, unknown>)
      : null;
  const source =
    context.nameSource === "PERSISTED_STARTUP" ||
    context.nameSource === "DRAFT_PAYLOAD"
      ? context.nameSource
      : "NONE";
  const startupValue =
    source === "PERSISTED_STARTUP" && startup
      ? {
          slug:
            typeof startup.slug === "string" && startup.slug.trim()
              ? startup.slug.trim()
              : null,
          displayName:
            typeof startup.displayName === "string" &&
            startup.displayName.trim()
              ? startup.displayName.trim()
              : null,
        }
      : null;
  const draftDisplayName =
    typeof context.displayName === "string" && context.displayName.trim()
      ? context.displayName.trim()
      : null;

  // The source is a discriminant, not a hint. This prevents a malformed
  // response from combining a draft name with persisted startup data. A
  // source without its corresponding identity is malformed as well; do not
  // preserve the source while returning a null identity because consumers
  // could incorrectly treat it as an authoritative commercial name.
  const hasCoherentIdentity =
    source === "PERSISTED_STARTUP"
      ? Boolean(startupValue?.displayName)
      : source === "DRAFT_PAYLOAD"
        ? Boolean(draftDisplayName)
        : false;
  const normalizedSource: NormalizedReservationContext["nameSource"] =
    hasCoherentIdentity ? source : "NONE";
  const displayName =
    normalizedSource === "PERSISTED_STARTUP"
      ? (startupValue?.displayName ?? null)
      : normalizedSource === "DRAFT_PAYLOAD"
        ? draftDisplayName
        : null;

  return {
    kind: "STARTUP_RESERVATION",
    displayName,
    nameSource: normalizedSource,
    startup: normalizedSource === "PERSISTED_STARTUP" ? startupValue : null,
    campaign:
      campaign && typeof campaign.title === "string" && campaign.title.trim()
        ? { title: campaign.title.trim() }
        : null,
  };
}

/**
 * BFF: proxy para `GET /payment/:id` no backend NestJS.
 * Usado pela rota `/checkout/payment/:id` para hidratar dados do Payment
 * e pelo polling de status (PixPayment).
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  const cookieHeader = request.headers.get("cookie");

  if (!id) {
    return Response.json(
      { error: true, message: "ID do pagamento não fornecido" },
      { status: 400 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/payment/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();

  // O backend retorna o plano com campos em PT (`nome`, `descricao`). O
  // checkout consome `plan.name`/`plan.description` — normalizamos aqui
  // preservando `slug` (usado para detectar o plano AFILIADO/isenção de KYC).
  const plan = data?.data?.subscription?.plan;
  if (plan && typeof plan === "object") {
    plan.name = plan.name ?? plan.nome ?? null;
    plan.description = plan.description ?? plan.descricao ?? null;
  }

  const paymentData = data?.data;
  if (paymentData && typeof paymentData === "object") {
    paymentData.reservationContext =
      paymentData.purpose === "TOKEN_RESERVATION"
        ? normalizeReservationContext(paymentData.reservationContext)
        : null;
  }

  return Response.json(data, { status: res.status });
}
