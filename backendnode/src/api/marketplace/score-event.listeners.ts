/**
 * S2-T03 — ScoreEventListeners
 *
 * Listeners granulares que recalculam score de uma startup em eventos
 * de dominio. Debounce 30s por startupId via Redis SET NX EX 30.
 *
 * Eventos monitorados:
 *   - startup.documentUploaded       (novo doc submetido)
 *   - startup.kycStatusChanged      (KYC aprovado/rejeitado)
 *   - startup.sealAssigned          (selo atribuido)
 *   - startup.campaignStatusChanged (captacao aberta/fechada)
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ScoreCalculatorService } from './score-calculator.service';

export const DEBOUNCE_TTL_SECONDS = 30;

function debounceKey(startupId: number): string {
  return `lock:recalc:startup:${startupId}`;
}

type ChangePayload = { startupId: number; [key: string]: unknown };

@Injectable()
export class ScoreEventListeners {
  private readonly logger = new Logger(ScoreEventListeners.name);

  constructor(
    private readonly scoreCalculator: ScoreCalculatorService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @OnEvent('startup.documentUploaded')
  onDocumentUploaded(payload: ChangePayload) {
    return this.onStartupChange(payload);
  }

  @OnEvent('startup.kycStatusChanged')
  onKycStatusChanged(payload: ChangePayload) {
    return this.onStartupChange(payload);
  }

  @OnEvent('startup.sealAssigned')
  onSealAssigned(payload: ChangePayload) {
    return this.onStartupChange(payload);
  }

  @OnEvent('startup.campaignStatusChanged')
  onCampaignStatusChanged(payload: ChangePayload) {
    return this.onStartupChange(payload);
  }

  async onStartupChange(payload: ChangePayload): Promise<void> {
    const { startupId } = payload;
    const token = `${process.pid}-${Date.now()}`;

    const acquired = await this.redis.set(
      debounceKey(startupId),
      token,
      'EX',
      DEBOUNCE_TTL_SECONDS,
      'NX',
    );

    if (!acquired) {
      this.logger.debug(
        `[SCORE-DEBOUNCE] startup=${startupId} lock ja ativo; skip`,
      );
      return;
    }

    try {
      await this.scoreCalculator.calculateForStartup(startupId);
    } finally {
      await this.redis.del(debounceKey(startupId));
    }
  }
}
