import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/api/notifications/notifications.service';
import { NotificationType } from 'src/api/notifications/dto/query-notifications.dto';
import { buildMultilineDescription } from 'src/api/notifications/description.helpers';
import {
  getFinanceiroEmails,
  buildInstallmentContext,
  buildRepasseContext,
} from './repasses-notification.helpers';

/**
 * Serviço de notificações de repasses.
 *
 * Sprint de Notificações — central (2026-10-04): além dos 6 e-mails
 * já existentes, agora também cria **notificações in-app** persistidas
 * (que o frontend recebe via WebSocket) para os mesmos 6 eventos.
 *
 * Regra (CASE.md [Notificações] — central de notificações):
 *  - Toda notificação disparada é acompanhada por e-mail.
 *  - In-app PRIMEIRO (await), e-mail DEPOIS (fire-and-forget).
 */
@Injectable()
export class RepassesNotificationService {
  private readonly logger = new Logger(RepassesNotificationService.name);

  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Cria in-app para o founder da startup. Helper centralizado.
   */
  private async notifyFounder(
    startupId: number,
    title: string,
    description: string,
    type: NotificationType,
  ): Promise<void> {
    try {
      const founder = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: { founderId: true },
      });
      if (!founder?.founderId) return;
      await this.notifications.create(
        founder.founderId,
        title,
        description,
        type,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao criar in-app (founder startup=${startupId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Eventos de Parcela ──────────────────────────────────────────

  /**
   * installament.requested
   * Email ao financeiro sempre que um founder solicita nova parcela.
   */
  @OnEvent('installment.requested')
  async onInstallmentRequested(payload: {
    installmentId: number;
    startupId: number;
  }): Promise<void> {
    this.logger.log(
      `[NOTIF] installment.requested — installment=${payload.installmentId}`,
    );
    try {
      const ctx = await buildInstallmentContext(
        this.prisma,
        payload.installmentId,
      );
      const financeiroEmails = await getFinanceiroEmails(this.prisma);

      // In-app para o founder (sempre).
      await this.notifyFounder(
        payload.startupId,
        'Solicitação de parcela enviada',
        buildMultilineDescription(
          `Sua solicitação de parcela ${ctx.installmentNumber}/${ctx.totalInstallments} para ${ctx.startupName} foi recebida.`,
          'O time financeiro irá analisar e dar um retorno em até 2 dias úteis.',
        ),
        NotificationType.REPASSE_REQUEST,
      );

      if (financeiroEmails.length === 0) {
        this.logger.warn('Nenhum email financeiro encontrado para notificação');
        return;
      }

      const result = await this.email.sendTemplateBySlug(
        financeiroEmails[0],
        'parcela-solicitada',
        ctx as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email parcela-solicitada: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onInstallmentRequested: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * installament.approved
   * Email ao founder confirmando que uma parcela foi liberada.
   */
  @OnEvent('installment.approved')
  async onInstallmentApproved(payload: {
    installmentId: number;
    startupId: number;
  }): Promise<void> {
    this.logger.log(
      `[NOTIF] installment.approved — installment=${payload.installmentId}`,
    );
    try {
      const ctx = await buildInstallmentContext(
        this.prisma,
        payload.installmentId,
      );

      await this.notifyFounder(
        payload.startupId,
        'Parcela aprovada',
        buildMultilineDescription(
          `A parcela ${ctx.installmentNumber}/${ctx.totalInstallments} de ${ctx.startupName} foi aprovada pelo financeiro.`,
          `Valor: ${ctx.valor}.`,
        ),
        NotificationType.REPASSE_APPROVED,
      );

      const result = await this.email.sendTemplateBySlug(
        ctx.founderEmail,
        'parcela-aprovada',
        ctx as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email parcela-aprovada: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onInstallmentApproved: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * installament.completed
   * Email ao founder confirmando que o pagamento da parcela foi confirmado.
   */
  @OnEvent('installment.completed')
  async onInstallmentCompleted(payload: {
    installmentId: number;
    startupId: number;
  }): Promise<void> {
    this.logger.log(
      `[NOTIF] installment.completed — installment=${payload.installmentId}`,
    );
    try {
      const ctx = await buildInstallmentContext(
        this.prisma,
        payload.installmentId,
      );

      await this.notifyFounder(
        payload.startupId,
        'Parcela depositada',
        buildMultilineDescription(
          `O pagamento da parcela ${ctx.installmentNumber}/${ctx.totalInstallments} de ${ctx.startupName} foi confirmado.`,
          `Valor recebido: ${ctx.valor}.`,
        ),
        NotificationType.REPASSE_PAID,
      );

      const result = await this.email.sendTemplateBySlug(
        ctx.founderEmail,
        'parcela-depositada',
        ctx as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email parcela-depositada: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onInstallmentCompleted: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * installament.rejected
   * Email ao founder quando uma parcela é rejeitada, com motivo e link de reenvio.
   */
  @OnEvent('installment.rejected')
  async onInstallmentRejected(payload: {
    installmentId: number;
    startupId: number;
    reason?: string;
  }): Promise<void> {
    this.logger.log(
      `[NOTIF] installment.rejected — installment=${payload.installmentId}`,
    );
    try {
      const ctx = await buildInstallmentContext(
        this.prisma,
        payload.installmentId,
      );
      const ctxWithReason = {
        ...ctx,
        rejectionReason: payload.reason ?? 'Motivo não informado.',
      };

      await this.notifyFounder(
        payload.startupId,
        'Parcela rejeitada',
        buildMultilineDescription(
          `A parcela ${ctx.installmentNumber}/${ctx.totalInstallments} de ${ctx.startupName} foi rejeitada.`,
          `Motivo: ${payload.reason ?? 'Não informado.'}`,
          'Reenvie a solicitação com as correções necessárias.',
        ),
        NotificationType.REPASSE_REJECTED,
      );

      const result = await this.email.sendTemplateBySlug(
        ctx.founderEmail,
        'parcela-rejeitada',
        ctxWithReason as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email parcela-rejeitada: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onInstallmentRejected: ${err.message}`,
        err.stack,
      );
    }
  }

  // ─── Eventos de Repasse ─────────────────────────────────────────

  /**
   * repasse.configured
   * Email ao founder quando um repasse é configurado/aprovado.
   */
  @OnEvent('repasse.configured')
  async onRepasseConfigured(payload: {
    repasseId: number;
    startupId: number;
  }): Promise<void> {
    this.logger.log(
      `[NOTIF] repasse.configured — repasse=${payload.repasseId}`,
    );
    try {
      const ctx = await buildRepasseContext(this.prisma, payload.repasseId);

      await this.notifyFounder(
        payload.startupId,
        'Repasse configurado',
        buildMultilineDescription(
          `O repasse de ${ctx.startupName} foi configurado em ${ctx.numeroParcelas} parcelas.`,
          `Valor da parcela: ${ctx.valorParcela} (intervalo de ${ctx.intervaloDias} dias).`,
        ),
        NotificationType.REPASSE_APPROVED,
      );

      const result = await this.email.sendTemplateBySlug(
        ctx.founderEmail,
        'repasse-configurado',
        ctx as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email repasse-configurado: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onRepasseConfigured: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * repasse.concluded
   * Email ao founder confirmando que todas as parcelas do repasse foram pagas.
   */
  @OnEvent('repasse.concluded')
  async onRepasseConcluded(payload: {
    repasseId: number;
    startupId: number;
  }): Promise<void> {
    this.logger.log(`[NOTIF] repasse.concluded — repasse=${payload.repasseId}`);
    try {
      const ctx = await buildRepasseContext(this.prisma, payload.repasseId);

      await this.notifyFounder(
        payload.startupId,
        'Repasse concluído',
        buildMultilineDescription(
          `Todas as parcelas do repasse de ${ctx.startupName} foram pagas.`,
          `Valor total recebido: ${ctx.valorTotalPago}.`,
        ),
        NotificationType.REPASSE_PAID,
      );

      const result = await this.email.sendTemplateBySlug(
        ctx.founderEmail,
        'repasse-concluido',
        ctx as unknown as Record<string, any>,
      );

      if (!result.success) {
        this.logger.error(
          `Falha ao enviar email repasse-concluido: ${result.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erro em onRepasseConcluded: ${err.message}`,
        err.stack,
      );
    }
  }
}
