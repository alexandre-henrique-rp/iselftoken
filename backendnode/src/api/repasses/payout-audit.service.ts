import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * S1-T10 — Auditoria dedicada de decisões de payout.
 *
 * Padroniza o registro no `AuditLog` das decisões do ciclo de recebimento da
 * captação (PRD_RECEBIMENTO §6-9 / admin-payout-management §9-10):
 *  - PRORROGAR / FINALIZAR_DEFINITIVAMENTE (decisão do Admin/Compliance)
 *  - APPROVE / REJECT de solicitação de parcela (Financeiro)
 *  - MARK_PAID (Financeiro anexa comprovante e marca como pago)
 *
 * LGPD: registra apenas `actorId` (opaco — id interno, nunca CPF/e-mail) e o
 * `actorRole`. Nada de PII em texto livre nos logs de aplicação.
 * O `AuditLog` é append-only (a aplicação nunca deleta linhas). Retenção ≥ 5
 * anos é responsabilidade da política de banco (AGENTS.md §LGPD).
 */
export type PayoutAuditAction =
  | 'PAYOUT_EXTEND' // Prorrogar captação
  | 'PAYOUT_FINALIZE' // Finalizar definitivamente (define parcelas)
  | 'PAYOUT_INSTALLMENT_APPROVE'
  | 'PAYOUT_INSTALLMENT_REJECT'
  | 'PAYOUT_INSTALLMENT_MARK_PAID'
  | 'PAYOUT_INSTALLMENT_DATE_UPDATED';

export interface PayoutAuditActor {
  /** Id interno do ator (opaco). `null` para ações de sistema (cron/job). */
  actorId: number | null;
  /** Papel do ator no momento da decisão (ADMIN | COMPLIANCE | FINANCEIRO). */
  actorRole?: string | null;
}

export interface PayoutAuditParams extends PayoutAuditActor {
  action: PayoutAuditAction;
  /** Entidade afetada: 'Repasse' | 'Installment' | 'Campaign'. */
  entity: string;
  entityId: string | number;
  /** Justificativa/motivo declarado (rejeição, cancelamento, etc.). */
  justification?: string | null;
  /** Dados adicionais relevantes à decisão (sem PII). */
  details?: Record<string, unknown>;
}

@Injectable()
export class PayoutAuditService {
  private readonly logger = new Logger(PayoutAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma decisão de payout no AuditLog. Não lança em caso de falha
   * (auditoria não deve bloquear a operação de negócio) — apenas loga o erro.
   */
  async record(params: PayoutAuditParams): Promise<void> {
    const {
      action,
      entity,
      entityId,
      actorId,
      actorRole,
      justification,
      details,
    } = params;

    const newValue: Record<string, unknown> = {
      actorRole: actorRole ?? null,
      ...(justification ? { justification } : {}),
      ...(details ?? {}),
    };

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action,
          entity,
          entityId: String(entityId),
          newValue: newValue as any,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao registrar audit de payout (${action} ${entity}#${entityId}): ${
          (err as Error).message
        }`,
      );
    }
  }
}
