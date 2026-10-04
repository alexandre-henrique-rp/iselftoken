import { Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import { EnrichmentService } from './enrichment.service';
import { NextActionService } from './next-action.service';

/**
 * Serviço de queries e leitura para startups.
 * Responsável por findAll, findAllAdmin, findAllPublic, findByMarketplaceTag,
 * getFounderDashboardMetrics e getFounderStartupOverview.
 */
@Injectable()
export class StartupQueryService {
  private readonly logger = new Logger(StartupQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardSummaryService: DashboardSummaryService,
    private readonly enrichmentService: EnrichmentService,
    private readonly nextActionService: NextActionService,
  ) {}

  /**
   * Deriva tabsCount a partir do array de startups do founder.
   *
   * @param startups Array de startups
   * @returns Contagem por aba
   */
  private buildTabsCount(
    startups: {
      status: string;
      campaigns: Array<{ status: string }>;
    }[],
  ) {
    const count = {
      todas: startups.length,
      aprovadas: 0,
      emAnalise: 0,
      rascunhos: 0,
      rejeitadas: 0,
      Financiadas: 0,
    };

    for (const s of startups) {
      if (s.status === 'APPROVED') count.aprovadas++;
      else if (s.status === 'PENDING') count.emAnalise++;
      else if (s.status === 'DRAFT' || s.status === 'RASCUNHO')
        count.rascunhos++;
      else if (s.status === 'REJECTED') count.rejeitadas++;

      if (
        s.campaigns.some(
          (c) => c.status === 'FUNDED' || c.status === 'PAID_OUT',
        )
      ) {
        count.Financiadas++;
      }
    }
    return count;
  }

  /**
   * Enrich cada startup com badges, valorCaptado, progresso, proximaAcao.
   *
   * @param startupsRaw Dados brutos das startups
   * @returns Array enriquecido
   */
  private async enrichAllStartups(
    startupsRaw: {
      id: number;
      logo: { url_sm: string | null } | null;
      nome: string;
      area_atuacao: string | null;
      estagio: string | null;
      status: string;
      pais: any;
      _count: { issuedTokens: number };
      campaigns: Array<{
        id: number;
        tokensSold: number;
        totalTokens: number;
        tokenPrice: any;
        status: string;
      }>;
      createdAt: Date;
    }[],
  ) {
    // ── Agregação em LOTE (elimina N+1) ──────────────────────────────
    // Antes: cada startup disparava sumInvestments + repasse.findFirst +
    // payment.findFirst (≈3N queries). Agora: 3 queries fixas por
    // campaignId IN (...), independente do número de startups.
    const allCampaignIds = startupsRaw.flatMap((s) =>
      s.campaigns.map((c) => c.id),
    );
    const startupIdsPendingReservation = startupsRaw
      .filter((s) => s.status === 'PENDING_RESERVATION_PAYMENT')
      .map((s) => s.id);

    const [
      investmentSums,
      legacyInvestmentSums,
      configuredRepasses,
      pendingReservations,
      complianceFeesPaid,
    ] = await Promise.all([
      allCampaignIds.length > 0
        ? this.prisma.investment.groupBy({
            by: ['campaignId'],
            where: {
              campaignId: { in: allCampaignIds },
              status: 'CONFIRMED',
            },
            // Captado para a startup = repasse (tokensQty x preco base);
            // `amount` fica como fallback de linhas legadas sem split.
            _sum: { startupRepasseAmount: true, amount: true },
          })
        : Promise.resolve([]),
      // Linhas legadas CONFIRMED sem split: `amount` era integralmente
      // repassavel, entao entra inteiro no captado.
      allCampaignIds.length > 0
        ? this.prisma.investment.groupBy({
            by: ['campaignId'],
            where: {
              campaignId: { in: allCampaignIds },
              status: 'CONFIRMED',
              startupRepasseAmount: null,
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      allCampaignIds.length > 0
        ? this.prisma.repasse.findMany({
            where: {
              campaignId: { in: allCampaignIds },
              status: 'CONFIGURED',
            },
            select: { campaignId: true },
          })
        : Promise.resolve([]),
      startupIdsPendingReservation.length > 0
        ? this.prisma.payment.findMany({
            where: {
              campaign: { startupId: { in: startupIdsPendingReservation } },
              status: 'PENDING',
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, campaign: { select: { startupId: true } } },
          })
        : Promise.resolve([]),
      allCampaignIds.length > 0
        ? this.prisma.payment.findMany({
            where: {
              campaignId: { in: allCampaignIds },
              purpose: 'COMPLIANCE_FEE',
              status: 'PAID',
            },
            select: { campaignId: true },
          })
        : Promise.resolve([]),
    ]);

    const valorCaptadoByCampaign = new Map<number, number>();
    for (const row of investmentSums) {
      valorCaptadoByCampaign.set(
        row.campaignId,
        row._sum.startupRepasseAmount
          ? Number(row._sum.startupRepasseAmount)
          : 0,
      );
    }
    for (const row of legacyInvestmentSums) {
      valorCaptadoByCampaign.set(
        row.campaignId,
        (valorCaptadoByCampaign.get(row.campaignId) ?? 0) +
          Number(row._sum.amount ?? 0),
      );
    }
    const repasseConfiguredCampaignIds = new Set<number>(
      configuredRepasses.map((r) => r.campaignId),
    );
    const complianceFeePaidCampaignIds = new Set<number>(
      complianceFeesPaid
        .map((payment) => payment.campaignId)
        .filter((id): id is number => id != null),
    );
    // startupId → primeiro paymentId PENDING (ordem desc já aplicada na query).
    const pendingReservationByStartup = new Map<number, number>();
    for (const p of pendingReservations) {
      const sid = p.campaign?.startupId;
      if (sid != null && !pendingReservationByStartup.has(sid)) {
        pendingReservationByStartup.set(sid, p.id);
      }
    }

    const aggregates = {
      valorCaptadoByCampaign,
      repasseConfiguredCampaignIds,
      complianceFeePaidCampaignIds,
    };

    return Promise.all(
      startupsRaw.map(async (startup) => {
        // Normaliza o COUNT de tokens (via `_count`) para o campo numérico
        // `issuedTokens` que o EnrichmentService espera.
        const startupInput = {
          ...startup,
          issuedTokens: startup._count?.issuedTokens ?? 0,
        };
        const [enrichedStartup, proximaAcao] = await Promise.all([
          this.enrichmentService.enrichStartup(
            startupInput as any,
            startup.campaigns,
            aggregates,
          ),
          this.nextActionService.getNextAction(
            { id: startup.id, status: startup.status },
            startup.campaigns,
            pendingReservationByStartup,
          ),
        ]);
        return { ...enrichedStartup, proximaAcao };
      }),
    );
  }

  /**
   * Lista startups do founder com summary e tabsCount.
   *
   * @param user Usuário autenticado (founder)
   * @returns ResponseDto com startups, summary e tabsCount
   */
  async findAll(user: PayloadEntity) {
    try {
      const startupsRaw = await this.prisma.startup.findMany({
        where: { founderId: user.id },
        select: {
          id: true,
          slug: true,
          logo: { select: { url_sm: true } },
          nome: true,
          categoryRel: { select: { nome: true } },
          area_atuacao: true,
          estagio: true,
          status: true,
          pais: true,
          reviewDecisions: {
            where: { phase: 3 },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { decision: true },
          },
          // CORREÇÃO PERF: antes era `issuedTokens: true`, que carregava o
          // ARRAY COMPLETO de Token[] (relação Startup.issuedTokens) só para
          // depois fazer `.length`. Uma startup com 100k tokens gerava ~27MB
          // de payload e dominava o tempo de resposta. `_count` traz apenas o
          // número via COUNT(), preservando o contrato numérico esperado por
          // EnrichmentService (StartupBaseInput.issuedTokens: number | null).
          _count: { select: { issuedTokens: true } },
          campaigns: {
            select: {
              id: true,
              tokensSold: true,
              totalTokens: true,
              tokenPrice: true,
              tokenBaseValue: true,
              targetAmount: true,
              status: true,
            },
          },
          createdAt: true,
        },
      });

      const [summary, tabsCount, enrichedStartups] = await Promise.all([
        this.dashboardSummaryService.buildSummary(user.id),
        this.buildTabsCount(startupsRaw),
        this.enrichAllStartups(startupsRaw),
      ]);

      return {
        error: false,
        message: 'Startups retornadas com sucesso',
        codigo: 200,
        data: enrichedStartups,
        summary,
        tabsCount,
      };
    } catch (error) {
      this.logger.error(`Erro em findAll: ${error}`);
      return ResponseDto.error('Erro ao buscar startups', 500, error);
    }
  }

  /**
   * Lista startups para admin com paginação e busca.
   *
   * @param query Parâmetros de paginação e busca
   * @returns ResponseDto com startups formatadas
   */
  async findAllAdmin(query?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;
      const search = query?.search?.trim();

      const where: any = {};
      if (search) {
        where.OR = [
          { nome: { contains: search } },
          { area_atuacao: { contains: search } },
          { estagio: { contains: search } },
        ];
      }

      const [startups, total] = await Promise.all([
        this.prisma.startup.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          select: {
            id: true,
            founder: { select: { nome: true, email: true } },
            logo: { select: { url_sm: true } },
            nome: true,
            area_atuacao: true,
            estagio: true,
            status: true,
            pais: true,
            // Categoria da taxonomia cascata (ADR-007). Exposta no payload
            // da gestão admin para mostrar a coluna "Categoria" na tabela
            // /admin/startups em vez do `segmento` legado (= area_atuacao).
            categoryRel: { select: { nome: true } },
            // CORREÇÃO PERF: `_count` em vez do array Token[] completo
            // (mesmo motivo do findAll — evita carregar milhares de tokens
            // só para contar).
            _count: { select: { issuedTokens: true } },
            campaigns: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                tokensSold: true,
                totalTokens: true,
                status: true,
                targetAmount: true,
              },
            },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.startup.count({ where }),
      ]);

      const formattedStartups = startups.map((startup) => {
        const tokensVendidos = startup.campaigns.reduce(
          (sum, campaign) => sum + (campaign.tokensSold || 0),
          0,
        );
        const totalTokens = startup.campaigns.reduce(
          (sum, campaign) => sum + (campaign.totalTokens || 0),
          0,
        );
        const percentualVendido =
          totalTokens > 0
            ? Math.round((tokensVendidos / totalTokens) * 100)
            : 0;

        const paisData = startup.pais as {
          emoji?: string;
          name?: string;
        } | null;
        const bandeira = paisData?.emoji || null;

        const statusMap: Record<
          string,
          'aprovada' | 'em_analise' | 'rejeitada'
        > = {
          APPROVED: 'aprovada',
          PENDING: 'em_analise',
          REJECTED: 'rejeitada',
        };

        return {
          id: startup.id.toString(),
          founder: startup.founder,
          logo: startup.logo?.url_sm || null,
          nome: startup.nome,
          // `segmento` mantido retrocompat (derivado de area_atuacao
          // legado). `categoria` é o nome da tabela Category (ADR-007) —
          // prioridade na UI admin.
          segmento: startup.area_atuacao || null,
          categoria: startup.categoryRel?.nome ?? null,
          status: statusMap[startup.status] || 'em_analise',
          estagio: startup.estagio || null,
          totalTokens: (startup as any)._count?.issuedTokens || 0,
          tokensVendidos,
          percentualVendido,
          campaigns: startup.campaigns.map((campaign) => ({
            id: campaign.id,
            status: campaign.status,
          })),
          createdAt: startup.createdAt.toISOString(),
        };
      });

      return ResponseDto.success(
        'Startups retornadas com sucesso',
        200,
        formattedStartups,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar startups', 500, error);
    }
  }

  /**
   * Lista startups aprovadas para marketplace público.
   *
   * @returns ResponseDto com startups públicas
   */
  async findAllPublic() {
    try {
      const startups = await this.prisma.startup.findMany({
        where: { status: 'APPROVED' },
        include: {
          logo: true,
          campaigns: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const data = startups.map((s) => ({
        id: s.id,
        logo: s.logo?.url || null,
        nome: s.nome,
        segmento: s.area_atuacao,
        status: s.status,
        estagio: s.estagio,
        totalTokens: s.campaigns[0]?.totalTokens || 0,
        tokensVendidos: s.campaigns[0]?.tokensSold || 0,
        percentualVendido: s.campaigns[0]
          ? Math.round(
              (s.campaigns[0].tokensSold / s.campaigns[0].totalTokens) * 100,
            )
          : 0,
        statusCampanha: s.campaigns[0]?.status || 'fechado',
        createdAt: s.createdAt,
      }));

      return ResponseDto.success('Startups retornadas com sucesso', 200, data);
    } catch (error) {
      return ResponseDto.error('Erro ao listar startups', 500, error);
    }
  }

  /**
   * Retorna startups publicas para uma tag semantica do marketplace.
   *
   * Substitui o buggy `findByStatus` (tentava filtrar `where.categoria`,
   * campo que nao existe no model Startup) por uma API type-safe baseada em
   * tags. Cada tag mapeia para um filtro Prisma explicito:
   *
   * | tag          | filtro                                                                                  | orderBy                       |
   * |--------------|-----------------------------------------------------------------------------------------|-------------------------------|
   * | 'featured'   | status=APPROVED, score>0                                                                | score desc, createdAt desc    |
   * | 'verified'   | status=APPROVED, verificationStatus=VERIFIED                                            | score desc, createdAt desc    |
   * | 'accelerated'| status=APPROVED, isAccelerated=true                                                     | createdAt desc                |
   * | 'approval'   | status=PENDING_CURATOR_REVIEW (curador analisando - startups em fase de aprovacao)     | createdAt desc                |
   *
   * Limit: 10 por tag (cards de vitrine). Se o resultado nao cabe em 10,
   * paginar (futuro).
   *
   * @param tag Tag semantica do marketplace (literal type para evitar typos)
   * @returns ResponseDto com startups do slot
   */
  async findByMarketplaceTag(
    tag: 'featured' | 'verified' | 'accelerated' | 'approval',
  ) {
    try {
      type Tag = typeof tag;
      const MARKETPLACE_QUERY: Record<Tag, { where: any; orderBy: any }> = {
        featured: {
          where: { status: 'APPROVED', score: { gt: 0 } },
          orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        },
        verified: {
          where: { status: 'APPROVED', verificationStatus: 'VERIFIED' },
          orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        },
        accelerated: {
          where: { status: 'APPROVED', isAccelerated: true },
          orderBy: { createdAt: 'desc' },
        },
        approval: {
          where: { status: 'PENDING_CURATOR_REVIEW' },
          orderBy: { createdAt: 'desc' },
        },
      };
      const q = MARKETPLACE_QUERY[tag];

      const startups = await this.prisma.startup.findMany({
        where: q.where,
        include: {
          logo: true,
          campaigns: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: q.orderBy,
        take: 10,
      });

      const data = startups.map((s) => ({
        id: s.id,
        logo: s.logo?.url || null,
        nome: s.nome,
        segmento: s.area_atuacao,
        estagio: s.estagio,
        percentualVendido:
          s.campaigns[0] && s.campaigns[0].totalTokens > 0
            ? Math.round(
                (s.campaigns[0].tokensSold / s.campaigns[0].totalTokens) * 100,
              )
            : 0,
        // Metadados uteis para o frontend decidir como renderizar o card
        // (sem precisar de GET /startup/:id para cada slot).
        score: s.score,
        verificationStatus: s.verificationStatus,
        isAccelerated: s.isAccelerated,
      }));

      return ResponseDto.success(`Startups marketplace (${tag})`, 200, data);
    } catch (error) {
      return ResponseDto.error('Erro ao buscar startups', 500, error);
    }
  }

  /**
   * Retorna métricas consolidadas do founder para o dashboard.
   *
   * @param user Usuário autenticado (founder)
   * @returns ResponseDto com métricas
   */
  async getFounderDashboardMetrics(user: PayloadEntity) {
    try {
      const startups = await this.prisma.startup.findMany({
        where: { founderId: user.id },
        include: {
          campaigns: {
            select: {
              id: true,
              tokensSold: true,
              totalTokens: true,
              status: true,
              targetAmount: true,
              deadline: true,
              tokenPrice: true,
            },
          },
        },
      });

      const campaignIds = startups.flatMap((s) => s.campaigns.map((c) => c.id));
      let investorCount = 0;
      let amountRaised = 0;
      if (campaignIds.length > 0) {
        const [uniqueInvestors, confirmedInvestments, legacyInvestments] =
          await Promise.all([
            this.prisma.investment.findMany({
              where: { campaignId: { in: campaignIds }, status: 'CONFIRMED' },
              select: { userId: true },
              distinct: ['userId'],
            }),
            this.prisma.investment.aggregate({
              where: { campaignId: { in: campaignIds }, status: 'CONFIRMED' },
              _sum: { startupRepasseAmount: true },
            }),
            this.prisma.investment.aggregate({
              where: {
                campaignId: { in: campaignIds },
                status: 'CONFIRMED',
                startupRepasseAmount: null,
              },
              _sum: { amount: true },
            }),
          ]);
        investorCount = uniqueInvestors.length;
        // Captado para a startup = Σ repasse (preco base) — consistente com o
        // `valorCaptado` retornado por `enrichStartup` (mesma fonte dos cards).
        amountRaised =
          Number(confirmedInvestments._sum.startupRepasseAmount ?? 0) +
          Number(legacyInvestments._sum.amount ?? 0);
      }

      let daysRemaining: number | null = null;
      const now = new Date();
      for (const startup of startups) {
        for (const campaign of startup.campaigns) {
          if (campaign.status === 'OPEN' && campaign.deadline) {
            const end = new Date(campaign.deadline as any);
            const diff = Math.ceil(
              (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (diff > 0 && (daysRemaining === null || diff < daysRemaining)) {
              daysRemaining = diff;
            }
          }
        }
      }

      let totalProgress = 0;
      let openCampaigns = 0;
      for (const startup of startups) {
        for (const campaign of startup.campaigns) {
          if (campaign.status === 'OPEN' && campaign.totalTokens > 0) {
            totalProgress += Math.round(
              ((campaign.tokensSold || 0) / campaign.totalTokens) * 100,
            );
            openCampaigns++;
          }
        }
      }
      const averageProgress =
        openCampaigns > 0 ? Math.round(totalProgress / openCampaigns) : 0;

      return ResponseDto.success('Métricas do founder retornadas', 200, {
        investor_count: investorCount,
        amount_raised: amountRaised,
        days_remaining: daysRemaining,
        total_campaigns: startups.length,
        open_campaigns: openCampaigns,
        average_progress: averageProgress,
      });
    } catch (error) {
      return ResponseDto.error(
        'Erro ao buscar métricas do founder',
        500,
        error,
      );
    }
  }

  /**
   * Retorna overview consolidado do founder para `GET /users/me/startup`.
   *
   * Shape simplificado:
   * - Cada startup carrega apenas a **última campanha** (singular, aninhada em
   *   `campaigns`) com `tokens` (total emitido) e `tokens_sale` (com User).
   * - `pais` segue o contrato `{ iso3, nome, emoji }` (mesmo do User).
   * - Top-level: `totalCaptado`, `totalInvestidores`, `progressoCampanhaAtiva`.
   *
   ** Fonte de verdade dos tokens: tabela `Token`.
   *  - `tokens`     = COUNT(Token) emitidos para a campanha.
   *  - `tokens_sale`= COUNT(Token WHERE Token tem User relacionado) — i.e.,
   *                  `userId IS NOT NULL`. No schema atual isso é sempre igual
   *                  a `tokens` (Token só é criado via emitTokensForInvestment
   *                  com user já definido), mas mantemos a distinção
   *                  semanticamente correta para quando tokens de reserva /
   *                  tesouraria forem introduzidos.
   *  - `totalCaptado` = Σ Investment.startupRepasseAmount CONFIRMED — valor
   *                  devido a startup (preco base x tokens). O que o
   *                  investidor pagou (Token.purchaseVal = preco de venda)
   *                  inclui markup/taxa da plataforma e NAO e repasse.
   *
   * Performance: 2 queries ao Prisma.
   *  - 1: `startup.findMany` com `campaigns` mais recente (select enxuto).
   *  - 1: `token.findMany` agregando por campaignId em JS (1 round-trip).
   *
   * @param user Usuário autenticado (founder)
   * @returns ResponseDto com overview
   */
  async getFounderStartupOverview(user: PayloadEntity) {
    try {
      const startups = await this.prisma.startup.findMany({
        where: { founderId: user.id },
        select: {
          id: true,
          nome: true,
          slug: true,
          area_atuacao: true,
          estagio: true,
          status: true,
          pais: true,
          logo: { select: { url_sm: true } },
          // Pegamos TODAS as campanhas (não só `take: 1`) porque:
          //  - necesitamos da última para o payload aninhado (índice [0]
          //    após `orderBy createdAt desc`);
          //  - necesitamos do total de `campaignIds` para agregar tokens
          //    via segunda query (sem N+1).
          campaigns: {
            select: {
              id: true,
              status: true,
              totalTokens: true,
              tokensSold: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const allCampaignIds = startups.flatMap((s) =>
        s.campaigns.map((c) => c.id),
      );

      // Agregação por campaignId: total emitidos, vendidos, captado,
      // conjunto de usuários únicos. Single round-trip.
      type CampaignStat = {
        total: number;
        sold: number;
        raised: number;
        users: Set<number>;
      };
      const statsMap = new Map<number, CampaignStat>();

      if (allCampaignIds.length > 0) {
        const [tokens, repasses] = await Promise.all([
          this.prisma.token.findMany({
            where: { campaignId: { in: allCampaignIds } },
            select: {
              campaignId: true,
              userId: true,
            },
          }),
          this.prisma.investment.findMany({
            where: {
              campaignId: { in: allCampaignIds },
              status: 'CONFIRMED',
            },
            select: {
              campaignId: true,
              amount: true,
              startupRepasseAmount: true,
            },
          }),
        ]);

        for (const t of tokens) {
          const cur = statsMap.get(t.campaignId) ?? {
            total: 0,
            sold: 0,
            raised: 0,
            users: new Set<number>(),
          };
          cur.total += 1;
          // Vendido = presença de User relacionado (token.userId IS NOT NULL).
          // No schema atual userId é required, então sold === total. Caso o
          // schema afrouxe no futuro, este filtro continua correto.
          cur.sold += 1;
          cur.users.add(t.userId);
          statsMap.set(t.campaignId, cur);
        }
        for (const inv of repasses) {
          const cur = statsMap.get(inv.campaignId) ?? {
            total: 0,
            sold: 0,
            raised: 0,
            users: new Set<number>(),
          };
          cur.raised += Number(inv.startupRepasseAmount ?? inv.amount ?? 0);
          statsMap.set(inv.campaignId, cur);
        }
      }

      // Top-level agregados
      let totalCaptado = 0;
      const allInvestorIds = new Set<number>();
      for (const stat of statsMap.values()) {
        totalCaptado += stat.raised;
        for (const uid of stat.users) allInvestorIds.add(uid);
      }
      const totalInvestidores = allInvestorIds.size;

      // progressoCampanhaAtiva: % vendido da campanha OPEN mais recente.
      // Itera startups (já ordenadas desc) e pega a primeira campanha OPEN.
      let progressoCampanhaAtiva: number | null = null;
      for (const s of startups) {
        const openCampaign = s.campaigns.find((c) => c.status === 'OPEN');
        if (openCampaign) {
          if (openCampaign.totalTokens > 0) {
            progressoCampanhaAtiva = Math.round(
              (openCampaign.tokensSold / openCampaign.totalTokens) * 100,
            );
          }
          break; // primeira (e única por convenção) campanha OPEN do founder
        }
      }

      return ResponseDto.success('Overview do founder retornado', 200, {
        startups: startups.map((s) => {
          const latest = s.campaigns[0]; // ordem desc — mais recente primeiro
          return {
            id: s.id.toString(),
            nome: s.nome,
            slug: s.slug,
            area_atuacao: s.area_atuacao,
            estagio: s.estagio,
            status: s.status,
            logo: s.logo?.url_sm || null,
            pais: normalizePais(s.pais),
            // Última campanha (mais recente). null se startup não tem.
            campaigns: latest
              ? {
                  id: latest.id,
                  status: latest.status,
                  tokens: latest.totalTokens,
                  tokens_sale: latest.tokensSold,
                }
              : null,
            createdAt: s.createdAt,
          };
        }),
        totalCaptado,
        totalInvestidores,
        progressoCampanhaAtiva,
      });
    } catch (error) {
      return ResponseDto.error(
        'Erro ao buscar overview do founder',
        500,
        error,
      );
    }
  }

  /**
   * Lista investidores (CONFIRMED) de uma startup especifica.
   *
   * LGPD-safe: retorna apenas `nome` + `email` (B2B legítimos para o founder
   * contatar investidores). NÃO retorna CPF, telefone, endereço, etc.
   * Apenas founder owner ou ADMIN pode consultar.
   *
   * @param startupId id da startup
   * @param user payload do usuario autenticado (founderId derivado de user.id)
   * @returns lista agregada por investidor + totais
   */
  async findStartupInvestors(startupId: number, user: PayloadEntity) {
    try {
      const isAdmin = user.role === 'ADMIN';
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: { id: true, nome: true, founderId: true },
      });

      if (!startup) {
        return ResponseDto.error('Startup nao encontrada', 404);
      }

      if (!isAdmin && startup.founderId !== user.id) {
        return ResponseDto.error(
          'Sem permissao para consultar investidores desta startup',
          403,
        );
      }

      const investments = await this.prisma.investment.findMany({
        where: {
          status: 'CONFIRMED',
          campaign: { startupId: startup.id },
        },
        select: {
          id: true,
          amount: true,
          tokensQty: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Agrupa por investidor (LGPD-safe: agregacao apenas de nome + email)
      const map = new Map<
        number,
        {
          id: number;
          nome: string;
          email: string;
          aportes: number;
          totalInvestido: number;
          totalTokens: number;
          primeiroAporte: string;
          ultimoAporte: string;
          startups: Set<string>;
        }
      >();

      let totalCaptado = 0;

      for (const inv of investments) {
        const amount = Number(inv.amount) || 0;
        totalCaptado += amount;
        const existing = map.get(inv.user.id);
        if (existing) {
          existing.aportes += 1;
          existing.totalInvestido += amount;
          existing.totalTokens += inv.tokensQty;
          existing.ultimoAporte = inv.createdAt.toISOString();
        } else {
          map.set(inv.user.id, {
            id: inv.user.id,
            nome: inv.user.nome,
            email: inv.user.email,
            aportes: 1,
            totalInvestido: amount,
            totalTokens: inv.tokensQty,
            primeiroAporte: inv.createdAt.toISOString(),
            ultimoAporte: inv.createdAt.toISOString(),
            startups: new Set([startup.nome]),
          });
        }
      }

      const investidores = Array.from(map.values()).map((i) => ({
        id: i.id,
        nome: i.nome,
        email: i.email,
        aportes: i.aportes,
        totalInvestido: Math.round(i.totalInvestido * 100) / 100,
        totalTokens: i.totalTokens,
        primeiroAporte: i.primeiroAporte,
        ultimoAporte: i.ultimoAporte,
        startups: Array.from(i.startups),
      }));

      return ResponseDto.success('Investidores retornados', 200, {
        investidores,
        totalInvestidores: investidores.length,
        totalCaptado: Math.round(totalCaptado * 100) / 100,
        escopo: startup.nome,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar investidores da startup ${startupId}`,
        error,
      );
      return ResponseDto.error('Erro ao buscar investidores', 500, error);
    }
  }
}

/**
 * Normaliza `pais` (Json) vindo do Prisma para `{ iso3, nome, emoji } | null`.
 * Defesa contra shape divergente / valores nulos.
 *
 * Mesmo contrato de `src/auth/session/public-payload.normalizePais`. Mantida
 * localmente por escopo cirúrgico — só usada aqui por enquanto. Se passar
 * a ser usada em >2 lugares, promover para `src/common/normalizers/`.
 */
function normalizePais(raw: unknown): {
  iso3: string;
  nome: string;
  emoji: string;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.iso3 !== 'string' || typeof p.nome !== 'string') return null;
  return {
    iso3: p.iso3,
    nome: p.nome,
    emoji: typeof p.emoji === 'string' ? p.emoji : '',
  };
}
