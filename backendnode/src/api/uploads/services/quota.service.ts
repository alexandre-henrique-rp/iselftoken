/**
 * Servico de controle de quota de uploads.
 *
 * Valida limites de storage, quantidade de uploads e tamanho de arquivo
 * antes de processar um upload. Integra com Prisma aggregate.
 *
 * @service QuotaService
 */
import { Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Planos de usuario disponiveis.
 *
 * @enum UserPlan
 */
export enum UserPlan {
  /** Plano gratuito com limites basicos */
  FREE = 'FREE',
  /** Plano profissional com limites maiores */
  PRO = 'PRO',
}

/**
 * Limites de quota por plano.
 *
 * @interface QuotaLimits
 */
export interface QuotaLimits {
  /** Limite de storage em bytes */
  maxStorageBytes: number;
  /** Numero maximo de uploads ativos */
  maxUploads: number;
  /** Tamanho maximo por arquivo em bytes */
  maxFileSizeBytes: number;
  /** Uploads por hora por IP */
  maxUploadsPerHour: number;
}

/**
 * Uso atual de quota.
 *
 * @interface QuotaUsage
 */
export interface QuotaUsage {
  /** Storage usado em bytes */
  usedStorageBytes: number;
  /** Quantidade de uploads ativos */
  uploadCount: number;
}

/**
 * Limites padrao por plano (Free).
 */
const FREE_LIMITS: QuotaLimits = {
  maxStorageBytes: 500 * 1024 * 1024, // 500 MB
  maxUploads: 1000,
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  maxUploadsPerHour: 50,
};

/**
 * Limites para plano Pro.
 */
const PRO_LIMITS: QuotaLimits = {
  maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  maxUploads: 10000,
  maxFileSizeBytes: 100 * 1024 * 1024, // 100 MB
  maxUploadsPerHour: 200,
};

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna limites de quota para o plano especificado.
   *
   * @param plan - Plano do usuario
   * @returns Limites de quota
   *
   * @example
   * const limits = service.getUserLimits(UserPlan.FREE);
   * console.log(`Max storage: ${limits.maxStorageBytes} bytes`);
   */
  getUserLimits(plan: UserPlan): QuotaLimits {
    return plan === UserPlan.PRO ? PRO_LIMITS : FREE_LIMITS;
  }

  /**
   * Verifica se o usuario/startup tem quota para o upload.
   *
   * Valida storage total usado, quantidade de uploads ativos e tamanho do arquivo.
   * Se qualquer limite for excedido, lanza PayloadTooLargeException.
   *
   * @param userId - ID do usuario
   * @param startupId - ID da startup (opcional)
   * @param fileSize - Tamanho do arquivo em bytes
   * @param plan - Plano do usuario
   * @returns void
   * @throws {PayloadTooLargeException} Se algum limite for excedido
   *
   * @example
   * await service.checkQuota(1, undefined, 1024 * 1024, UserPlan.FREE);
   */
  async checkQuota(
    userId: number,
    startupId: number | undefined,
    fileSize: number,
    plan: UserPlan,
  ): Promise<void> {
    const limits = this.getUserLimits(plan);

    // Validar tamanho do arquivo
    if (fileSize > limits.maxFileSizeBytes) {
      const maxMB = Math.round(limits.maxFileSizeBytes / (1024 * 1024));
      throw new PayloadTooLargeException(
        `Tamanho do arquivo excede o limite do plano: ${maxMB}MB`,
      );
    }

    // Buscar uso atual
    const usage = await this.getUsage(userId, startupId);

    // Validar storage total
    if (usage.usedStorageBytes + fileSize > limits.maxStorageBytes) {
      const usedGB = (usage.usedStorageBytes / (1024 * 1024 * 1024)).toFixed(2);
      const limitGB = (limits.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(
        2,
      );
      throw new PayloadTooLargeException(
        `Limite de storage excedido: ${usedGB}GB usado de ${limitGB}GB`,
      );
    }

    // Validar quantidade de uploads
    if (usage.uploadCount >= limits.maxUploads) {
      throw new PayloadTooLargeException(
        `Limite de uploads atingido: ${usage.uploadCount}/${limits.maxUploads}`,
      );
    }

    this.logger.debug(
      `[QuotaService] Quota OK: userId=${userId}, startupId=${startupId}, ` +
        `fileSize=${fileSize}, used=${usage.usedStorageBytes}/${limits.maxStorageBytes}`,
    );
  }

  /**
   * Retorna o uso atual de quota do usuario/startup.
   *
   * @param userId - ID do usuario
   * @param startupId - ID da startup (opcional)
   * @returns Uso atual de quota
   *
   * @example
   * const usage = await service.getUsage(1, undefined);
   * console.log(`Storage usado: ${usage.usedStorageBytes} bytes`);
   */
  async getUsage(
    userId: number,
    startupId: number | undefined,
  ): Promise<QuotaUsage> {
    const whereClause: any = {
      deletedAt: null,
    };

    if (startupId !== undefined) {
      whereClause.$or = [{ userId, startupId: null }, { startupId }];
    } else {
      whereClause.userId = userId;
    }

    const [storageResult, countResult] = await Promise.all([
      this.prisma.upload.aggregate({
        where: whereClause,
        _sum: { size: true },
      }),
      this.prisma.upload.count({
        where: whereClause,
      }),
    ]);

    return {
      usedStorageBytes: storageResult._sum.size ?? 0,
      uploadCount: countResult,
    };
  }
}
