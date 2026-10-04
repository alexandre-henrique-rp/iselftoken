import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemConfigService } from 'src/common/system-config/system-config.service';
import { ConfigService } from 'src/api/config/config.service';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CampaignAction } from '../dto/action-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignFinancialHelper } from './campaign-financial.helper';

/**
 * Service de transicoes de estado e atualizacao parcial de Campaign.
 *
 * Migrado de CampaignsService (S01.2a) - preserva comportamento exato.
 *
 * S01.2b:
 *  - Injeta SystemConfigService para revalidar limites + recalcular snapshots
 *    quando targetAmount/totalTokens mudam em updateDraft.
 *  - Adiciona `updateDraft` (PATCH /:id/draft) - edicao de campanhas em status DRAFT.
 *
 * Regra B06 (state machine):
 *   OPEN    -> PAUSE
 *   PAUSED  -> RESUME | FINISH
 *   CLOSED  -> FINISH (no-op ou re-confirmacao)
 *   FUNDED  -> [] (terminal)
 */
@Injectable()
export class CampaignsStateService {
  private readonly logger = new Logger(CampaignsStateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: SystemConfigService,
    private readonly fundraisingConfig: ConfigService,
  ) {}

  private assertOfferEditable(campaign: {
    startup: { status: string };
    payments?: Array<{ id: number }>;
  }): void {
    if (
      campaign.startup.status === 'APPROVED' &&
      (campaign.payments?.length ?? 0) > 0
    ) {
      throw new ForbiddenException({
        code: 'CAMPAIGN_LOCKED_AFTER_COMPLIANCE',
        message:
          'A captação está bloqueada após o pagamento da Taxa de Compliance e a aprovação da startup.',
      });
    }
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
      'politicaLucros',
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
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO campaign_offer_audit_logs (campaignId, action, ip, userAgent, userId, occurredAt)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        campaignId,
        action,
        ip ?? null,
        userAgent ?? null,
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
   * mudam para true.
   */
  private async createCvmAuditLogs(
    campaignId: number,
    userId: number,
    current: { aceiteTermoRepasse: boolean; declaracaoVeracidade: boolean },
    next: { aceiteTermoRepasse?: boolean; declaracaoVeracidade?: boolean },
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    if (next.aceiteTermoRepasse === true && !current.aceiteTermoRepasse) {
      await this.createAuditLogEntry(
        campaignId,
        'ACEITE_TERMO_REPASSE',
        userId,
        ip,
        userAgent,
      );
    }
    if (next.declaracaoVeracidade === true && !current.declaracaoVeracidade) {
      await this.createAuditLogEntry(
        campaignId,
        'DECLARACAO_VERACIDADE',
        userId,
        ip,
        userAgent,
      );
    }
  }

  /**
   * T033 (B06) - State machine pos-rodada.
   * T033 (B06) - State machine pos-rodada.
   * Acoes permitidas por status:
   *   OPEN    -> PAUSE
   *   PAUSED  -> RESUME | FINISH
   *   CLOSED  -> FINISH (no-op ou re-confirmacao)
   *   FUNDED  -> [] (terminal)
   */
  async executeAction(
    campaignId: number,
    action: CampaignAction,
    user: PayloadEntity,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    if (campaign.startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    const allowed: Record<string, CampaignAction[]> = {
      OPEN: [CampaignAction.PAUSE],
      PAUSED: [CampaignAction.RESUME, CampaignAction.FINISH],
      CLOSED: [CampaignAction.FINISH],
      FUNDED: [],
    };

    const permitted = allowed[campaign.status] || [];

    if (!permitted.includes(action)) {
      throw new ForbiddenException({
        code: 'ACAO_NAO_PERMITIDA_POS_RODADA',
        message: `Acao ${action} nao permitida para status ${campaign.status}.`,
        allowedActions: permitted,
      });
    }

    const newStatus: Record<CampaignAction, 'PAUSED' | 'OPEN' | 'CLOSED'> = {
      [CampaignAction.PAUSE]: 'PAUSED',
      [CampaignAction.RESUME]: 'OPEN',
      [CampaignAction.FINISH]: 'CLOSED',
    };

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: newStatus[action],
        closedAt:
          action === CampaignAction.FINISH ? new Date() : campaign.closedAt,
      },
    });

    this.logger.log(
      `Campaign ${campaignId} ${campaign.status} -> ${updated.status} (action=${action}).`,
    );

