/**
 * SplitService - CRUD de configurações de split para pagamentos PIX.
 *
 * Gerencia a criação, listagem, busca, atualização e desativação (soft delete)
 * de configurações de split de pagamento.
 *
 * @service SplitService
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';

/** Valor default de TTL do cache Redis (5 minutos). */
const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_ACTIVE = 'split:active';

export interface SplitConfigResponse {
  id: string;
  name: string;
  platformPercent: number;
  founderPercent: number;
  investorCashbackPercent: number;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Cria uma nova configuração de split.
   * Valida que a soma dos percentuais é 100%.
   *
   * @param dto - Dados da configuração com name, platformPercent, founderPercent, investorCashbackPercent
   * @returns SplitConfigResponse criada
   * @throws UnprocessableEntityException se soma dos percentuais != 100%
   */
  async create(dto: CreateSplitDto): Promise<SplitConfigResponse> {
    const sum =
      dto.platformPercent +
      dto.founderPercent +
      (dto.investorCashbackPercent ?? 0);

    if (Math.abs(sum - 100) > 0.01) {
      throw new UnprocessableEntityException({
        code: 'invalid_split_percent',
        message: `Soma dos percentuais deve ser 100% (recebido: ${sum}%)`,
      });
    }

    // Constrói o splits JSON conforme estrutura da EFI
    const splitsJson = this.buildSplitsJson(dto);

    // efiSplitId=0 é placeholder interno — atualizado pela integração EFI em.flow separado
    const split = await this.prisma.splitConfig.create({
      data: {
        efiSplitId: 0,
        name: dto.name,
        splits: splitsJson as Prisma.InputJsonValue,
        active: dto.isActive ?? true,
        createdById: 0, // preenchido pelo contexto de auth em produção
      },
    });

    await this.auditLog.log({
      userId: null,
      action: 'SPLIT_CONFIG_CREATED',
      entity: 'SplitConfig',
      entityId: split.id,
      newValue: split,
    });

    await this.invalidateCache();

    return this.toResponse(split);
  }

  /**
   * Lista splits ativos, usando cache Redis (TTL 5min).
   *
   * @returns Lista de SplitConfigResponse ativos
   */
  async listActive(): Promise<SplitConfigResponse[]> {
    const cached = await this.redis.get(CACHE_KEY_ACTIVE);
    if (cached) {
      this.logger.debug('Split listActive: cache hit');
      return JSON.parse(cached) as SplitConfigResponse[];
    }

    const splits = await this.prisma.splitConfig.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const response = splits.map((s) => this.toResponse(s));

    await this.redis.set(
      CACHE_KEY_ACTIVE,
      JSON.stringify(response),
      'EX',
      CACHE_TTL_SECONDS,
    );

    return response;
  }

  /**
   * Busca uma configuração de split pelo ID.
   *
   * @param id - ID numérico do split
   * @returns SplitConfigResponse
   * @throws NotFoundException se não encontrado
   */
  async findOne(id: number): Promise<SplitConfigResponse> {
    const split = await this.prisma.splitConfig.findFirst({
      where: { id: String(id) },
    });

    if (!split) {
      throw new NotFoundException({
        code: 'split_not_found',
        message: `SplitConfig com id ${id} não encontrado`,
      });
    }

    return this.toResponse(split);
  }

  /**
   * Atualiza uma configuração de split existente.
   * Revalida soma dos percentuais se algum percentual foi alterado.
   *
   * @param id - ID numérico do split
   * @param dto - Campos a atualizar
   * @returns SplitConfigResponse atualizada
   */
  async update(id: number, dto: UpdateSplitDto): Promise<SplitConfigResponse> {
    const existing = await this.prisma.splitConfig.findFirst({
      where: { id: String(id) },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'split_not_found',
        message: `SplitConfig com id ${id} não encontrado`,
      });
    }

    // Revalida percentuais se algum foi alterado
    if (
      dto.platformPercent !== undefined ||
      dto.founderPercent !== undefined ||
      dto.investorCashbackPercent !== undefined
    ) {
      const platform =
        dto.platformPercent ?? this.extractPercent(existing.splits, 'platform');
      const founder =
        dto.founderPercent ?? this.extractPercent(existing.splits, 'founder');
      const investor =
        dto.investorCashbackPercent ??
        this.extractPercent(existing.splits, 'investor');
      const sum = platform + founder + investor;

      if (Math.abs(sum - 100) > 0.01) {
        throw new UnprocessableEntityException({
          code: 'invalid_split_percent',
          message: `Soma dos percentuais deve ser 100% (recebido: ${sum}%)`,
        });
      }
    }

