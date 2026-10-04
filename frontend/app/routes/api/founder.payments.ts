import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/founder/payments
 *
 * Proxy para `GET /payment` do backend (que retorna TODOS os pagamentos do
 * usuário logado — LGPD-safe, filtra por `where.userId = req.user.id`).
 *
 * Este BFF aplica dois filtros de APRESENTAÇÃO para o widget "Cobranças em
 * aberto" do /founder/dashboard:
 *   1. status === "PENDING" — só cobranças em aberto.
 *   2. purpose de startup — exclui cobranças pessoais do founder que NÃO
 *      pertencem a nenhuma startup (assinatura do plano SaaS = SUBSCRIPTION)
 *      nem atos como investidor (INVESTMENT, P2P_BUY). Sem esse filtro, o
 *      card mostrava "Assinatura de plano" como se fosse cobrança da startup.
 *
 * O backend `payment.service.findAll` hoje ignora query params além de
 * userId, então o filtro é feito aqui. Autorização/propriedade continuam
 * garantidas no backend pelo `where.userId`.
 *
 * Não implementa o listener de geração automática da taxa de compliance —
 * isso é o LGPD-FIND-S01-001 (bloqueador crítico) que precisa de termo
 * de aceite, opt-out e notificação prévia antes de ir para produção.
 */

/** Propósitos de Payment que representam cobranças ligadas a uma startup. */
const STARTUP_PAYMENT_PURPOSES = new Set([
  "TOKEN_RESERVATION",
  "TOKEN_RESERVATION_EXTENSION",
  "COMPLIANCE_FEE",
  "VERIFICATION_SEAL",
  "EARLY_ACCESS",
  // S18.6 — checkout consolidado TOKEN_RESERVATION + FAST_TRACK_REVIEW
  // compartilha o mesmo txid PIX; o fundador contrata o Fast Track no wizard
  // `/founder/startups/new` e o backend gera 2 Payments irmãos. Sem essa
  // entrada, o BFF filtrava o Fast Track e o fundador só via a reserva
  // marcada como paga (FAST_TRACK_REVIEW ficava invisível em
  // `/founder/financeiro` e `PendingPaymentsCard` do `/founder/dashboard`).
  "FAST_TRACK_REVIEW",
]);

interface RawPayment {
  status?: string;
  purpose?: string;
  [key: string]: unknown;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");

  // Query params:
  //   - `includeAll=true`  → retorna TODOS os pagamentos (default: só PENDING).
  //   - `limit=N`          → tamanho da página no backend (default 10 PENDING, 50 ALL).
  // O filtro de `purpose` (só cobranças de startup) é aplicado em ambos os modos
  // — exclui SUBSCRIPTION/INVESTMENT/P2P_BUY que não pertencem a uma startup.
  const url = new URL(request.url);
  const includeAll = url.searchParams.get("includeAll") === "true";
  const limitParam = Number(url.searchParams.get("limit")) || (includeAll ? 50 : 10);

  try {
    const query = includeAll
      ? `limit=${limitParam}`
      : `status=PENDING&limit=${limitParam}`;
    const res = await fetch(`${BACKEND_URL}/payment?${query}`, {
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });

    const json = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));

    if (!res.ok) {
      return Response.json(
        {
          error: true,
          message: json?.message ?? `Backend ${res.status}`,
        },
        { status: res.status },
      );
    }

    // Desembrulha envelope ResponseDto ({ error, message, codigo, data }).
    const payload = json?.data !== undefined ? json.data : json;
    const list: RawPayment[] = Array.isArray(payload) ? payload : [];

    // Filtro de apresentação: só cobranças DE STARTUP (independente de status
    // quando includeAll=true). Exclui SUBSCRIPTION/INVESTMENT/P2P_BUY.
    const startupOnly = list.filter(
      (p) =>
        typeof p?.purpose === "string" &&
        STARTUP_PAYMENT_PURPOSES.has(p.purpose) &&
        (includeAll ? true : p?.status === "PENDING"),
    );

    return Response.json(startupOnly);
  } catch {
    return Response.json(
      { error: true, message: "Serviço de pagamentos indisponível." },
      { status: 502 },
    );
  }
}