    return {
      error: false,
      message: 'Acao executada',
      codigo: 200,
      data: updated,
    };
  }

  /**
   * T033 - Bloqueio PATCH generico em campanhas pos-rodada.
   */
  async update(
    campaignId: number,
    dto: { status?: string; [k: string]: unknown },
    user: PayloadEntity,
    ip?: string,
    userAgent?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    if (campaign.startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    this.assertOfferEditable(campaign);

    if (campaign.status !== 'DRAFT' && dto.status === undefined) {
      throw new ForbiddenException({
        code: 'CAMPAIGN_NOT_EDITABLE',
        message:
          'Apenas campanhas em DRAFT podem ser editadas. Use as ações de transição para alterar o status da campanha.',
      });
    }

    // Snapshot para comparacao de audit
    const prevAceite = campaign.aceiteTermoRepasse;
    const prevDeclaracao = campaign.declaracaoVeracidade;

    const cvmData = this.extractCvmFields(dto);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: (dto.status as any) ?? campaign.status,
        ...cvmData,
      },
    });

    // Audit: registrar aceite CVM quando muda para true
    await this.createCvmAuditLogs(
      campaignId,
      user.id,
      {
        aceiteTermoRepasse: prevAceite,
        declaracaoVeracidade: prevDeclaracao,
      },
      {
        aceiteTermoRepasse: dto.aceiteTermoRepasse as boolean | undefined,
        declaracaoVeracidade: dto.declaracaoVeracidade as boolean | undefined,
      },
      ip,
      userAgent,
    );

    // Warning: faturamentoMinimoLucros com participacaoLucros=false
    const nextParticipacao =
      (dto.participacaoLucros as boolean | undefined) ??
      campaign.participacaoLucros;
    const nextFaturamento =
      (dto.faturamentoMinimoLucros as number | undefined) ??
      campaign.faturamentoMinimoLucros;
    if (nextFaturamento != null && nextParticipacao === false) {
      this.logger.warn(
        `ATENCAO campaign ${campaignId}: faturamentoMinimoLucros definido (${nextFaturamento}), mas participacaoLucros esta desligada.`,
      );
    }

    return updated;
  }

  /**
   * S01.2b - PATCH /:id/draft. Edita campanha APENAS se status === DRAFT.
   *
   * Comportamento:
   *  - 404 se campaign nao existe
   *  - 403 NOT_OWNER se user nao eh owner nem ADMIN
   *  - 403 CAMPAIGN_NOT_EDITABLE se status != DRAFT
   *  - Revalida limites dinamicamente se targetAmount/totalTokens mudaram
   *  - Recalcula snapshots financeiros (ADR-008) se valores financeiros mudaram
   *  - Aceita updates parciais (apenas campos editaveis)
   */
  async updateDraft(
    campaignId: number,
    dto: UpdateCampaignDto,
    user: PayloadEntity,
    ip?: string,
    userAgent?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    if (campaign.startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    this.assertOfferEditable(campaign);

    if (campaign.status !== 'DRAFT') {
      throw new ForbiddenException({
        code: 'CAMPAIGN_NOT_EDITABLE',
        message:
          'Apenas campanhas em DRAFT podem ser editadas. Use PATCH /:id/action para mudar status.',
      });
    }

    // Snapshot para audit CVM
    const prevAceite = campaign.aceiteTermoRepasse;
    const prevDeclaracao = campaign.declaracaoVeracidade;

    // Calcular valores efetivos (novos OU existentes)
    const newTargetAmount =
      dto.targetAmount !== undefined
        ? dto.targetAmount
        : Number(campaign.targetAmount);
    const newTotalTokens =
      dto.totalTokens !== undefined ? dto.totalTokens : campaign.totalTokens;

    // Recalcular snapshots apenas se valores financeiros mudaram
    let snapshotUpdates: Record<string, unknown> = {};
    if (dto.targetAmount !== undefined || dto.totalTokens !== undefined) {
      const configs = await this.configService.getFinancialConfigs();
      CampaignFinancialHelper.validateCampaignLimits(
        { targetAmount: newTargetAmount, totalTokens: newTotalTokens },
        configs,
      );
      // Modelo B (split venda/base): preserva o preco de VENDA ja definido
      // na campanha (snapshot imutavel da rodada) e recalcula o valor base
      // (targetAmount / totalTokens) + a taxa vigente da plataforma.
      const platformFeePct = await this.fundraisingConfig.getEffective(
        'fundraising.platformFee',
      );
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: newTargetAmount, totalTokens: newTotalTokens },
        configs,
        {
          tokenSellPrice: Number(
            campaign.tokenSellPrice ?? campaign.tokenPrice,
          ),
          platformFeePct:
            Number.isFinite(platformFeePct) && platformFeePct >= 0
              ? platformFeePct
              : 0,
        },
      );
      snapshotUpdates = {
        tokenBaseValue: snap.tokenBaseValue as any,
        tokenSellPrice: snap.tokenSellPrice as any,
        adminFeeValue: snap.adminFeeValue as any,
        tokenMintingCost: snap.tokenMintingCost as any,
      };
    }

    const cvmData = this.extractCvmFields(
      dto as unknown as Record<string, unknown>,
    );

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetAmount !== undefined && {
          targetAmount: dto.targetAmount as any,
        }),
        ...(dto.minInvestment !== undefined && {
          minInvestment: dto.minInvestment as any,
        }),
        ...(dto.totalTokens !== undefined && {
          totalTokens: dto.totalTokens,
        }),
        // BUG-FT-008 — Programa de Afiliados. Spread por !== undefined:
        // aceita 0 (recusado) sem cair no spread. Sem este spread, o campo
        // era descartado silenciosamente em updateDraft.
        ...(dto.affiliateCommissionPct !== undefined && {
          affiliateCommissionPct: dto.affiliateCommissionPct as any,
        }),
        ...snapshotUpdates,
        ...cvmData,
      },
    });

    // Audit: registrar aceite CVM quando muda para true
    await this.createCvmAuditLogs(
      campaignId,
      user.id,
      {
        aceiteTermoRepasse: prevAceite,
        declaracaoVeracidade: prevDeclaracao,
      },
      {
        aceiteTermoRepasse: dto.aceiteTermoRepasse,
        declaracaoVeracidade: dto.declaracaoVeracidade,
      },
      ip,
      userAgent,
    );

    this.logger.log(
      `Draft atualizado (campaign=${campaignId}) por user ${user.id}.`,
    );

    return updated;
  }
}
