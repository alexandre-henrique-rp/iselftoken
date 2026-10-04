/**
 * ScheduledPublishCron — Publicação agendada de startups (delay pós-aprovação).
 *
 * Regra de negócio (CASE.md [Publicação]):
 *  - Ao aprovar a Fase 3 SEM "Publicação Rápida" (FAST_DEPLOY), a campanha
 *    permanece DRAFT com `scheduledPublishAt = aprovação + 24h`.
 *  - Este job varre periodicamente as campanhas DRAFT cujo `scheduledPublishAt`
 *    já venceu e as transiciona para OPEN (publicação no marketplace), do mesmo
 *    jeito que `AdminService.openCampaignOnApproval` faz no caminho imediato.
 *  - As campanhas com FAST_DEPLOY já abrem OPEN na aprovação (não passam aqui).
 *
 * Idempotência:
 *  - Só considera DRAFT com `scheduledPublishAt <= now`. Ao abrir, zera a flag
 *    de agendamento (seta status OPEN) — reentregas não reabrem.
 *  - Lock distribuído Redis (SET NX EX) evita corrida multi-instância.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';

export const SCHEDULED_PUBLISH_LOCK_KEY = 'lock:scheduled-publish:campaigns';
export const SCHEDULED_PUBLISH_LOCK_TTL_SECONDS = 300;
const DEFAULT_DEADLINE_DAYS = 60;

@Injectable()
export class ScheduledPublishCron {
  private readonly logger = new Logger(ScheduledPublishCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'publish-scheduled-campaigns',
    timeZone: 'America/Sao_Paulo',
  })
  async handleCron(): Promise<void> {
    const lockToken = `${process.pid}-${Date.now()}`;
    const acquired = await this.redis.set(
      SCHEDULED_PUBLISH_LOCK_KEY,
      lockToken,
      'EX',
      SCHEDULED_PUBLISH_LOCK_TTL_SECONDS,
      'NX',
    );
    if (!acquired) {
      this.logger.debug('[PUBLISH-CRON] lock já adquirido; skip');
      return;
    }

    try {
      const published = await this.publishDueCampaigns();
      if (published > 0) {
        this.logger.log(`[PUBLISH-CRON] ${published} campanha(s) publicada(s)`);
      }
    } finally {
      await this.redis.del(SCHEDULED_PUBLISH_LOCK_KEY);
    }
  }

  /**
   * Publica (OPEN) todas as campanhas DRAFT cujo `scheduledPublishAt` já venceu.
   * Retorna o número de campanhas publicadas. Exposto para testes.
   */
  async publishDueCampaigns(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.campaign.findMany({
      where: {
        status: 'DRAFT',
        scheduledPublishAt: { not: null, lte: now },
      },
      select: {
        id: true,
        startupId: true,
        deadline: true,
      },
    });

    let count = 0;
    for (const campaign of due) {
      const hasFutureDeadline =
        campaign.deadline != null &&
        new Date(campaign.deadline).getTime() > now.getTime();
      const deadline = hasFutureDeadline
        ? new Date(campaign.deadline as Date)
        : new Date(now.getTime() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);

      try {
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'OPEN',
            dataLancamentoRodada: now,
            deadline,
          },
        });

        await this.audit.log({
          userId: null,
          action: 'CAMPAIGN_PUBLISHED_SCHEDULED',
          entity: 'Campaign',
          entityId: String(campaign.id),
          oldValue: { status: 'DRAFT' },
          newValue: {
            status: 'OPEN',
            dataLancamentoRodada: now.toISOString(),
          },
        });

        // Notifica o founder (in-app + e-mail) de que a startup está no ar.
        // Reusa o mesmo evento da aprovação imediata; o listener trata o texto.
        this.eventEmitter?.emit('startup.approved', {
          startupId: campaign.startupId,
          fastDeploy: false,
          scheduled: false,
          scheduledPublishAt: now.toISOString(),
          publishedNow: true,
        });

        this.logger.log(
          `[PUBLISH-CRON] campanha ${campaign.id} (startup ${campaign.startupId}) publicada (OPEN)`,
        );
        count++;
      } catch (error: any) {
        this.logger.error(
          `[PUBLISH-CRON] falha ao publicar campanha ${campaign.id}: ${
            error?.message ?? error
          }`,
        );
        // Não relança: continua as demais; a próxima execução reprocessa.
      }
    }
    return count;
  }
}