    // Reconstrói splits JSON com valores atualizados
    const platform =
      dto.platformPercent ?? this.extractPercent(existing.splits, 'platform');
    const founder =
      dto.founderPercent ?? this.extractPercent(existing.splits, 'founder');
    const investor =
      dto.investorCashbackPercent ??
      this.extractPercent(existing.splits, 'investor');

    const updated = await this.prisma.splitConfig.update({
      where: { id: String(id) },
      data: {
        name: dto.name ?? existing.name,
        splits:
          dto.platformPercent !== undefined ||
          dto.founderPercent !== undefined ||
          dto.investorCashbackPercent !== undefined
            ? (this.buildSplitsJsonFromPercents(
                platform,
                founder,
                investor,
              ) as Prisma.InputJsonValue)
            : existing.splits == null
              ? undefined
              : (existing.splits as Prisma.InputJsonValue),
        active: dto.isActive !== undefined ? dto.isActive : existing.active,
      },
    });

    await this.auditLog.log({
      userId: null,
      action: 'SPLIT_CONFIG_UPDATED',
      entity: 'SplitConfig',
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });

    await this.invalidateCache();

    return this.toResponse(updated);
  }

  /**
   * Desativa uma configuração de split (soft delete).
   *
   * @param id - ID numérico do split
   * @throws NotFoundException se não encontrado
   */
  async deactivate(id: number): Promise<{ id: number; isActive: false }> {
    const existing = await this.prisma.splitConfig.findFirst({
      where: { id: String(id) },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'split_not_found',
        message: `SplitConfig com id ${id} não encontrado`,
      });
    }

    await this.prisma.splitConfig.update({
      where: { id: existing.id },
      data: { active: false },
    });

    await this.auditLog.log({
      userId: null,
      action: 'SPLIT_CONFIG_DEACTIVATED',
      entity: 'SplitConfig',
      entityId: existing.id,
      oldValue: { active: true },
      newValue: { active: false },
    });

    await this.invalidateCache();

    return { id, isActive: false };
  }

  // ─── Privados ───────────────────────────────────────────────────────────────

  /**
   * Constrói o JSON de splits a partir do DTO de criação.
   * Formato EFI: [{ role: string, percentage: number, description: string }]
   */
  private buildSplitsJson(dto: CreateSplitDto): object[] {
    const splits: object[] = [
      {
        role: 'platform',
        percentage: dto.platformPercent,
        description: 'Plataforma',
      },
      {
        role: 'founder',
        percentage: dto.founderPercent,
        description: 'Founder',
      },
    ];
    if (
      dto.investorCashbackPercent !== undefined &&
      dto.investorCashbackPercent > 0
    ) {
      splits.push({
        role: 'investor',
        percentage: dto.investorCashbackPercent,
        description: 'Cashback Investidor',
      });
    }
    return splits;
  }

  /** Constrói JSON de splits a partir de percentuais avulsos. */
  private buildSplitsJsonFromPercents(
    platform: number,
    founder: number,
    investor: number,
  ): object[] {
    const splits: object[] = [
      { role: 'platform', percentage: platform, description: 'Plataforma' },
      { role: 'founder', percentage: founder, description: 'Founder' },
    ];
    if (investor > 0) {
      splits.push({
        role: 'investor',
        percentage: investor,
        description: 'Cashback Investidor',
      });
    }
    return splits;
  }

  /**
   * Extrai percentual de um role específico do JSON splits.
   * Fallback: 0 se não encontrado.
   */
  private extractPercent(splits: unknown, role: string): number {
    if (!Array.isArray(splits)) return 0;
    const entry = (
      splits as Array<{ role?: string; percentage?: number }>
    ).find((s) => s.role === role);
    return entry?.percentage ?? 0;
  }

  /** Invalida o cache Redis de splits ativos. */
  private async invalidateCache(): Promise<void> {
    try {
      await this.redis.del(CACHE_KEY_ACTIVE);
    } catch (err) {
      this.logger.warn(`Falha ao invalidar cache split:active — ${err}`);
    }
  }

  /**
   * Converte registro do Prisma em response da API.
   * Une campos do Prisma real (id String, active, splits Json)
   * com a interface AC (platformPercent, founderPercent, investorCashbackPercent).
   */
  private toResponse(split: {
    id: string;
    name: string;
    splits: unknown;
    active: boolean;
    createdAt: Date;
  }): SplitConfigResponse {
    return {
      id: split.id,
      name: split.name,
      platformPercent: this.extractPercent(split.splits, 'platform'),
      founderPercent: this.extractPercent(split.splits, 'founder'),
      investorCashbackPercent: this.extractPercent(split.splits, 'investor'),
      isActive: split.active,
      createdAt: split.createdAt.toISOString(),
    };
  }
}
