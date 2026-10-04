/**
 * Jobs de cleanup para uploads.
 *
 * Executa cleanup periodico de:
 * 1. Uploads abandonados (PENDING > 1h) - a cada 6h
 * 2. Uploads orfaos (sem userId/startupId > 30 dias) - diariamente as 3h
 *
 * Usa lock distribuido via Redis para evitar execucao concorrente
 * entre multiplas instancias.
 *
 * @module CleanupJob
 * @see T36
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { IObjectStorageProvider } from '../../../common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from '../../../common/storage/storage-provider.module';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Interface simplificada para lock distribuido.
 * Em dev, usa Map em memoria; em prod, usar Redis.
 */
interface ILockService {
  acquire(lockKey: string, ttlSeconds: number): Promise<boolean>;
  release(lockKey: string): Promise<void>;
}

/**
 * Implementacao em memoria para development.
 * Em producao, substituir por RedisLockService.
 */
@Injectable()
class InMemoryLockService implements ILockService {
  private locks = new Map<string, { value: string; expiresAt: number }>();

  async acquire(lockKey: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      return false; // Lock ocupado
    }

    this.locks.set(lockKey, {
      value: crypto.randomUUID(),
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  async release(lockKey: string): Promise<void> {
    this.locks.delete(lockKey);
  }
}

/**
 * Tempo de lock para cleanup job (5 minutos).
 */
const CLEANUP_LOCK_TTL_SECONDS = 300;

/**
 * Tempo maximo para upload em PENDING (1 hora).
 */
const ABANDONED_CUTOFF_HOURS = 1;

/**
 * Tempo maximo para upload orfao sem proprietario (30 dias).
 */
const ORPHAN_CUTOFF_DAYS = 30;

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storageProvider: IObjectStorageProvider,
    @Optional()
    private readonly lockService: ILockService = new InMemoryLockService(),
  ) {}

