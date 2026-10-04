/**
 * S2-T02 — RecalculateMarketplaceScore Cron
 *
 * Job diario 03:00 BRT que recalcula score de todas as startups APPROVED
 * via ScoreCalculatorService.recalculateAll().
 *
 * Lock distribuido Redis SET NX EX 1800 (30min) para evitar corrida em
 * multi-instancia.
 *
 * Listener de outliers (S2-T02.4) cria AuditLog com action=SCORE_RECALCULATED
 * e envia email DPO quando delta >= 30pts (anti-burla, PRD §10).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ScoreCalculatorService } from './score-calculator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

export const LOCK_KEY = 'lock:recalculate:marketplace-scores';
export const LOCK_TTL_SECONDS = 1800;
export const OUTLIER_THRESHOLD = 30;
export const DPO_EMAIL = process.env.DPO_EMAIL ?? 'dpo@iselftoken.com';

@Injectable()
export class ScoreRecalcCron {
  private readonly logger = new Logger(ScoreRecalcCron.name);

  constructor(
    private readonly scoreCalculator: ScoreCalculatorService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Cron('0 3 * * *', {
    name: 'recalculate-marketplace-scores',
    timeZone: 'America/Sao_Paulo',
  })
  async handleCron(): Promise<void> {
    const lockToken = `${process.pid}-${Date.now()}`;
    const acquired = await this.redis.set(
      LOCK_KEY,
      lockToken,
      'EX',
      LOCK_TTL_SECONDS,
      'NX',
    );

    if (!acquired) {
      this.logger.warn(
        `[SCORE-CRON] lock ja adquirido por outra instancia; skip`,
      );
      return;
    }

    this.logger.log('[SCORE-CRON] lock adquirido; recalculando scores');

    try {
      const result = await this.scoreCalculator.recalculateAll();
      this.logger.log(
        `[SCORE-CRON] done: total=${result.total} outliers=${result.outliers}`,
      );
    } finally {
      await this.redis.del(LOCK_KEY);
      this.logger.log('[SCORE-CRON] lock liberado');
    }
  }

  @OnEvent('marketplace.scoreOutlier')
  async handleOutlier(payload: {
    startupId: number;
    before: number;
    after: number;
    delta: number;
  }): Promise<void> {
    if (payload.delta < OUTLIER_THRESHOLD) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'SCORE_RECALCULATED',
        entity: 'Startup',
        entityId: String(payload.startupId),
        userId: null,
        oldValue: { score: payload.before } as any,
        newValue: {
          score: payload.after,
          delta: payload.delta,
        } as any,
      },
    });

    try {
      await this.emailService.sendEmail({
        to: DPO_EMAIL,
        subject: `[Marketplace] Score outlier detectado (delta ${payload.delta}pts)`,
        html: `<p>Startup <strong>${payload.startupId}</strong> variou de <strong>${payload.before}</strong> para <strong>${payload.after}</strong> (delta ${payload.delta}pts).</p>
<p>Possivel burla ou upload massivo. Verificar AuditLog entity=Startup entityId=${payload.startupId}.</p>`,
      } as any);
    } catch (error: any) {
      this.logger.warn(
        `[SCORE-CRON] falha ao enviar email DPO: ${error?.message ?? error}`,
      );
    }

    this.logger.warn(
      `[SCORE-CRON] outlier startup=${payload.startupId} ${payload.before}->${payload.after} delta=${payload.delta}`,
    );
  }
}
