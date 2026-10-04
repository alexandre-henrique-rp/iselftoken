/**
 * @description Constantes e tipos para os eventos de domínio relacionados a
 * documentos de startup (fase §2 do fluxo).
 *
 * Emitido por `AdminService.reviewStartupDocument` após gravar a rejeição.
 * O listener `StartupNotificationService.onDocumentRejected` cria a
 * notificação in-app + dispara e-mail best-effort para o founder.
 *
 * Convenção de nomes:
 * - startup.document.rejected — disparado quando o admin reprova um
 *   StartupDocument específico. O documento é HARD-DELETED (S3 + DB), e uma
 *   row em `StartupDocumentRejection` registra o motivo (banner no founder).
 */
export const StartupDocumentEvents = {
  REJECTED: 'startup.document.rejected',
} as const;

export type StartupDocumentEventName =
  (typeof StartupDocumentEvents)[keyof typeof StartupDocumentEvents];

/**
 * Payload do evento `startup.document.rejected`.
 *
 * `categoria` é a chave que o frontend usa para casar com o slot de upload
 * correspondente em `/founder/startups/:id/edit/documentos` (renderiza o
 * banner vermelho na categoria certa). `reason` é a justificativa digitada
 * pelo admin (>=20 chars, <=500).
 *
 * LGPD: `documentName` é o nome do arquivo original (sem path interno, sem
 * PII). `rejectedById` é o id do admin (sem FK para preservar auditoria se
 * o admin sair). `rejectedAt` é timestamp da decisão.
 */
export interface StartupDocumentRejectedEvent {
  startupId: number;
  categoria: string;
  documentName: string;
  reason: string;
  rejectedById: number;
  rejectedAt: Date;
}
