/**
 * Tipos do modulo de Repasse de Fundos (FIN-09..FIN-11).
 *
 * Espelha os DTOs do backend NestJS (`backendnode/src/api/repasses` e
 * `backendnode/src/api/installment-requests`). Documentacao: CASE.md
 * §[Repasse] e scripts/PRD_FINANCEIRO.md.
 */

/* -------------------------------------------------------------------------- */
/*                                  Enums                                     */
/* -------------------------------------------------------------------------- */

export type AllocationCategory =
  | "marketing"
  | "desenvolvimento"
  | "infraestrutura"
  | "pessoal"
  | "juridico"
  | "operacional"
  | "reservaCaixa";

export const ALLOCATION_CATEGORIES: AllocationCategory[] = [
  "marketing",
  "desenvolvimento",
  "infraestrutura",
  "pessoal",
  "juridico",
  "operacional",
  "reservaCaixa",
];

export const ALLOCATION_CATEGORY_LABELS: Record<AllocationCategory, string> = {
  marketing: "Marketing & Growth",
  desenvolvimento: "Desenvolvimento / Produto",
  infraestrutura: "Infraestrutura",
  pessoal: "Pessoal",
  juridico: "Jurídico & Compliance",
  operacional: "Operacional",
  reservaCaixa: "Reserva de Caixa",
};

export type RepasseStatus =
  | "CONFIGURED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export const REPASSE_STATUS_LABELS: Record<RepasseStatus, string> = {
  CONFIGURED: "Configurado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export type InstallmentStatus =
  | "AWAITING_REQUEST"
  | "REQUESTED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED";

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  AWAITING_REQUEST: "Aguardando solicitação",
  REQUESTED: "Solicitada",
  PROCESSING: "Em processamento",
  COMPLETED: "Concluída",
  REJECTED: "Rejeitada",
};

export type InstallmentRequestStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED";

/* -------------------------------------------------------------------------- */
/*                                Interfaces                                  */
/* -------------------------------------------------------------------------- */

export interface AllocationPercents {
  marketing: number;
  desenvolvimento: number;
  infraestrutura: number;
  pessoal: number;
  juridico: number;
  operacional: number;
  reservaCaixa: number;
}

export type AllocationValues = Record<AllocationCategory, string>;

export interface BankInfoSnapshot {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: "CORRENTE" | "POUPANCA";
}

export interface Repasse {
  id: number;
  campaignId: number;
  numeroParcelas: number;
  valorParcela: string;
  valorUltimaParcela?: string | null;
  intervaloDias: number;
  /**
   * Intervalo (dias) entre a data de configuracao do repasse e a
   * PRIMEIRA parcela. Permite ramp-up (ex.: 7 dias) sem alterar o
   * espacamento entre as demais parcelas (`intervaloDias`).
   *
   * Null em repasses legados criados antes da Sprint S36 — UI deve
   * exibir como "mesmo que intervaloDias".
   */
  primeiraParcelaDias?: number | null;
  valorTotalCaptacao: string;
  status: RepasseStatus;
  complianceApprovedAt: string | null;
  complianceObservacao?: string | null;
  financeiroConfiguredAt: string | null;
  cancelledMotivo?: string | null;
  installments?: Installment[];
}

export interface Installment {
  id: number;
  repasseId: number;
  numero: number;
  valor: string;
  scheduledDate: string | null;
  paidAt: string | null;
  status: InstallmentStatus;
  request?: InstallmentRequest | null;
}

export interface InstallmentRequest {
  id: number;
  installmentId: number;
  founderUserId: number;
  startupId: number;
  allocationPercents: AllocationPercents;
  allocationValues?: AllocationValues | null;
  observacao?: string | null;
  bankInfoSnapshot: BankInfoSnapshot;
  valorSolicitado: string;
  status: InstallmentRequestStatus;
  submittedAt: string;
  tsLimitePagamento: string;
  attemptNumber: number;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  completedAt?: string | null;
  txidC6?: string | null;
  endToEndId?: string | null;
  /**
   * Relatorio do Mes (FIN-11 §8.2) — preenchido pelo fundador no form
   * de solicitacao. Quando a solicitacao e APROVADA, o backend gera
   * automaticamente um TransparencyPost com estes campos incluidos
   * (ver transparency-auto-post.service.ts).
   *
   * LGPD: nenhum dado pessoal/bancario entra aqui (bankInfoSnapshot fica
   * separado, apenas no snapshot interno).
   */
  usoRecurso?: string | null;
  teveLucro?: boolean | null;
  marcoAlcancado?: boolean | null;
  marcoDescricao?: string | null;
  mensagemInvestidores?: string | null;
  publicadoTransparencia?: boolean;
}

export interface RepasseDashboardData {
  repasse: Repasse | null;
  startup: { id: number; nome: string } | null;
  installments: Installment[];
  /**
   * Solicitacao ATIVA da proxima parcela (REQUESTED/APPROVED mais recente).
   * E um InstallmentRequest, NAO um Installment — viene de
   * `prisma.installmentRequest.findFirst`. Para o Installment, use
   * `currentInstallment.installment` (join no servidor) ou
   * `installments.find(i => i.id === currentInstallment.installmentId)`.
   */
  currentInstallment: InstallmentRequest | null;
  kpis: {
    valorTotal: string;
    valorPago: string;
    valorPendente: string;
    proximaParcela: { numero: number; valor: string; scheduledDate: string | null } | null;
    diasRestantesSLA: number | null;
  };
  ultimasSolicitacoes: InstallmentRequest[];
}

/* -------------------------------------------------------------------------- */
/*                                  DTOs                                      */
/* -------------------------------------------------------------------------- */

export interface CreateInstallmentRequestDTO {
  allocationPercents: AllocationPercents;
  observacao?: string;
  // FIN-11 §8.2 — Relatorio do Mes (todos opcionais).
  // Validacao cross-field: marcoDescricao exige marcoAlcancado === true.
  mensagemInvestidores?: string;
  usoRecurso?: string;
  teveLucro?: boolean;
  marcoAlcancado?: boolean;
  marcoDescricao?: string;
}

export type ResubmitInstallmentRequestDTO = CreateInstallmentRequestDTO;

export interface ComplianceDeliberateDTO {
  numeroParcelas: number;
  observacao?: string;
}

export interface FinanceiroConfigureRepasseDTO {
  valorParcela: string;
  valorUltimaParcela?: string;
  intervaloDias: number;
  /**
   * Sprint S36 — intervalo da PRIMEIRA parcela (opcional, default = `intervaloDias`).
   */
  primeiraParcelaDias?: number;
}

export interface ApproveInstallmentDTO {
  valorOverride?: string;
  observacaoFinanceiro?: string;
}

export interface RejectInstallmentDTO {
  motivo: string;
}

export interface MarkInstallmentPaidDTO {
  txidC6: string;
  endToEndId: string;
}
