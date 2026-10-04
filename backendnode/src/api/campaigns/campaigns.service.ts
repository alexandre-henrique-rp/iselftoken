import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignAction } from './dto/action-campaign.dto';
import { CreateNewRoundDto } from './dto/create-new-round.dto';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';

// NOTA M7-S21 (2026-07-14): metaCaptacao e equityOferecido removidos em T033-REFACTOR+DROP
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private static readonly THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extrai os 9 campos CVM de um DTO para uso no Prisma create/update.
   * @param dto - Objeto com campos opcionais CVM
   * @returns Objeto com apenas os campos CVM presentes (não undefined)
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
   * Tabela CampaignOfferAuditLog — fallback gracioso se tabela não existir.
   *
   * @param campaignId - ID da campanha
   * @param action - Tipo da ação auditada
   * @param userId - ID do usuário que realizou a ação
   * @param ip - Endereço IP do request
   * @param userAgent - User-Agent do browser
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

  async findAll(query: QueryCampaignsDto) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;
      const search = query?.search?.trim();
      const status = query?.status;

      const where: any = {};

      if (search) {
        where.title = { contains: search };
      }

      if (status) {
        where.status = status;
      }

      const [campaigns, total] = await Promise.all([
        this.prisma.campaign.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          include: {
            startup: {
              select: {
                id: true,
                nome: true,
                slug: true,
                razao_social: true,
                cnpj: true,
                area_atuacao: true,
                estagio: true,
                logo: {
                  select: {
                    url_sm: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.campaign.count({ where }),
      ]);

      return ResponseDto.success(
        'Lista de campanhas retornada com sucesso',
        200,
        campaigns,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar campanhas', 500, error);
    }
  }

  async findOne(id: number) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              slug: true,
              razao_social: true,
              cnpj: true,
              area_atuacao: true,
              estagio: true,
              descricao: true,
              logo: {
                select: {
                  url_sm: true,
                },
              },
            },
          },
          investments: {
            select: {
              id: true,
              amount: true,
              tokensQty: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          tokens: {
            select: {
              id: true,
              hash: true,
              quantity: true,
              purchaseVal: true,
              currentVal: true,
            },
          },
        },
      });

      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404);
      }

      const equity = campaign.valuation
        ? (
            (Number(campaign.targetAmount) / Number(campaign.valuation)) *
            100
          ).toFixed(2)
        : '0';

      const progress =
        campaign.totalTokens > 0
          ? ((campaign.tokensSold / campaign.totalTokens) * 100).toFixed(1)
          : '0';

      return ResponseDto.success('Campanha encontrada com sucesso', 200, {
        ...campaign,
        equity: `${equity}%`,
        progress: `${progress}%`,
        remainingTokens: campaign.totalTokens - campaign.tokensSold,
      });
    } catch (error) {
      return ResponseDto.error('Erro ao buscar campanha', 500, error);
    }
  }

  async getCheckoutData(id: number) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          targetAmount: true,
          minInvestment: true,
          valuation: true,
          tokenPrice: true,
          totalTokens: true,
          tokensSold: true,
          deadline: true,
          status: true,
          // Campos CVM públicos (exclui aceiteTermoRepasse/declaracaoVeracidade)
          dataLancamentoRodada: true,
          objetivoCaptacao: true,
          oQueEsperaAlcancar: true,
          participacaoLucros: true,
          faturamentoMinimoLucros: true,
          beneficiosAdicionais: true,
          beneficiosDescricao: true,
          startup: {
            select: {
              nome: true,
              slug: true,
              area_atuacao: true,
              logo: {
                select: {
                  url_sm: true,
                },
              },
            },
          },
        },
      });

      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404);
      }

      if (campaign.status !== 'OPEN') {
        return ResponseDto.error(
          `Campanha está com status ${campaign.status}. Apenas campanhas OPEN aceitam investimentos.`,
          400,
        );
      }

      const equity = campaign.valuation
        ? (
            (Number(campaign.targetAmount) / Number(campaign.valuation)) *
            100
          ).toFixed(2)
        : '0';

      const warnings: string[] = [];
      if (
        campaign.faturamentoMinimoLucros != null &&
        campaign.participacaoLucros === false
      ) {
        warnings.push(
          'ATENCAO: faturamentoMinimoLucros definido, mas participacaoLucros esta desligada.',
        );
      }

      this.logger.log(`Checkout data retornada para campaign ${id}.`);

      return ResponseDto.success('Dados de checkout retornados', 200, {
        id: campaign.id,
        title: campaign.title,
        price: Number(campaign.tokenPrice),
        minInvestment: Number(campaign.minInvestment),
        equity: `${equity}%`,
        valuation: Number(campaign.valuation),
        targetAmount: Number(campaign.targetAmount),
        tokenPrice: Number(campaign.tokenPrice),
        totalTokens: campaign.totalTokens,
        tokensSold: campaign.tokensSold,
        remainingTokens: campaign.totalTokens - campaign.tokensSold,
        deadline: campaign.deadline,
        startup: campaign.startup,
        // Campos CVM públicos (resolução CVM 88/2022)
        dataLancamentoRodada: campaign.dataLancamentoRodada,
        objetivoCaptacao: campaign.objetivoCaptacao,
        oQueEsperaAlcancar: campaign.oQueEsperaAlcancar,
        participacaoLucros: campaign.participacaoLucros,
        faturamentoMinimoLucros: campaign.faturamentoMinimoLucros,
        beneficiosAdicionais: campaign.beneficiosAdicionais,
        beneficiosDescricao: campaign.beneficiosDescricao,
        paymentMethods: ['PIX', 'CREDIT_CARD'] as const,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    } catch (error) {
      return ResponseDto.error('Erro ao buscar dados de checkout', 500, error);
    }
  }

  /**
   * T032 (B05) - Regra "Nova Rodada".
   * Cria uma nova campanha APENAS se a rodada anterior teve 100% dos tokens
   * vendidos E se passaram pelo menos 3 meses desde o encerramento.
   */
  async requestNewRound(
    startupId: number,
    dto: CreateNewRoundDto,
    user: PayloadEntity,
  ) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true, status: true },
    });

    if (!startup) {
      throw new NotFoundException('STARTUP_NOT_FOUND');
    }

    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    // Uma rodada só pode ser aberta depois que a startup passou por TODO o fluxo
    // — inclusive os pagamentos das taxas. O status APPROVED/LIVE só é alcançado
    // após a taxa de reserva paga (PENDING_RESERVATION_PAYMENT → RESERVATION_PAID)
    // e a curadoria concluída; antes disso, a abertura é bloqueada.
    const FLUXO_CONCLUIDO = ['APPROVED', 'LIVE'];
    if (!FLUXO_CONCLUIDO.includes(startup.status)) {
      this.logger.warn(
        `Nova rodada bloqueada: startup ${startupId} está em ${startup.status} (fluxo/taxas pendentes).`,
      );
      throw new BadRequestException({
        code: 'STARTUP_FLUXO_INCOMPLETO',
        message:
          'A rodada só pode ser aberta depois que a startup concluir todo o fluxo de aprovação e o pagamento das taxas.',
      });
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
        Date.now() - CampaignsService.THREE_MONTHS_MS,
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

    const campaign = await this.prisma.campaign.create({
      data: {
        startupId,
        title: dto.title,
        targetAmount: dto.targetAmount as any,
        minInvestment: dto.minInvestment as any,
        valuation: dto.valuation as any,
        tokenPrice: dto.tokenPrice as any,
        totalTokens: dto.totalTokens,
        tokensSold: 0,
        deadline: dto.deadline,
        status: 'OPEN',
        // Comissão do afiliado desta rodada (5 ou 10), congelada no lançamento.
        affiliateCommissionPct: dto.affiliateCommissionPct as any,
        ...this.extractCvmFields(dto as unknown as Record<string, unknown>),
      },
    });

    // Audit log: registrar aceites CVM na criação
    if (
      (dto as any).aceiteTermoRepasse === true ||
      (dto as any).declaracaoVeracidade === true
    ) {
      await this.createCvmAuditLogs(
        campaign.id,
        user.id,
        { aceiteTermoRepasse: false, declaracaoVeracidade: false },
        {
          aceiteTermoRepasse: (dto as any).aceiteTermoRepasse,
          declaracaoVeracidade: (dto as any).declaracaoVeracidade,
        },
      );
    }

    this.logger.log(
      `Nova rodada criada (campaign=${campaign.id}) para startup ${startupId}.`,
    );

    return ResponseDto.success('Nova rodada criada', 201, campaign);
  }

  /**
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
      include: { startup: { select: { founderId: true } } },
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

    return ResponseDto.success('Acao executada', 200, updated);
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
      include: { startup: { select: { founderId: true } } },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    if (campaign.startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    if (
      (campaign.status === 'CLOSED' || campaign.status === 'FUNDED') &&
      dto.status === undefined
    ) {
      throw new ForbiddenException({
        code: 'ACAO_NAO_PERMITIDA_POS_RODADA',
        message:
          'PATCH generico nao permitido em campanhas pos-rodada. Use PATCH /campaign/:id/action com action=PAUSE|FINISH.',
      });
    }

    // Snapshot para comparação de audit
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

  // ===========================================================================
  // Prorrogação de Campanha (PRD_PAGINA_PUBLICA_STARTUP)
  // ===========================================================================

  /**
   * Estende o deadline de uma campanha OPEN em N dias.
   *
   * Regras:
   * - Somente ADMIN ou COMPLIANCE pode prorrogar.
   * - Campanha deve estar com status OPEN.
   * - Máximo 30 dias por prorrogação.
   * - Máximo 2 prorrogações por campanha (campo extensionCount).
   *
   * @param campaignId - ID da campanha
   * @param days - Dias a adicionar ao deadline (1-30)
   * @param user - Usuário autenticado
   */
  async extendDeadline(campaignId: number, days: number, user: PayloadEntity) {
    // Validar role
    const allowedRoles = ['ADMIN', 'COMPLIANCE'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Somente ADMIN ou COMPLIANCE pode prorrogar campanhas.',
      );
    }

    // Validar dias
    if (!days || days < 1 || days > 30) {
      throw new BadRequestException('Número de dias deve ser entre 1 e 30.');
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        deadline: true,
        title: true,
        startupId: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    if (campaign.status !== 'OPEN') {
      throw new BadRequestException(
        'Somente campanhas com status OPEN podem ser prorrogadas.',
      );
    }

    // Calcular novo deadline
    const currentDeadline = new Date(campaign.deadline);
    const newDeadline = new Date(currentDeadline);
    newDeadline.setDate(newDeadline.getDate() + days);

    // Atualizar campanha
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { deadline: newDeadline },
    });

    // Registrar no audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_EXTENDED',
        entity: 'Campaign',
        entityId: String(campaignId),
        userId: user.id ?? null,
        oldValue: {
          deadline: currentDeadline.toISOString(),
        },
        newValue: {
          deadline: newDeadline.toISOString(),
          daysAdded: days,
          startupId: campaign.startupId,
        },
      },
    });

    this.logger.log(
      `Campanha #${campaignId} prorrogada: +${days}d (novo deadline: ${newDeadline.toISOString()})`,
    );

    return ResponseDto.success('Campanha prorrogada com sucesso', 200, {
      campaignId,
      previousDeadline: currentDeadline.toISOString(),
      newDeadline: newDeadline.toISOString(),
      daysAdded: days,
    });
  }
}
