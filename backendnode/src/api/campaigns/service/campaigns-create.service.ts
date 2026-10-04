import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemConfigService } from 'src/common/system-config/system-config.service';
import { ConfigService } from 'src/api/config/config.service';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CreateNewRoundDto } from '../dto/create-new-round.dto';
import { CampaignFinancialHelper } from './campaign-financial.helper';

/**
 * Service de criacao de Campaign (1a rodada e novas rodadas).
 *
 * Migrado de CampaignsService (S01.2a) - preserva regra B05 + audit CVM.
 *
 * S01.2b:
 *  - Injeta SystemConfigService para validacao dinamica de limites + snapshots
 *    financeiros do ADR-008 (Modelo A: tokenSellPrice = targetAmount / totalTokens).
 *  - Adiciona `createFirstCampaign` (criacao da 1a campanha, status DRAFT).
 *  - Validacao + calculo delegados a `CampaignFinancialHelper` (DRY).
 *
 * Regra B05 (Nova Rodada - T032 / M5-S09):
 *   - So permite nova campanha se a anterior foi 100% vendida
 *   - E se passaram pelo menos 3 meses desde closedAt
 *   - OU se nunca houve campanha anterior
 */
@Injectable()
export class CampaignsCreateService {
  private readonly logger = new Logger(CampaignsCreateService.name);
  private static readonly THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: SystemConfigService,
    private readonly fundraisingConfig: ConfigService,
  ) {}

  /**
   * Resolve a aliquota da taxa da plataforma (fracao, ex: 0.05) vigente.
   * Fonte: `fundraising.platformFee` (config_parameter_values — a store que
   * /admin/config edita). Fallback defensivo: 0.
   */
  private async resolvePlatformFeePct(): Promise<number> {
    const pct = await this.fundraisingConfig.getEffective(
      'fundraising.platformFee',
    );
    return Number.isFinite(pct) && pct >= 0 ? pct : 0;
  }

  /**
   * Resolve o preco de VENDA do token. Fonte primaria: `fundraising.tokenSalePrice`
   * (definido pelo admin em /admin/config). O `dtoTokenPrice` fica como
   * fallback para retrocompatibilidade com clients que ainda enviam o campo.
   */
  private async resolveTokenSellPrice(
    dtoTokenPrice: number | undefined,
  ): Promise<number> {
    const configured = await this.fundraisingConfig.getEffective(
      'fundraising.tokenSalePrice',
    );
    if (Number.isFinite(configured) && configured > 0) return configured;
    return dtoTokenPrice ?? 0;
  }

  /**
   * Extrai os 9 campos CVM + 10 campos de captacao (realocados Startup -> Campaign)
   * de um DTO para uso no Prisma create/update.
   */
  private extractCvmFields(
    dto: Record<string, unknown>,
  ): Record<string, unknown> {
    const cvmKeys = [
      'dataLancamentoRodada',
      'objetivoCaptacao',
      'oQueEsperaAlcancar',
      'participacaoLucros',
      'faturamentoMinimoLucros',
      'beneficiosAdicionais',
      'beneficiosDescricao',
      'aceiteTermoRepasse',
      'declaracaoVeracidade',
      // Campos de captacao (realocados de Startup -> Campaign)
      'problema',
      'solucao',
      'modeloReceita',
      'diferencial',
      'mercadoAlvo',
      'sociosCount',
      'dedicacao',
      'compradores',
      'investimentoPrevio',
      'concorrencia',
    ] as const;
    const result: Record<string, unknown> = {};
    for (const key of cvmKeys) {
      if (dto[key] !== undefined) {
        result[key] = dto[key];
      }
    }
    return result;
  }

  /**
   * Cria entrada de auditoria de aceite CVM usando raw SQL.
   * Tabela CampaignOfferAuditLog - fallback gracioso se tabela nao existir.
   */
  private async createAuditLogEntry(
    campaignId: number,
    action: string,
    userId: number,
  ): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO campaign_offer_audit_logs (campaignId, action, ip, userAgent, userId, occurredAt)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        campaignId,
        action,
        null,
        null,
        userId ?? null,
      );
      this.logger.log(
        `Audit CVM: ${action} registrado para campaign ${campaignId}.`,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar audit CVM para campaign ${campaignId}: ${error}`,
      );
    }
  }

  /**
   * Cria logs de auditoria quando aceiteTermoRepasse ou declaracaoVeracidade
   * mudam para true (no contexto de criacao da nova rodada).
   */
  private async createCvmAuditLogs(
    campaignId: number,
    userId: number,
    next: { aceiteTermoRepasse?: boolean; declaracaoVeracidade?: boolean },
  ): Promise<void> {
    if (next.aceiteTermoRepasse === true) {
      await this.createAuditLogEntry(
        campaignId,
        'ACEITE_TERMO_REPASSE',
        userId,
      );
    }
    if (next.declaracaoVeracidade === true) {
      await this.createAuditLogEntry(
        campaignId,
        'DECLARACAO_VERACIDADE',
        userId,
      );
    }
  }

  /**
   * T032 (B05) - Regra "Nova Rodada".
   * Cria uma nova campanha APENAS se a rodada anterior teve 100% dos tokens
   * vendidos E se passaram pelo menos 3 meses desde o encerramento.
   *
   * Aplica validacao dinamica de limites (SystemConfig) ANTES da regra B05
   * para fail-fast em inputs claramente invalidos.
   */
  async requestNewRound(
    startupId: number,
    dto: CreateNewRoundDto,
    user: PayloadEntity,
  ) {
    // 1. Validar limites dinamicos (fail-fast, sem query no banco)
    const configs = await this.configService.getFinancialConfigs();
    CampaignFinancialHelper.validateCampaignLimits(
      { targetAmount: dto.targetAmount, totalTokens: dto.totalTokens },
      configs,
    );

    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true },
    });

    if (!startup) {
      throw new NotFoundException('STARTUP_NOT_FOUND');
    }

    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    const lastClosed = await this.prisma.campaign.findFirst({
      where: { startupId, status: { in: ['CLOSED', 'FUNDED'] } },
      orderBy: { closedAt: 'desc' },
      select: {
        id: true,
        tokensSold: true,
        totalTokens: true,
        closedAt: true,
        status: true,
      },
    });

    if (lastClosed) {
      if (lastClosed.tokensSold < lastClosed.totalTokens) {
        this.logger.warn(
          `Nova rodada bloqueada: rodada anterior (${lastClosed.id}) nao 100% vendida.`,
        );
        throw new BadRequestException({
          code: 'RODADA_ANTERIOR_NAO_VENDIDA',
          message:
            'A rodada anterior precisa estar 100% vendida para iniciar uma nova.',
        });
      }

      const closedAt = lastClosed.closedAt
        ? new Date(lastClosed.closedAt)
        : new Date();
      const threeMonthsAgo = new Date(
        Date.now() - CampaignsCreateService.THREE_MONTHS_MS,
      );
      if (closedAt > threeMonthsAgo) {
        this.logger.warn(
          `Nova rodada bloqueada: intervalo minimo de 3 meses nao atingido.`,
        );
        throw new BadRequestException({
          code: 'INTERVALO_MINIMO_3_MESES',
          message:
            'E preciso esperar 3 meses desde o encerramento da rodada anterior.',
        });
      }
    }

    // 2. Calcular snapshots financeiros (ADR-008 Modelo B — split venda/base).
    //    Preco de venda vem do config vigente (admin, /admin/config); o
    //    dto.tokenPrice fica como fallback de retrocompatibilidade.
    const [platformFeePct, tokenSellPrice] = await Promise.all([
      this.resolvePlatformFeePct(),
      this.resolveTokenSellPrice(dto.tokenPrice),
    ]);
    const snapshots = CampaignFinancialHelper.computeFinancialSnapshots(
      { targetAmount: dto.targetAmount, totalTokens: dto.totalTokens },
      configs,
      { tokenSellPrice, platformFeePct },
    );

    const campaign = await this.prisma.campaign.create({
      data: {
        startupId,
        title: dto.title,
        targetAmount: dto.targetAmount as any,
        minInvestment: dto.minInvestment as any,
        valuation: dto.valuation as any,
        tokenPrice: snapshots.tokenSellPrice as any,
        totalTokens: dto.totalTokens,
        tokensSold: 0,
        deadline: dto.deadline,
        status: 'OPEN',
        // Snapshots financeiros (ADR-008)
        adminFeeValue: snapshots.adminFeeValue as any,
        tokenBaseValue: snapshots.tokenBaseValue as any,
        tokenSellPrice: snapshots.tokenSellPrice as any,
        tokenMintingCost: snapshots.tokenMintingCost as any,
        ...this.extractCvmFields(dto as unknown as Record<string, unknown>),
      },
    });

    // Audit log: registrar aceites CVM na criacao
    if (
      (dto as any).aceiteTermoRepasse === true ||
      (dto as any).declaracaoVeracidade === true
    ) {
      await this.createCvmAuditLogs(campaign.id, user.id, {
        aceiteTermoRepasse: (dto as any).aceiteTermoRepasse,
        declaracaoVeracidade: (dto as any).declaracaoVeracidade,
      });
    }

    this.logger.log(
      `Nova rodada criada (campaign=${campaign.id}) para startup ${startupId}.`,
    );

    return {
      error: false,
      message: 'Nova rodada criada',
      codigo: 201,
      data: campaign,
    };
  }

  /**
   * S01.2b - Cria a PRIMEIRA campanha de uma startup (sem regra B05).
   * Status inicial: DRAFT (admin precisa aprovar antes de virar OPEN).
   *
   * Diferencas de `requestNewRound`:
   *  - Sem regra B05 (pode criar a qualquer momento)
   *  - Status inicial = DRAFT em vez de OPEN
   *  - Bloqueia se ja existe qualquer campanha previa da startup
   */
  async createFirstCampaign(
    startupId: number,
    dto: CreateNewRoundDto,
    user: PayloadEntity,
  ) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true },
    });

    if (!startup) {
      throw new NotFoundException('STARTUP_NOT_FOUND');
    }

    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    // 1. Validar limites dinamicos (fail-fast)
    const configs = await this.configService.getFinancialConfigs();
    CampaignFinancialHelper.validateCampaignLimits(
      { targetAmount: dto.targetAmount, totalTokens: dto.totalTokens },
      configs,
    );

    // 2. Bloquear se ja existe qualquer campanha (qualquer status)
    const existing = await this.prisma.campaign.findFirst({
      where: { startupId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'STARTUP_ALREADY_HAS_CAMPAIGN',
        message:
          'Esta startup ja possui campanha. Use POST /campaigns/:startupId/new-round para criar uma nova rodada.',
      });
    }

    // 3. Calcular snapshots financeiros (Modelo B — split venda/base).
    //    Preco de venda vem do config vigente (admin); dto.tokenPrice e
    //    fallback de retrocompatibilidade.
    const [platformFeePct, tokenSellPrice] = await Promise.all([
      this.resolvePlatformFeePct(),
      this.resolveTokenSellPrice(dto.tokenPrice),
    ]);
    const snapshots = CampaignFinancialHelper.computeFinancialSnapshots(
      { targetAmount: dto.targetAmount, totalTokens: dto.totalTokens },
      configs,
      { tokenSellPrice, platformFeePct },
    );

    // 4. Criar com status DRAFT
    const campaign = await this.prisma.campaign.create({
      data: {
        startupId,
        title: dto.title,
        targetAmount: dto.targetAmount as any,
        minInvestment: dto.minInvestment as any,
        valuation: dto.valuation as any,
        tokenPrice: snapshots.tokenSellPrice as any,
        totalTokens: dto.totalTokens,
        tokensSold: 0,
        deadline: dto.deadline,
        status: 'DRAFT',
        // Snapshots financeiros (ADR-008)
        adminFeeValue: snapshots.adminFeeValue as any,
        tokenBaseValue: snapshots.tokenBaseValue as any,
        tokenSellPrice: snapshots.tokenSellPrice as any,
        tokenMintingCost: snapshots.tokenMintingCost as any,
        ...this.extractCvmFields(dto as unknown as Record<string, unknown>),
      },
    });

    this.logger.log(
      `Primeira campanha criada (campaign=${campaign.id}, status=DRAFT) para startup ${startupId}.`,
    );

    return {
      error: false,
      message: 'Campanha criada em rascunho (DRAFT).',
      codigo: 201,
      data: campaign,
    };
  }
}
