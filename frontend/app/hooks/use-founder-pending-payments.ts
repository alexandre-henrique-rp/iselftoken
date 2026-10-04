import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Tipo de uma cobrança do founder (Payment).
 *
 * Espelha o `select` que o backend faz em `payment.service.findAll`:
 *   id, amount, method, purpose, status, userId, createdAt,
 *   couponUsages: [{ originalAmount, discountApplied, finalAmount, coupon:{code, percent} }]
 *
 * `amount` vem como string do Prisma (Decimal serializado) — converta no
 * consumidor se precisar de math (Number(amount) é seguro em valores < 1e15).
 *
 * `couponUsages` é um array porque 1 Payment pode ter múltiplos cupons
 * (edge case). Para apresentação na UI usamos o cupom com MAIOR desconto.
 */
export interface FounderPaymentCoupon {
  originalAmount: string | number;
  discountApplied: string | number;
  finalAmount: string | number;
  coupon: { code: string; percent: number };
}

export interface FounderPaymentCampaign {
  id: number;
  startupId: number;
  title: string;
  status: string;
}

export interface FounderPayment {
  id: number | string;
  amount: string | number;
  method: string;
  purpose: string;
  status: string;
  userId: number;
  createdAt: string;
  campaignId?: number | null;
  campaign?: FounderPaymentCampaign | null;
  couponUsages?: FounderPaymentCoupon[];
}

/**
 * Resolve o startupId do Payment via 3 caminhos (em ordem de confiabilidade):
 *   1. `campaign.startupId` (JOIN direto no payload — o backend agora inclui)
 *   2. `campaignId` apenas (sem JOIN — fallback se o backend omitir a relacao)
 *   3. `undefined` (pagamentos sem vinculo direto a uma campanha/startup —
 *      ex: INVESTMENT ou SUBSCRIPTION — que ja sao filtrados pelo BFF)
 *
 * Para o /founder/financeiro, sempre caimos no caminho 1.
 */
export function getStartupIdFromPayment(payment: FounderPayment): number | null {
  return payment.campaign?.startupId ?? payment.campaignId ?? null;
}

/**
 * Helper: extrai o cupom de MAIOR desconto aplicado ao Payment (se houver).
 * Retorna `null` se não houver cupom ou se o desconto for zero.
 */
export function getBestCoupon(
  payment: FounderPayment,
): FounderPaymentCoupon | null {
  if (!payment.couponUsages || payment.couponUsages.length === 0) return null;
  const sorted = [...payment.couponUsages].sort((a, b) => {
    const da = Number(a.discountApplied) || 0;
    const db = Number(b.discountApplied) || 0;
    return db - da;
  });
  const best = sorted[0];
  return Number(best.discountApplied) > 0 ? best : null;
}

/**
 * Hook: lista cobranças PENDING do founder logado.
 *
 * Endpoint: GET /api/founder/payments (BFF proxia para BACKEND_URL/payment
 * com status=PENDING&limit=10; o backend já filtra por userId — LGPD-safe).
 *
 * Cache 30s. Refetch a cada 60s para mostrar novas cobranças (ex: geradas
 * pelo compliance-fee listener — S01 LGPD-FIND-001 — quando implementado).
 *
 * @returns query com FounderPayment[] (vazio enquanto carrega)
 */
export function useFounderPendingPayments() {
  return useQuery<FounderPayment[]>({
    queryKey: queryKeys.founder.paymentsPending,
    queryFn: async () => {
      const res = await fetch("/api/founder/payments", {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        const message = (data as { message?: string })?.message ?? "Erro";
        throw new Error(message);
      }
      // BFF desembrulha o envelope; pode ser [] ou { data: [...] }
      if (Array.isArray(data)) return data as FounderPayment[];
      if (Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: FounderPayment[] }).data;
      }
      return [];
    },
    staleTime: 30 * 1_000,
    refetchInterval: 60 * 1_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mapeia `purpose` do backend → label amigável PT-BR + descrição curta
 * para o widget de cobranças. Mantém cobertura dos propósitos que founders
 * podem ter hoje (TOKEN_RESERVATION) e do que virá quando o listener de
 * COMPLIANCE_FEE for implementado.
 */
export const PAYMENT_PURPOSE_LABELS: Record<
  string,
  { title: string; description: string }
> = {
  TOKEN_RESERVATION: {
    title: "Taxa de reserva de tokens",
    description:
      "Cobrança para emitir e processar os tokens da sua captação na plataforma.",
  },
  FAST_TRACK_REVIEW: {
    title: "Avaliação Rápida (Fast Track)",
    description:
      "Análise prioritária da rodada pela equipe de compliance (adicional do checkout consolidado da reserva).",
  },
  COMPLIANCE_FEE: {
    title: "Taxa de Compliance",
    description:
      "Taxa referente à análise de conformidade da sua startup e da rodada de captação. O pagamento é necessário para iniciar o processo de análise.",
  },
  VERIFICATION_SEAL: {
    title: "Selo de Startup Verificada",
    description: "Pagamento do selo de verificação do compliance.",
  },
  EARLY_ACCESS: {
    title: "Acesso antecipado",
    description: "Compra de acesso antecipado a uma rodada.",
  },
  INVESTMENT: {
    title: "Investimento",
    description: "Compra de tokens como investidor.",
  },
  SUBSCRIPTION: {
    title: "Assinatura de plano",
    description: "Pagamento do plano SaaS do founder.",
  },
  P2P_BUY: {
    title: "Compra P2P",
    description: "Compra de tokens no mercado secundário.",
  },
  TOKEN_RESERVATION_EXTENSION: {
    title: "Prorrogação da reserva",
    description: "Cobrança adicional para prorrogar a captação.",
  },
};

export function getPaymentPurposeLabel(purpose: string) {
  return (
    PAYMENT_PURPOSE_LABELS[purpose] ?? {
      title: purpose,
      description: "Cobrança da plataforma.",
    }
  );
}
