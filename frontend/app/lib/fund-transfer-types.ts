/**
 * Tipos e labels do Repasse de Fundos (B12) — frontend.
 *
 * Espelha `RepasseStatus` exposto por `GET /founder/startups/:id/repasse`
 * (`backendnode/src/api/payment/fund-transfer.service.ts`).
 */

/** Status possíveis de uma parcela do repasse. */
export type TransferStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

/** Status da NF-e emitida. */
export type NotaFiscalStatus = "ISSUED" | "CANCELLED" | "REPLACED" | string;

/** Parcela de repasse (1 de 3) retornada pelo backend. */
export interface FundTransferInstallment {
  id: number;
  installmentNumber: number;
  amount: number;
  scheduledDate: string; // ISO 8601
  status: TransferStatus;
  paidAt: string | null;
  txIdBancario: string | null;
}

/** NF-e agregada ao repasse (uma por startup). */
export interface NotaFiscal {
  id: number;
  number: string; // ex.: "NF-2026-000001"
  amount: number;
  issuedAt: string; // ISO 8601
  status: NotaFiscalStatus;
  xmlUrl: string | null;
}

/** Payload completo retornado pelo backend (status do repasse). */
export interface RepasseStatus {
  notafiscal: NotaFiscal | null;
  transfers: FundTransferInstallment[];
  totalRaised: number;
  transferStarted: boolean;
}

/** Labels amigáveis em PT-BR para status de parcela. */
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: "Aguardando",
  PROCESSING: "Processando",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
};

/** Cores de ícone/pílula por status (Tailwind). */
export const TRANSFER_STATUS_STYLES: Record<
  TransferStatus,
  { color: string; bg: string; iconColor: string }
> = {
  PENDING: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  PROCESSING: {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    iconColor: "text-sky-400",
  },
  COMPLETED: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  FAILED: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    iconColor: "text-red-400",
  },
};

/** Status agregado (geral) exibido no card topo. */
export function aggregateStatus(transfers: FundTransferInstallment[]): {
  label: string;
  tone: "neutral" | "info" | "success" | "danger";
} {
  if (transfers.length === 0) {
    return { label: "Não iniciado", tone: "neutral" };
  }
  const hasFailed = transfers.some((t) => t.status === "FAILED");
  if (hasFailed) return { label: "Com falha", tone: "danger" };

  const allCompleted = transfers.every((t) => t.status === "COMPLETED");
  if (allCompleted) return { label: "Concluído", tone: "success" };

  const anyProcessing = transfers.some(
    (t) => t.status === "PROCESSING" || t.status === "COMPLETED",
  );
  if (anyProcessing) return { label: "Em andamento", tone: "info" };

  return { label: "Aguardando", tone: "neutral" };
}