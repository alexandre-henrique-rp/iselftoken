/**
 * S4-T04 — PinChangeListener
 *
 * Escuta 'marketplace.pinChanged' emitido por PinService e invalida
 * a chave Redis `marketplace:featured:v1` para refresh em ate 5min.
 *
 * Se Redis estiver fora, fallback para TTL natural de 5min no GET /featured
 * (sem quebra de UX).
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

export const MARKETPLACE_FEATURED_CACHE_KEY = 'marketplace:featured:v1';

@Injectable()
export class PinChangeListener {
  private readonly logger = new Logger(PinChangeListener.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  @OnEvent('marketplace.pinChanged')
  async handlePinChanged(payload: {
    startupId: number;
    action: 'PIN' | 'UNPIN';
    actorId: number;
  }): Promise<void> {
    try {
      await this.redis.del(MARKETPLACE_FEATURED_CACHE_KEY);
      this.logger.log(
        `[CACHE] invalidated ${MARKETPLACE_FEATURED_CACHE_KEY} after ${payload.action} startup=${payload.startupId}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[CACHE] falha ao invalidar apos ${payload.action}: ${error?.message ?? error}. TTL de 5min cobre o caso.`,
      );
    }
  }
}
