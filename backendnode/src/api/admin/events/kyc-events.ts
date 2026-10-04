/**
 * @description Constantes e tipos para os eventos de domínio do KYC de usuário.
 *
 * Emitido por `AdminService.decideKycUser` após sincronizar as sessões Redis
 * dos donos do KYCProfile. O `NotificationsGateway` escuta via `@OnEvent` e
 * faz relay WS (`kyc.decided`) para a sala `user:{userId}`, permitindo que o
 * frontend reflita a decisão de compliance em tempo real (sem reload).
 *
 * Convenção de nomes:
 * - kyc.user.decided — disparado quando o admin decide o KYC de um usuário
 *   (APPROVED, REJECTED, NEEDS_RESUBMISSION ou PENDING após REVOKE).
 */
export const KycEvents = {
  USER_DECIDED: 'kyc.user.decided',
} as const;

export type KycEventName = (typeof KycEvents)[keyof typeof KycEvents];

/**
 * Payload do evento `kyc.user.decided`.
 *
 * LGPD: carrega apenas `userId` (destinatário da sala WS), a `decision`
 * tomada pelo admin e o `kycStatus` resultante. NUNCA inclui PII do usuário
 * (CPF, email, nome, documento). O frontend só precisa saber "o KYC mudou,
 * revalide o perfil".
 */
export interface KycUserDecidedEvent {
  userId: number;
  decision: string;
  kycStatus: string;
}
