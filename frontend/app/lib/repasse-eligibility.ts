import { formatDateOnlyBR } from "~/lib/date-utils";
import type { Installment, InstallmentStatus } from "~/types/repasse";

/**
 * Sprint S34-g — helper de elegibilidade de solicitacao de parcela.
 *
 * Determina SE o founder pode solicitar uma parcela HOJE, e QUAL o
 * motivo de bloqueio (se aplicavel). Usado pelo RepasseStepper (para
 * desabilitar clique e mostrar badge) e pelo InstallmentDetail (para
 * exibir card explicativo).
 *
 * Regras (espelho do backend `installment-requests.service.ts`):
 *  - AWAITING_REQUEST + parcela N-1 COMPLETED + janela aberta:
 *    `ready` (pode solicitar).
 *  - AWAITING_REQUEST + parcela N-1 nao COMPLETED:
 *    `awaiting-prev` (aguarde #N-1 ser paga).
 *  - AWAITING_REQUEST + janela fechada (now < scheduledDate - 10d):
 *    `awaiting-window` (mostra countdown ate abrir a janela).
 *  - REQUESTED / APPROVED / PROCESSING:
 *    `awaiting-financeiro` (ja tem solicitacao ativa, aguardar).
 *  - COMPLETED:
 *    `completed` (mostrar recibo / valor recebido).
 *  - REJECTED:
 *    `rejected` (exibir form de resubmissao).
 */

const REPASSE_JANELA_ANTECEDENCIA_DIAS = 10;

export type InstallmentEligibility =
  | { kind: "ready"; label: string }
  | { kind: "awaiting-prev"; label: string; prevNumero: number }
  | { kind: "awaiting-window"; label: string; daysRemaining: number; earliestDate: Date }
  | { kind: "awaiting-financeiro"; label: string }
  | { kind: "completed"; label: string }
  | { kind: "rejected"; label: string }
  | { kind: "no-date"; label: string };

interface CheckArgs {
  installment: Installment;
  /** Todas as parcelas do Repasse (ja ordenado por numero). */
  allInstallments: Installment[];
  /** Default: now (injetado para testes deterministicos). */
  now?: Date;
}

/**
 * Retorna a elegibilidade de uma parcela para solicitacao.
 *
 * Idempotente e puro (sem side-effects) — adequado para uso em componentes
 * React com memoization ou em testes unitarios.
 */
export function getInstallmentEligibility({
  installment,
  allInstallments,
  now = new Date(),
}: CheckArgs): InstallmentEligibility {
  const status: InstallmentStatus = installment.status;

  if (status === "COMPLETED") {
    return { kind: "completed", label: "Parcela paga" };
  }

  if (status === "REQUESTED" || status === "PROCESSING") {
    return {
      kind: "awaiting-financeiro",
      label: "Solicitacao em analise pelo financeiro",
    };
  }

  if (status === "REJECTED") {
    return { kind: "rejected", label: "Solicitacao rejeitada — pode reenviar" };
  }

  // AWAITING_REQUEST a partir daqui
  if (!installment.scheduledDate) {
    return { kind: "no-date", label: "Sem data prevista" };
  }

  // Regra sequencial: parcela N-1 deve estar COMPLETED antes de N
  if (installment.numero > 1) {
    const prev = allInstallments.find((i) => i.numero === installment.numero - 1);
    if (!prev || prev.status !== "COMPLETED") {
      return {
        kind: "awaiting-prev",
        label: `Aguarde a parcela #${installment.numero - 1} ser paga`,
        prevNumero: installment.numero - 1,
      };
    }
  }

  // Janela de antecedencia: so pode solicitar (scheduledDate - 10 dias)
  const earliest = new Date(installment.scheduledDate);
  earliest.setUTCDate(
    earliest.getUTCDate() - REPASSE_JANELA_ANTECEDENCIA_DIAS,
  );
  if (now < earliest) {
    const daysRemaining = Math.ceil(
      (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      kind: "awaiting-window",
      label: `Disponivel para solicitacao em ${formatDateOnlyBR(earliest.toISOString())}`,
      daysRemaining,
      earliestDate: earliest,
    };
  }

  return {
    kind: "ready",
    label: `Previsao de pagamento: ${formatDateOnlyBR(installment.scheduledDate)}`,
  };
}

/**
 * Apenas parcelas com `kind === 'ready'` devem abrir o form de
 * solicitacao. Use esta constante para desabilitar botoes e cliques.
 */
export const CAN_REQUEST_KINDS: ReadonlyArray<InstallmentEligibility["kind"]> = [
  "ready",
];

/**
 * Apenas `ready` (e opcionalmente `rejected` para resubmit) habilitam
 * clique no stepper para abrir o detalhe com form. Parcelas em outros
 * estados sao apenas para visualizacao.
 */
export const CAN_OPEN_DETAIL_KINDS: ReadonlyArray<InstallmentEligibility["kind"]> = [
  "ready",
  "rejected",
  "completed",
  "awaiting-financeiro",
  "awaiting-prev",
  "awaiting-window",
  "no-date",
];

/**
 * Helper de classe CSS para badges de status no stepper (visual lock).
 */
export function eligibilityBadgeClass(
  kind: InstallmentEligibility["kind"],
): string {
  switch (kind) {
    case "ready":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    case "awaiting-prev":
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    case "awaiting-window":
      return "bg-sky-500/10 text-sky-300 border-sky-500/30";
    case "awaiting-financeiro":
      return "bg-sky-500/10 text-sky-300 border-sky-500/30";
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    case "rejected":
      return "bg-red-500/10 text-red-300 border-red-500/30";
    case "no-date":
      return "bg-accent text-muted-foreground border-border/40";
  }
}