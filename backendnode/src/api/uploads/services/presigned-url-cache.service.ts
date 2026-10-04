/**
 * Servico de cache de URLs presigned.
 *
 * Cacheia URLs presigned no Redis para evitar regeneracao frecuente.
 * TTL do cache: 14 dias. URL valida apenas se expiresAt > now + 60s.
 *
 * @service PresignedUrlCacheService
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { IObjectStorageProvider } from '../../../common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from '../../../common/storage/storage-provider.module';

const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 dias
const MIN_REMAINING_SECONDS = 60; // 60 segundos de margem

/**
 * Entrada de cache de URL presigned.
 *
 * @interface PresignedCacheEntry
 */
interface PresignedCacheEntry {
  /** URL presigned armazenada */
  url: string;
  /** Timestamp de expiracao da URL */
  expiresAt: string;
}

@Injectable()
export class PresignedUrlCacheService {
  private readonly logger = new Logger(PresignedUrlCacheService.name);
  private readonly statsKey = 'presigned:stats';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storageProvider: IObjectStorageProvider,
  ) {}

  /**
   * Obtem URL presigned do cache ou gera nova.
   *
   * Primeiro verifica se existe entrada no cache com expiresAt valido
   * (deve ter pelo menos 60 segundos restantes). Se existir e for valida,
   * retorna do cache. Caso contrario, gera nova URL e armazena no cache.
   *
   * @param bucket - Nome do bucket
   * @param key - Chave do objeto
   * @param expiresIn - Tempo de expiracao em segundos (default: 604800 = 7 dias)
   * @returns URL presigned
   *
   * @example
   * const url = await service.getPresignedUrl('image', 'avatar.jpg', 604800);
   */
  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 604800,
  ): Promise<string> {
    const cacheKey = this.buildCacheKey(bucket, key, expiresIn);

    try {
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const entry: PresignedCacheEntry = JSON.parse(cached);
        const expiresAtDate = new Date(entry.expiresAt);
        const now = new Date();
        const remainingSeconds =
          (expiresAtDate.getTime() - now.getTime()) / 1000;

        // URL valida apenas se tiver pelo menos 60 segundos restantes
        if (remainingSeconds > MIN_REMAINING_SECONDS) {
          await this.incrementStat('hits');
          this.logger.debug(
            `[PresignedUrlCache] HIT: ${bucket}/${key} (${remainingSeconds.toFixed(0)}s restantes)`,
          );
          return entry.url;
        }

        this.logger.debug(
          `[PresignedUrlCache] EXPIRED: ${bucket}/${key} (${remainingSeconds.toFixed(0)}s restantes)`,
        );
      }
    } catch (error) {
      this.logger.warn(`[PresignedUrlCache] Erro ao ler cache: ${error}`);
    }

    // Cache miss ou expirado - gera nova URL
    await this.incrementStat('misses');

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const url = await this.storageProvider.getPresignedUrl(
      bucket,
      key,
      expiresIn,
    );

    const entry: PresignedCacheEntry = { url, expiresAt };

    try {
      await this.redis.setex(
        cacheKey,
        CACHE_TTL_SECONDS,
        JSON.stringify(entry),
      );
      this.logger.debug(
        `[PresignedUrlCache] MISS - URL cacheada: ${bucket}/${key}`,
      );
    } catch (error) {
      this.logger.warn(`[PresignedUrlCache] Erro ao salvar cache: ${error}`);
    }

    return url;
  }

  /**
   * Invalida cache de URL presigned.
   *
   * Remove todas as entradas de cache para o bucket/key especificado.
   *
   * @param bucket - Nome do bucket
   * @param key - Chave do objeto
   * @returns void
   *
   * @example
   * await service.invalidate('image', 'avatar.jpg');
   */
  async invalidate(bucket: string, key: string): Promise<void> {
    try {
      // Busca todas as chaves de cache para este bucket/key
      const pattern = `presigned:${bucket}:${key}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(
          `[PresignedUrlCache] Invalidado: ${bucket}/${key} (${keys.length} entradas)`,
        );
      }
    } catch (error) {
      this.logger.warn(`[PresignedUrlCache] Erro ao invalidar cache: ${error}`);
    }
  }

  /**
   * Retorna hit ratio do cache.
   *
   * @returns Hit ratio entre 0 e 1
   *
   * @example
   * const ratio = await service.getHitRatio();
   * console.log(`Hit ratio: ${(ratio * 100).toFixed(1)}%`);
   */
  async getHitRatio(): Promise<number> {
    try {
      const stats = await this.redis.hgetall(this.statsKey);

      if (!stats || !stats.hits || !stats.misses) {
        return 0;
      }

      const hits = parseInt(stats.hits, 10);
      const misses = parseInt(stats.misses, 10);
      const total = hits + misses;

      if (total === 0) {
        return 0;
      }

      return hits / total;
    } catch (error) {
      this.logger.warn(
        `[PresignedUrlCache] Erro ao calcular hit ratio: ${error}`,
      );
      return 0;
    }
  }

  /**
   * Constroi chave de cache.
   *
   * Formato: presigned:{bucket}:{key}:{expiresIn}
   *
   * @param bucket - Nome do bucket
   * @param key - Chave do objeto
   * @param expiresIn - Tempo de expiracao em segundos
   * @returns Chave de cache
   */
  private buildCacheKey(
    bucket: string,
    key: string,
    expiresIn: number,
  ): string {
    return `presigned:${bucket}:${key}:${expiresIn}`;
  }

  /**
   * Incrementa contador de estatisticas.
   *
   * @param field - Campo a incrementar ('hits' ou 'misses')
   */
  private async incrementStat(field: 'hits' | 'misses'): Promise<void> {
    try {
      await this.redis.hincrby(this.statsKey, field, 1);
    } catch (error) {
      this.logger.warn(
        `[PresignedUrlCache] Erro ao incrementar estatistica: ${error}`,
      );
    }
  }
}
