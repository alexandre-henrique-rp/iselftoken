import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  CampaignStatus as CampaignStatusType,
  StartupCategory as StartupCategoryType,
  StartupStatus as StartupStatusType,
} from '@prisma/client';
import {
  CampaignStatus as PrismaCampaignStatus,
  StartupCategory as PrismaStartupCategory,
  StartupStatus as PrismaStartupStatus,
} from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import {
  MarketplaceCardDto,
  MarketplaceCardSealDto,
} from './dto/marketplace-card.dto';

const SEAL_CATEGORY_PRIORITY: Record<string, number> = {
  VERIFICATION: 0,
  ACHIEVEMENT: 1,
  STAGE: 2,
  PARTNERSHIP: 3,
  CUSTOM: 4,
};
const MAX_SEALS_PER_CARD = 5;

const FEATURED_LIMIT_KEY = 'marketplace.featured_limit';
const OPPORTUNITIES_LIMIT_KEY = 'marketplace.opportunities_limit';
const DEFAULT_FEATURED_LIMIT = 10;
const DEFAULT_OPPORTUNITIES_LIMIT = 16;
const VALID_CATEGORIES = new Set(Object.keys(PrismaStartupCategory));

const MARKETPLACE_SECTION_LIMIT = 15;
const MIN_SEALS_FOR_FEATURED = 4;
const SCORE_TOP_THRESHOLD = 98;
const SCORE_PRIORITY_THRESHOLD = 85;
const RECENT_WINDOW_DAYS = 20;
const PICKS_OF_WEEK_WINDOW_DAYS = 7;

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Top N startups elegíveis ordenadas por score DESC, createdAt DESC.
   * N = FinanceConfig[marketplace.featured_limit] (default 10).
   * Regras S0-T01 (marketplace.md):
   *   - Apenas startups com captacao ativa (campaign OPEN)
   *   - Apenas startups com > 4 selos ativos
   *   - Bloco elite (score > 98) vem ANTES do bloco prioridade (score 85-98)
   *   - Dentro de cada bloco > 85, ordem aleatoria ESTAVEL (seed diario)
   *   - Maximo 15 itens retornados
   * Regras S2-T04:
   *   - Pinned (manuallyPinned=true) aparecem PRIMEIRO, depois score desc
   */
  async getFeatured() {
    try {
      const limit = await this.getConfigInt(
        FEATURED_LIMIT_KEY,
        DEFAULT_FEATURED_LIMIT,
      );
      const poolSize = Math.max(limit, MARKETPLACE_SECTION_LIMIT);
      const startups = await this.queryEligible({
        orderBy: [
          { manuallyPinned: 'desc' },
          { score: 'desc' },
          { createdAt: 'desc' },
        ],
        take: poolSize,
      });
      const eligible = startups.filter(
        (s: any) =>
          Array.isArray(s.campaigns) &&
          s.campaigns.some(
            (c: any) => c.status === PrismaCampaignStatus.OPEN,
          ) &&
          this.countActiveSeals(s.seals) > MIN_SEALS_FOR_FEATURED,
      );
      const ordered = this.applyFeaturedOrdering(eligible);
      const capped = ordered.slice(0, MARKETPLACE_SECTION_LIMIT);
      const data = await this.hydrateCards(capped, true);
      return ResponseDto.success(
        'Startups em destaque retornadas com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getFeatured: ${error?.message ?? error}`);
      return ResponseDto.success(
        'Lista de destaque indisponível no momento',
        200,
        [],
      );
    }
  }

  /**
   * Últimas M startups elegíveis (createdAt DESC), excluindo IDs do Featured.
   * M = FinanceConfig[marketplace.recent_limit] (default 5).
   * Regras S0-T02 (marketplace.md):
   *   - Apenas campanhas OPEN criadas ha menos de 20 dias
   *   - Ordenar por count(selos ativos) DESC, createdAt DESC como tiebreaker
   *   - Maximo 15 itens
   */
  async getRecentlyAdded() {
    try {
      const startups = await this.queryRecentEligible();
      const data = await this.hydrateCards(
        startups.slice(0, MARKETPLACE_SECTION_LIMIT),
        false,
      );
      return ResponseDto.success(
        'Startups recém-adicionadas retornadas com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getRecentlyAdded: ${error?.message ?? error}`);
      return ResponseDto.success(
        'Lista de recém-adicionadas indisponível no momento',
        200,
        [],
      );
    }
  }

  /**
   * Mesmo conjunto de getRecentlyAdded, com campo `rank` incremental (1..N).
   * Usado pelo endpoint /marketplace/early-access/startups.
   */
  async getEarlyAccessStartups() {
    try {
      const startups = await this.queryRecentEligible();
      const capped = startups.slice(0, MARKETPLACE_SECTION_LIMIT);
      const cards = await this.hydrateCards(capped, false);
      const ranked = cards.map((card, idx) => ({
        rank: idx + 1,
        ...card,
      }));
      return ResponseDto.success(
        'Startups de acesso antecipado retornadas com sucesso',
        200,
        ranked,
      );
    } catch (error: any) {
      this.logger.error(
        `Erro getEarlyAccessStartups: ${error?.message ?? error}`,
      );
      return ResponseDto.success(
        'Lista de acesso antecipado indisponível no momento',
        200,
        [],
      );
    }
  }

  /**
   * Picks da Semana (S0-T03, marketplace.md):
   *   - Apenas campanhas OPEN criadas nos ultimos 7 dias
   *   - Ordenar por campaigns.createdAt ASC (captacao mais antiga primeiro)
   *   - Maximo 15 itens
   */
  async getPicksOfWeek() {
    try {
      const startups = await this.queryPicksOfWeekEligible();
      const data = await this.hydrateCards(
        startups.slice(0, MARKETPLACE_SECTION_LIMIT),
        false,
      );
      return ResponseDto.success(
        'Picks da semana retornados com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getPicksOfWeek: ${error?.message ?? error}`);
      return ResponseDto.success(
        'Picks da semana indisponíveis no momento',
        200,
        [],
      );
    }
  }

  /**
   * Todas as elegíveis − (Featured ∪ Recently-added), filtradas por categoria.
   * category=All (ou ausente) retorna tudo.
   * S0-T04: cap em MARKETPLACE_SECTION_LIMIT (15) independente de FinanceConfig.
   */
  async getOpportunities(category?: string) {
    try {
      const limit = await this.getConfigInt(
        OPPORTUNITIES_LIMIT_KEY,
        DEFAULT_OPPORTUNITIES_LIMIT,
      );
      const categoryFilter = this.parseCategory(category);

      const startups = await this.queryEligible({
        where: categoryFilter ? { category: categoryFilter } : undefined,
        orderBy: [{ score: 'desc' }, { nome: 'asc' }],
        take: Math.max(limit, MARKETPLACE_SECTION_LIMIT),
      });
      const data = await this.hydrateCards(
        startups.slice(0, MARKETPLACE_SECTION_LIMIT),
        false,
      );
      return ResponseDto.success(
        'Oportunidades retornadas com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getOpportunities: ${error?.message ?? error}`);
      return ResponseDto.success(
        'Lista de oportunidades indisponível no momento',
        200,
        [],
      );
    }
  }

  /**
   * Catálogo paginado e filtrável usado pelo StartupGrid em /home.
   * Aceita q (busca em nome/descrição), sector (categoria), sort
   * (trending|newest), velocity (today|ending), page e pageSize.
   * Sorts dependentes da campanha (raised/valuation/deadline) caem
   * no default por enquanto -- o frontend ainda pode reordenar a
   * página atual client-side.
   */
  async getAll(filters: {
    q?: string;
    sector?: string;
    sort?: string;
    velocity?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.min(60, Math.max(1, filters.pageSize ?? 16));
      const skip = (page - 1) * pageSize;

      const where: any = {
        status: PrismaStartupStatus.APPROVED as StartupStatusType,
        logo_id: { not: null },
        campaigns: {
          some: { status: PrismaCampaignStatus.OPEN as CampaignStatusType },
        },
      };

      if (filters.q && filters.q.trim()) {
        const q = filters.q.trim();
        where.OR = [{ nome: { contains: q } }, { descricao: { contains: q } }];
      }

      if (filters.sector && filters.sector.toLowerCase() !== 'all') {
        const cat = this.parseCategory(filters.sector);
        if (cat) where.category = cat;
      }

      if (filters.velocity === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.createdAt = { gte: today };
      }

      if (filters.velocity === 'ending') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 14);
        where.campaigns = {
          some: {
            status: PrismaCampaignStatus.OPEN as CampaignStatusType,
            deadline: { lte: cutoff },
          },
        };
      }

      const orderBy: any =
        filters.sort === 'newest'
          ? { createdAt: 'desc' }
          : [{ score: 'desc' }, { createdAt: 'desc' }];

      const [total, startups] = await Promise.all([
        this.prisma.startup.count({ where }),
        this.prisma.startup.findMany({
          where,
          include: {
            logo: true,
            cover: true,
            campaigns: {
              where: {
                status: PrismaCampaignStatus.OPEN as CampaignStatusType,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            seals: {
              where: { seal: { active: true } },
              include: { seal: true },
            },
          },
          orderBy,
          take: pageSize,
          skip,
        }),
      ]);

      const data = await this.hydrateCards(startups, false);

      return ResponseDto.success('Catálogo retornado com sucesso', 200, {
        data,
        total,
        page,
        pageSize,
        hasMore: skip + startups.length < total,
      });
    } catch (error: any) {
      this.logger.error(`Erro getAll: ${error?.message ?? error}`);
      return ResponseDto.success('Catálogo indisponível no momento', 200, {
        data: [],
        total: 0,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 16,
        hasMore: false,
      });
    }
  }

  /**
   * Top 3 picks ativos da curadoria, com a startup hidratada como
   * MarketplaceCardDto. Retorna picks com startup elegível mesmo que
   * essa não esteja em /featured -- aqui o critério é apenas "active".
   */
  async getCuratedPicks() {
    try {
      const picks = await this.prisma.curatedPick.findMany({
        where: { active: true },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        include: {
          startup: {
            include: {
              logo: true,
              cover: true,
              campaigns: {
                where: {
                  status: PrismaCampaignStatus.OPEN as CampaignStatusType,
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              seals: {
                where: { seal: { active: true } },
                include: { seal: true },
              },
            },
          },
        },
      });

      const startups = picks.map((p) => p.startup);
      const hydrated = await this.hydrateCards(startups, false);

      const data = picks.map((p, idx) => ({
        startupId: p.startupId,
        quote: p.quote,
        curatorName: p.curatorName,
        curatorRole: p.curatorRole,
        curatorAvatar: p.curatorAvatar,
        startup: hydrated[idx],
      }));

      return ResponseDto.success(
        'Curated picks retornados com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getCuratedPicks: ${error?.message ?? error}`);
      return ResponseDto.success('Curated picks indisponíveis', 200, []);
    }
  }

  /**
   * Contagem de startups elegíveis por categoria. Mesmo critério de
   * "elegível" usado pelas listagens (APPROVED com campanha OPEN).
   */
  async getSectorStats() {
    try {
      const rows = await this.prisma.startup.groupBy({
        by: ['category'],
        where: {
          status: PrismaStartupStatus.APPROVED as StartupStatusType,
          campaigns: {
            some: { status: PrismaCampaignStatus.OPEN as CampaignStatusType },
          },
        },
        _count: { _all: true },
      });

      const labelMap: Record<string, string> = {
        AI: 'Inteligência Artificial',
        FINTECH: 'FinTech',
        HEALTHTECH: 'HealthTech',
        SAAS: 'SaaS',
        EDTECH: 'EdTech',
        BIOTECH: 'BioTech',
        OTHER: 'Outras',
      };

      const data = rows
        .filter((r): r is typeof r & { category: string } =>
          Boolean(r.category),
        )
        .map((r) => ({
          group: r.category.toLowerCase(),
          name: labelMap[r.category] ?? r.category,
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count);

      return ResponseDto.success(
        'Estatísticas por setor retornadas com sucesso',
        200,
        data,
      );
    } catch (error: any) {
      this.logger.error(`Erro getSectorStats: ${error?.message ?? error}`);
      return ResponseDto.success(
        'Estatísticas por setor indisponíveis no momento',
        200,
        [],
      );
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async getFeaturedIds(): Promise<number[]> {
    const limit = await this.getConfigInt(
      FEATURED_LIMIT_KEY,
      DEFAULT_FEATURED_LIMIT,
    );
    const rows = await this.queryEligible({
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true },
    });
    return rows.map((r: { id: number }) => r.id);
  }

  private async queryEligible(args: {
    where?: any;
    orderBy?: any;
    take?: number;
    select?: any;
  }): Promise<any[]> {
    const baseWhere = {
      status: PrismaStartupStatus.APPROVED as StartupStatusType,
      logo_id: { not: null },
      OR: [{ area_atuacao: { not: null } }, { category: { not: null } }],
      campaigns: {
        some: { status: PrismaCampaignStatus.OPEN as CampaignStatusType },
      },
    };

    if (args.select) {
      return this.prisma.startup.findMany({
        where: { ...baseWhere, ...(args.where ?? {}) },
        orderBy: args.orderBy,
        take: args.take,
        select: args.select,
      });
    }

    return this.prisma.startup.findMany({
      where: { ...baseWhere, ...(args.where ?? {}) },
      include: {
        logo: true,
        cover: true,
        campaigns: {
          where: { status: PrismaCampaignStatus.OPEN as CampaignStatusType },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        seals: {
          where: { seal: { active: true } },
          include: { seal: true },
        },
      },
      orderBy: args.orderBy,
      take: args.take,
    });
  }

  /**
   * Query especifica para getRecentlyAdded / getEarlyAccessStartups:
   *   - campanhas OPEN criadas nos ultimos RECENT_WINDOW_DAYS dias
   *   - ordenacao: count(selos ativos) DESC, campaigns.createdAt DESC
   *   - pool grande (MARKETPLACE_SECTION_LIMIT * 2) para margem
   *   - pos-filtro defensivo para garantir regra de negocio (defense in depth)
   */
  private async queryRecentEligible(): Promise<any[]> {
    const cutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 86400000);
    const poolSize = MARKETPLACE_SECTION_LIMIT * 2;

    const rows = await this.prisma.startup.findMany({
      where: {
        status: PrismaStartupStatus.APPROVED as StartupStatusType,
        logo_id: { not: null },
        OR: [{ area_atuacao: { not: null } }, { category: { not: null } }],
        campaigns: {
          some: {
            status: PrismaCampaignStatus.OPEN as CampaignStatusType,
            createdAt: { gte: cutoff },
          },
        },
      },
      include: {
        logo: true,
        cover: true,
        campaigns: {
          where: {
            status: PrismaCampaignStatus.OPEN as CampaignStatusType,
            createdAt: { gte: cutoff },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        seals: {
          where: { seal: { active: true } },
          include: { seal: true },
        },
      },
      take: poolSize,
    });

    return rows
      .filter((s: any) => {
        const c = s.campaigns?.[0];
        if (!c) return false;
        if (c.status !== PrismaCampaignStatus.OPEN) return false;
        if (!(c.createdAt instanceof Date)) return false;
        return c.createdAt.getTime() >= cutoff.getTime();
      })
      .map((s: any) => ({
        row: s,
        sealCount: Array.isArray(s.seals)
          ? s.seals.filter((r: any) => r?.seal?.active === true).length
          : 0,
        campaignCreatedAt: s.campaigns?.[0]?.createdAt ?? null,
      }))
      .sort((a: any, b: any) => {
        if (b.sealCount !== a.sealCount) return b.sealCount - a.sealCount;
        const aT = a.campaignCreatedAt?.getTime?.() ?? 0;
        const bT = b.campaignCreatedAt?.getTime?.() ?? 0;
        return bT - aT;
      })
      .map((entry: any) => entry.row);
  }

  /**
   * Query especifica para getPicksOfWeek (S0-T03, marketplace.md):
   *   - campanhas OPEN criadas nos ultimos PICKS_OF_WEEK_WINDOW_DAYS dias
   *   - ordenacao: campaigns.createdAt ASC (captacao mais antiga primeiro)
   *   - pos-filtro defensivo (defense in depth)
   */
  private async queryPicksOfWeekEligible(): Promise<any[]> {
    const cutoff = new Date(Date.now() - PICKS_OF_WEEK_WINDOW_DAYS * 86400000);
    const poolSize = MARKETPLACE_SECTION_LIMIT * 2;

    const rows = await this.prisma.startup.findMany({
      where: {
        status: PrismaStartupStatus.APPROVED as StartupStatusType,
        logo_id: { not: null },
        OR: [{ area_atuacao: { not: null } }, { category: { not: null } }],
        campaigns: {
          some: {
            status: PrismaCampaignStatus.OPEN as CampaignStatusType,
            createdAt: { gte: cutoff },
          },
        },
      },
      include: {
        logo: true,
        cover: true,
        campaigns: {
          where: {
            status: PrismaCampaignStatus.OPEN as CampaignStatusType,
            createdAt: { gte: cutoff },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        seals: {
          where: { seal: { active: true } },
          include: { seal: true },
        },
      },
      take: poolSize,
    });

    return rows
      .filter((s: any) => {
        const c = s.campaigns?.[0];
        if (!c) return false;
        if (c.status !== PrismaCampaignStatus.OPEN) return false;
        if (!(c.createdAt instanceof Date)) return false;
        return c.createdAt.getTime() >= cutoff.getTime();
      })
      .sort((a: any, b: any) => {
        const aT = a.campaigns?.[0]?.createdAt?.getTime?.() ?? 0;
        const bT = b.campaigns?.[0]?.createdAt?.getTime?.() ?? 0;
        return aT - bT;
      });
  }

  private async mapToCardDto(
    s: any,
    includeScore: boolean,
    sparkline: number[],
  ): Promise<MarketplaceCardDto> {
    const campaign = s.campaigns?.[0];
    const tokensSold = campaign?.tokensSold ?? 0;
    const totalTokens = campaign?.totalTokens ?? 0;
    const tokenPrice = Number(campaign?.tokenPrice ?? 0);
    // Captado para a startup usa o preco BASE (repasse), nao o preco de
    // venda — tokenBaseValue ?? tokenPrice cobre campanhas legadas.
    const tokenBasePrice = Number(
      campaign?.tokenBaseValue ?? campaign?.tokenPrice ?? 0,
    );
    const targetAmount = Number(campaign?.targetAmount ?? 0);
    const valuation = Number(campaign?.valuation ?? 0);
    const [image, cover] = await Promise.all([
      this.s3.getPresignedImageUrl(s.logo?.url_sm ?? s.logo?.url),
      this.s3.getPresignedImageUrl(s.cover?.url),
    ]);

    const raisedNum = tokensSold * tokenBasePrice;
    const progress =
      targetAmount > 0
        ? Math.min(100, Math.round((raisedNum / targetAmount) * 100))
        : 0;
    const equityPct =
      totalTokens > 0 ? Math.round((tokensSold / totalTokens) * 1000) / 10 : 0;

    const deadline =
      campaign?.deadline instanceof Date
        ? campaign.deadline.toISOString()
        : (campaign?.deadline ?? null);

    const dto: MarketplaceCardDto = {
      id: s.id,
      slug: s.slug,
      name: s.nome,
      description: this.truncate(s.descricao ?? '', 140),
      image: image ?? '',
      cover,
      tags: [],
      category: s.category ?? this.inferCategoryFromAreaAtuacao(s.area_atuacao),
      equity: `${equityPct}%`,
      valuation: this.formatBRL(valuation),
      raised: this.formatBRL(raisedNum),
      goal: this.formatBRL(targetAmount),
      progress,
      seals: this.mapTopSeals(s.seals),
      deadline,
      sparkline7d: sparkline,
    };
    if (includeScore) dto.score = s.score;
    return dto;
  }

  /**
   * Para cada campanha em campaignIds, retorna um array [v0..v6] com a captação
   * diária dos últimos 7 dias normalizada por campanha (max -> 1.0, min -> 0).
   * Quando não há investimentos no período, devolve [0,0,0,0,0,0,0].
   * Posição 0 = 6 dias atrás (00:00), posição 6 = hoje.
   */
  private async computeSparklineMap(
    campaignIds: number[],
  ): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>();
    if (!campaignIds.length) return map;
    for (const id of campaignIds) map.set(id, [0, 0, 0, 0, 0, 0, 0]);

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);

    const investments = await this.prisma.investment.findMany({
      where: {
        campaignId: { in: campaignIds },
        createdAt: { gte: since },
      },
      select: { campaignId: true, amount: true, createdAt: true },
    });

    const dayMs = 86_400_000;
    for (const inv of investments) {
      const dayDiff = Math.floor(
        (inv.createdAt.getTime() - since.getTime()) / dayMs,
      );
      const idx = Math.max(0, Math.min(6, dayDiff));
      const arr = map.get(inv.campaignId);
      if (!arr) continue;
      arr[idx] += Number(inv.amount);
    }

    for (const [cid, arr] of map) {
      const max = Math.max(...arr);
      if (max > 0) {
        map.set(
          cid,
          arr.map((v) => Math.round((v / max) * 1000) / 1000),
        );
      }
    }
    return map;
  }

  private extractCampaignIds(startups: any[]): number[] {
    const ids: number[] = [];
    for (const s of startups) {
      const cid = s.campaigns?.[0]?.id;
      if (typeof cid === 'number') ids.push(cid);
    }
    return ids;
  }

  private async hydrateCards(
    startups: any[],
    includeScore: boolean,
  ): Promise<MarketplaceCardDto[]> {
    const sparkMap = await this.computeSparklineMap(
      this.extractCampaignIds(startups),
    );
    return Promise.all(
      startups.map((s) => {
        const cid = s.campaigns?.[0]?.id;
        const spark = (typeof cid === 'number' && sparkMap.get(cid)) || [
          0, 0, 0, 0, 0, 0, 0,
        ];
        return this.mapToCardDto(s, includeScore, spark);
      }),
    );
  }

  private mapTopSeals(rows: any[] | undefined): MarketplaceCardSealDto[] {
    if (!rows?.length) return [];
    return rows
      .map((r) => r.seal)
      .filter(Boolean)
      .sort(
        (a, b) =>
          (SEAL_CATEGORY_PRIORITY[a.category] ?? 99) -
          (SEAL_CATEGORY_PRIORITY[b.category] ?? 99),
      )
      .slice(0, MAX_SEALS_PER_CARD)
      .map((seal) => ({
        slug: seal.slug,
        name: seal.name,
        imagePath: seal.imagePath,
        category: seal.category,
      }));
  }

  private countActiveSeals(rows: any[] | undefined): number {
    if (!Array.isArray(rows)) return 0;
    return rows.filter((r) => r?.seal?.active === true).length;
  }

  /**
   * Ordenacao especifica para Rodadas em Destaque / Rodadas Quentes:
   *   1. Bloco elite (score > SCORE_TOP_THRESHOLD) — ordem aleatoria seeded
   *   2. Bloco prioridade (score entre SCORE_PRIORITY_THRESHOLD e SCORE_TOP_THRESHOLD) — aleatorio seeded
   *   3. Resto (score <= SCORE_PRIORITY_THRESHOLD) — score DESC, createdAt DESC
   */
  private applyFeaturedOrdering(startups: any[]): any[] {
    const seed = this.getDailySeed();
    const elite = startups.filter((s) => (s?.score ?? 0) > SCORE_TOP_THRESHOLD);
    const priority = startups.filter(
      (s) =>
        (s?.score ?? 0) > SCORE_PRIORITY_THRESHOLD &&
        (s?.score ?? 0) <= SCORE_TOP_THRESHOLD,
    );
    const rest = startups
      .filter((s) => (s?.score ?? 0) <= SCORE_PRIORITY_THRESHOLD)
      .sort(
        (a, b) =>
          (b?.score ?? 0) - (a?.score ?? 0) ||
          (b?.createdAt?.getTime?.() ?? 0) - (a?.createdAt?.getTime?.() ?? 0),
      );
    return [
      ...this.seededShuffle(elite, `${seed}:elite`),
      ...this.seededShuffle(priority, `${seed}:priority`),
      ...rest,
    ];
  }

  private getDailySeed(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private seededShuffle<T>(arr: T[], seed: string): T[] {
    const hash = createHash('sha256').update(seed).digest();
    let state = hash.readUInt32BE(0) || 1;
    const next = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0xffffffff;
    };
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private async getConfigInt(
    key: string,
    defaultValue: number,
  ): Promise<number> {
    try {
      const cfg = await this.prisma.financeConfig.findUnique({
        where: { key },
      });
      const parsed = parseInt(cfg?.value ?? '', 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private parseCategory(input?: string): StartupCategoryType | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
    const upper = trimmed.toUpperCase();
    if (VALID_CATEGORIES.has(upper)) {
      return upper as StartupCategoryType;
    }
    return undefined;
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
  }

  private formatBRL(n: number): string {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
    return `R$ ${n.toFixed(0)}`;
  }

  private inferCategoryFromAreaAtuacao(s: string | null | undefined): string {
    if (!s) return PrismaStartupCategory.OTHER;
    const lower = s.toLowerCase();
    if (lower.includes('fintech') || lower.includes('finance'))
      return PrismaStartupCategory.FINTECH;
    if (
      lower === 'ai' ||
      lower === 'ia' ||
      lower.includes(' ai ') ||
      lower.includes('intelig')
    )
      return PrismaStartupCategory.AI;
    if (lower.includes('saas') || lower.includes('software'))
      return PrismaStartupCategory.SAAS;
    if (
      lower.includes('health') ||
      lower.includes('saúde') ||
      lower.includes('saude') ||
      lower.includes('med')
    )
      return PrismaStartupCategory.HEALTHTECH;
    if (lower.includes('edu')) return PrismaStartupCategory.EDTECH;
    if (lower.includes('bio')) return PrismaStartupCategory.BIOTECH;
    return PrismaStartupCategory.OTHER;
  }
}
