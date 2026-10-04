/**
 * @description Service para gestao de configuracoes de parcelamento.
 * Apenas 1 config pode estar vigente (effectiveUntil=null) por vez.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { Prisma } from '@prisma/client';
import { CreateInstallmentConfigDto } from '../dto/create-installment-config.dto';

export interface InstallmentConfigListResult {
  data: InstallmentConfig[];
  total: number;
  page: number;
  limit: number;
}

export type InstallmentConfig = Prisma.InstallmentConfigGetPayload<object>;

@Injectable()
export class InstallmentConfigService {
  private readonly logger = new Logger(InstallmentConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria nova config. Se a anterior vigente, fecha ela (effectiveUntil=now).
   */
  async create(
    dto: CreateInstallmentConfigDto,
    userId: number,
  ): Promise<InstallmentConfig> {
    if (dto.maxInstallments > 18) {
      throw new UnprocessableEntityException({
        code: 'limite_efi',
        message: 'maxInstallments nao pode ser maior que 18',
      });
    }
    if (dto.minInstallmentAmount < 0) {
      throw new BadRequestException('minInstallmentAmount invalido');
    }

    // Fecha config vigente anterior
    await this.prisma.installmentConfig.updateMany({
      where: { effectiveUntil: null },
      data: { effectiveUntil: new Date() },
    });

    const config = await this.prisma.installmentConfig.create({
      data: {
        interestRate: dto.interestRate,
        maxInstallments: dto.maxInstallments,
        minInstallmentAmount: dto.minInstallmentAmount,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: userId,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      userId,
      action: 'INSTALLMENT_CONFIG_CREATED',
      entity: 'InstallmentConfig',
      entityId: config.id,
      newValue: config,
    });

    this.logger.log(
      `Configuracao criada: id=${config.id}, taxa=${dto.interestRate}`,
    );
    return config;
  }

  /**
   * Retorna config vigente (effectiveUntil=null) ou null.
   */
  async getVigente(): Promise<InstallmentConfig | null> {
    return this.prisma.installmentConfig.findFirst({
      where: { effectiveUntil: null, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Lista historico paginado.
   */
  async list(page = 1, limit = 20): Promise<InstallmentConfigListResult> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.installmentConfig.findMany({
        orderBy: { effectiveFrom: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.installmentConfig.count(),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Soft delete: marca effectiveUntil=now + isActive=false.
   */
  async deactivate(id: number, userId: number): Promise<InstallmentConfig> {
    const config = await this.prisma.installmentConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundException('config_not_found');
    }
    if (config.effectiveUntil) {
      throw new BadRequestException('config_already_deactivated');
    }

    const updated = await this.prisma.installmentConfig.update({
      where: { id },
      data: { effectiveUntil: new Date(), isActive: false },
    });

    await this.auditService.log({
      userId,
      action: 'INSTALLMENT_CONFIG_DEACTIVATED',
      entity: 'InstallmentConfig',
      entityId: id,
      oldValue: { effectiveUntil: null, isActive: true },
      newValue: { effectiveUntil: updated.effectiveUntil, isActive: false },
    });

    this.logger.log(`Configuracao desativada: id=${id}`);
    return updated;
  }

  /**
   * Busca por ID.
   */
  async findById(id: number): Promise<InstallmentConfig | null> {
    return this.prisma.installmentConfig.findUnique({ where: { id } });
  }
}
