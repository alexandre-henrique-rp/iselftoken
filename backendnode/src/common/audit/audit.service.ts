import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Parâmetros para um registro de auditoria.
 *
 * - `userId`: quem executou a ação. **Nullable** desde BUG-FT-001: ações
 *   de sistema (cron, webhooks, jobs) usam `null` porque não há User actor.
 * - `action`: nome da ação em SCREAMING_SNAKE_CASE (ex: `PAYMENT_APPROVE_MANUAL`).
 * - `entity`: nome da entidade alvo (ex: `Payment`, `Subscription`).
 * - `entityId`: ID do registro afetado, sempre como string pra compatibilidade
 *   com UUIDs e IDs numéricos.
 * - `oldValue` / `newValue`: snapshot opcional do antes/depois pra mudanças
 *   de estado. Pra ações sem mutação (read, list), omitir.
 * - `ip`: IP do operador. Quando passado o `request`, extraído automaticamente.
 */
export interface AuditLogInput {
  userId: number | null;
  action: string;
  entity: string;
  entityId: string | number;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ip?: string;
  request?: Request;
}

/**
 * Helper centralizado pra escrever no `AuditLog`. Use em qualquer caminho que
 * altere estado sensível (aprovação manual, cancelamento, mudança de role,
 * KYC decide, etc).
 *
 * Política de erro: a auditoria NÃO deve quebrar o fluxo principal. Se o
 * Prisma falhar, logamos um `warn` e retornamos sem propagar — perder uma
 * entrada é menos crítico do que falhar a operação que estávamos auditando.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    const ip = input.ip ?? this.extractIp(input.request);
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: String(input.entityId),
          oldValue: input.oldValue ?? undefined,
          newValue: input.newValue ?? undefined,
          ip,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar AuditLog (${input.action} ${input.entity}#${input.entityId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extrai IP do request. Usa `req.ip` (Express normaliza com trust proxy).
   * HIGH #3 (3a auditoria): removida leitura direta de `x-forwarded-for`
   * (spoofable sem trust proxy configurado). Espelha o comportamento de
   * `auth.service.ts extractIpUa`. Requer `app.set('trust proxy', ...)` em prod.
   */
  private extractIp(request?: Request): string | undefined {
    if (!request) return undefined;
    const reqAny = request as any;
    return (
      reqAny?.ip ||
      reqAny?.socket?.remoteAddress ||
      reqAny?.connection?.remoteAddress ||
      undefined
    );
  }
}