  /**
   * Job 1: Cleanup de uploads abandonados.
   *
   * Remove uploads que estao em PENDING ha mais de 1 hora.
   * Marca como FAILED e remove do storage.
   *
   * Executa a cada 6 horas (a cada 6 horas no minuto 0).
   */
  @Cron('0 */6 * * *')
  async cleanupAbandonedUploads(): Promise<void> {
    const correlationId = crypto.randomUUID();
    const lockKey = 'lock:cleanup:abandoned';

    this.logger.log(
      `[${correlationId}] Iniciando cleanup de uploads abandonados`,
    );

    // Tenta adquirir lock
    const lockAcquired = await this.acquireLock(lockKey, correlationId);
    if (!lockAcquired) {
      this.logger.log(`[${correlationId}] Lock nao adquirido, job ignorado`);
      return;
    }

    try {
      const cutoff = new Date(
        Date.now() - ABANDONED_CUTOFF_HOURS * 60 * 60 * 1000,
      );

      const abandonedUploads = await this.prisma.upload.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoff },
        },
      });

      this.logger.log(
        `[${correlationId}] Encontrados ${abandonedUploads.length} uploads abandonados`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const upload of abandonedUploads) {
        try {
          await this.processAbandonedUpload(upload, correlationId);
          successCount++;
        } catch (error) {
          failCount++;
          this.logger.error(
            `[${correlationId}] Erro ao processar upload ${upload.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(
        `[${correlationId}] Cleanup abandonado concluido: ${successCount} removidos, ${failCount} erros`,
      );
    } finally {
      await this.releaseLock(lockKey, correlationId);
    }
  }

  /**
   * Job 2: Cleanup de uploads orfaos.
   *
   * Remove uploads que nao tem userId nem startupId ha mais de 30 dias.
   * Considera uploads sem proprietario como orfaos.
   *
   * Executa diariamente as 3h (0 3 * * *).
   */
  @Cron('0 3 * * *')
  async cleanupOrphanUploads(): Promise<void> {
    const correlationId = crypto.randomUUID();
    const lockKey = 'lock:cleanup:orphans';

    this.logger.log(`[${correlationId}] Iniciando cleanup de uploads orfaos`);

    // Tenta adquirir lock
    const lockAcquired = await this.acquireLock(lockKey, correlationId);
    if (!lockAcquired) {
      this.logger.log(`[${correlationId}] Lock nao adquirido, job ignorado`);
      return;
    }

    try {
      const cutoff = new Date(
        Date.now() - ORPHAN_CUTOFF_DAYS * 24 * 60 * 60 * 1000,
      );

      const orphanUploads = await this.prisma.upload.findMany({
        where: {
          userId: undefined,
          startupId: undefined,
          createdAt: { lt: cutoff },
          deletedAt: null,
        },
      });

      this.logger.log(
        `[${correlationId}] Encontrados ${orphanUploads.length} uploads orfaos`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const upload of orphanUploads) {
        try {
          await this.processOrphanUpload(upload, correlationId);
          successCount++;
        } catch (error) {
          failCount++;
          this.logger.error(
            `[${correlationId}] Erro ao processar orfao ${upload.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(
        `[${correlationId}] Cleanup orfao concluido: ${successCount} removidos, ${failCount} erros`,
      );
    } finally {
      await this.releaseLock(lockKey, correlationId);
    }
  }

  /**
   * Processa um upload abandonado.
   *
   * 1. Verifica se ainda esta em PENDING
   * 2. Verifica contagem de referencias SHA-256
   * 3. Remove objetos do storage se nao houver outras referencias
   * 4. Marca como FAILED e deletedAt
   */
  private async processAbandonedUpload(
    upload: any,
    correlationId: string,
  ): Promise<void> {
    // Verificar status atual (pode ter mudado desde a busca)
    const currentUpload = await this.prisma.upload.findUnique({
      where: { id: upload.id },
    });

    if (!currentUpload || currentUpload.status !== 'PENDING') {
      this.logger.log(
        `[${correlationId}] Upload ${upload.id} ja nao esta PENDING, ignorando`,
      );
      return;
    }

    // Contar referencias SHA-256
    const refCount = await this.prisma.upload.count({
      where: {
        sha256: upload.sha256 ?? undefined,
        id: { not: upload.id },
        deletedAt: null,
      },
    });

    // Soft-delete
    await this.prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'FAILED',
        deletedAt: new Date(),
        rejectionReason: 'Abandoned: PENDING por mais de 1 hora',
      },
    });

    // Remover do storage se nao houver referencias
    if (refCount === 0) {
      await this.removeUploadObjects(upload, correlationId);
    }

    this.logger.log(
      `[${correlationId}] Upload abandonado processado: id=${upload.id}`,
    );
  }

  /**
   * Processa um upload orfao.
   *
   * 1. Verifica se ainda nao tem proprietario
   * 2. Verifica contagem de referencias SHA-256
   * 3. Remove objetos do storage se nao houver outras referencias
   * 4. Marca como deletedAt (soft-delete)
   */
  private async processOrphanUpload(
    upload: any,
    correlationId: string,
  ): Promise<void> {
    // Verificar proprietario atual
    const currentUpload = await this.prisma.upload.findUnique({
      where: { id: upload.id },
    });

    if (!currentUpload || currentUpload.userId || currentUpload.startupId) {
      this.logger.log(
        `[${correlationId}] Upload ${upload.id} ja tem proprietario, ignorando`,
      );
      return;
    }

    // Contar referencias SHA-256
    const refCount = await this.prisma.upload.count({
      where: {
        sha256: upload.sha256 ?? undefined,
        id: { not: upload.id },
        deletedAt: null,
      },
    });

    // Soft-delete
    await this.prisma.upload.update({
      where: { id: upload.id },
      data: { deletedAt: new Date() },
    });

    // Remover do storage se nao houver referencias
    if (refCount === 0) {
      await this.removeUploadObjects(upload, correlationId);
    }

    this.logger.log(
      `[${correlationId}] Upload orfao processado: id=${upload.id}`,
    );
  }

  /**
   * Remove o objeto canonico e todas as variants persistidas.
   *
   * A iteracao e dinamica para suportar o formato atual (uma entrada por
   * tamanho) e registros legados que ainda contenham AVIF/JPEG/WebP.
   */
  private async removeUploadObjects(
    upload: any,
    correlationId: string,
  ): Promise<void> {
    if (upload.bucket && upload.key) {
      try {
        await this.storageProvider.delete(upload.bucket, upload.key);
        this.logger.log(
          `[${correlationId}] Upload ${upload.id} removido do storage: ${upload.bucket}/${upload.key}`,
        );
      } catch (error) {
        this.logger.warn(
          `[${correlationId}] Erro ao remover ${upload.bucket}/${upload.key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (!upload.variants || typeof upload.variants !== 'object') return;

    const variants = upload.variants as Record<string, unknown>;
    for (const sizeVariant of Object.values(variants)) {
      if (!sizeVariant || typeof sizeVariant !== 'object') continue;

      for (const formatVariant of Object.values(
        sizeVariant as Record<string, unknown>,
      )) {
        if (!formatVariant || typeof formatVariant !== 'object') continue;
        const storageObject = formatVariant as {
          bucket?: string;
          key?: string;
        };
        if (!storageObject.bucket || !storageObject.key) continue;

        try {
          await this.storageProvider.delete(
            storageObject.bucket,
            storageObject.key,
          );
        } catch (error) {
          this.logger.warn(
            `[${correlationId}] Erro ao remover variant ${storageObject.bucket}/${storageObject.key}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  /**
   * Adquire lock para evitar execucao concorrente.
   *
   * @param lockKey - Chave do lock
   * @param correlationId - ID de correlacao para logs
   * @returns true se lock adquirido, false caso contrario
   */
  private async acquireLock(
    lockKey: string,
    correlationId: string,
  ): Promise<boolean> {
    try {
      const acquired = await this.lockService.acquire(
        lockKey,
        CLEANUP_LOCK_TTL_SECONDS,
      );

      if (!acquired) {
        this.logger.log(
          `[${correlationId}] Lock nao adquirido (${lockKey}), job ignorado`,
        );
      }

      return acquired;
    } catch (error) {
      this.logger.warn(
        `[${correlationId}] Erro ao adquirir lock: ${error instanceof Error ? error.message : String(error)}, executando mesmo assim`,
      );
      return true; // Em caso de erro, executa para nao bloquear cleanup
    }
  }

  /**
   * Libera lock.
   *
   * @param lockKey - Chave do lock
   * @param _correlationId - ID de correlacao (nao usado nesta impl)
   */
  private async releaseLock(
    lockKey: string,
    _correlationId: string,
  ): Promise<void> {
    try {
      await this.lockService.release(lockKey);
    } catch (error) {
      this.logger.warn(
        `[${_correlationId}] Erro ao liberar lock: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
