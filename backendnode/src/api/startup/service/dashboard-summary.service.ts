import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Helper de data simples (date-fns nao disponivel no projeto).
 */
const subDays = (date: Date, days: number): Date =>
  new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

const toIsoDateKey = (date: Date): string => date.toISOString().split('T')[0];

export interface Captado30d {
  valor: number;
  variacaoPercent: number;
  sparkline: Array<{ date: string; valor: number }>;
}

export interface Restantes {
  diasAteProximoFechamento: number | null;
  dataFechamentoMaisProxima: string | null;
}

export interface CampanhasCount {
  abertas: number;
  total: number;
}

export interface DashboardSummary {
  captado30d: Captado30d;
  investidoresUnicos: number;
  progressoMedio: number;
  restantes: Restantes;
  campanhas: CampanhasCount;
}

@Injectable()
export class DashboardSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Soma de investments confirmados nos ultimos 30 dias (BRL REAIS).
   * Filtra via campaign.startup.founderId.
   */
  async getCaptado30d(founderId: number): Promise<Captado30d> {
    const now = new Date();
    const d30 = subDays(now, 30);
    const d60 = subDays(now, 60);

    // Captado = repasse devido a startup (startupRepasseAmount = tokensQty x
    // preco base). Linhas legadas sem split usam `amount` (era integralmente
    // repassavel). Duas agregacoes por dia + merge no sparkline.
    const sumByDay = (
      rows: Array<{ createdAt: Date; _sum: Record<string, unknown> }>,
      field: string,
    ) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        const key = toIsoDateKey(row.createdAt);
        map.set(key, (map.get(key) ?? 0) + Number(row._sum?.[field] ?? 0));
      }
      return map;
    };

    const [repasse30d, legacy30d, repasseAnteriores, legacyAnteriores] =
      await Promise.all([
        // Investments dos ultimos 30 dias (apenas CONFIRMED)
        this.prisma.investment.groupBy({
          by: ['createdAt'],
          where: {
            campaign: { startup: { founderId } },
            status: 'CONFIRMED',
            createdAt: { gte: d30, lte: now },
          },
          _sum: { startupRepasseAmount: true },
        }),
        this.prisma.investment.groupBy({
          by: ['createdAt'],
          where: {
            campaign: { startup: { founderId } },
            status: 'CONFIRMED',
            startupRepasseAmount: null,
            createdAt: { gte: d30, lte: now },
          },
          _sum: { amount: true },
        }),
        // Investments do periodo anterior (30-60 dias atras)
        this.prisma.investment.aggregate({
          where: {
            campaign: { startup: { founderId } },
            status: 'CONFIRMED',
            createdAt: { gte: d60, lt: d30 },
          },
          _sum: { startupRepasseAmount: true },
        }),
        this.prisma.investment.aggregate({
          where: {
            campaign: { startup: { founderId } },
            status: 'CONFIRMED',
            startupRepasseAmount: null,
            createdAt: { gte: d60, lt: d30 },
          },
          _sum: { amount: true },
        }),
      ]);

    const repasseByDay = sumByDay(repasse30d as any, 'startupRepasseAmount');
    const legacyByDay = sumByDay(legacy30d as any, 'amount');

    // Monta sparkline com 30 pontos diarios
    const sparkline = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(now, 29 - i);
      const dateKey = toIsoDateKey(date);
      return {
        date: dateKey,
        valor:
          (repasseByDay.get(dateKey) ?? 0) + (legacyByDay.get(dateKey) ?? 0),
      };
    });

    const valor = sparkline.reduce((sum, p) => sum + p.valor, 0);
    const valorAnterior =
      Number(repasseAnteriores._sum?.startupRepasseAmount ?? 0) +
      Number(legacyAnteriores._sum?.amount ?? 0);
    const variacaoPercent =
      valorAnterior > 0
        ? Math.round(((valor - valorAnterior) / valorAnterior) * 100)
        : 0;

    return { valor, variacaoPercent, sparkline };
  }

  /**
   * Contagem distinta de investidores (LGPD: retorna apenas number).
   */
  async getInvestidoresUnicos(founderId: number): Promise<number> {
    const result = await this.prisma.investment.findMany({
      where: { campaign: { startup: { founderId } }, status: 'CONFIRMED' },
      distinct: ['userId'],
      select: { userId: true },
    });
    return result.length;
  }

  /**
   * Percentual medio de progresso das campanhas abertas.
   *
   * Aceita `openCampaignsFetched` (campanhas OPEN já carregadas) para evitar
   * uma query dedicada. Sem ela, faz o findMany legado.
   */
  async getProgressoMedio(
    founderId: number,
    openCampaignsFetched?: Array<{ tokensSold: number; totalTokens: number }>,
  ): Promise<number> {
    const campaigns =
      openCampaignsFetched ??
      (await this.prisma.campaign.findMany({
        where: { startup: { founderId }, status: 'OPEN' },
        select: { tokensSold: true, totalTokens: true },
      }));
    if (campaigns.length === 0) return 0;
    const totalSold = campaigns.reduce((s, c) => s + (c.tokensSold || 0), 0);
    const totalTokens = campaigns.reduce((s, c) => s + (c.totalTokens || 0), 0);
    if (totalTokens === 0) return 0;
    return Math.round((totalSold / totalTokens) * 100);
  }

  /**
   * Proxima data de fechamento entre campanhas OPEN.
   *
   * Aceita `campaignsFetched` (campanhas do founder com status+deadline já
   * carregadas) para derivar em memória. Sem ela, faz o findFirst legado.
   */
  async getRestantes(
    founderId: number,
    campaignsFetched?: Array<{ status: string; deadline: Date | null }>,
  ): Promise<Restantes> {
    let deadline: Date | null = null;
    if (campaignsFetched) {
      const nowMs = Date.now();
      for (const c of campaignsFetched) {
        if (
          c.status === 'OPEN' &&
          c.deadline &&
          c.deadline.getTime() >= nowMs
        ) {
          if (!deadline || c.deadline.getTime() < deadline.getTime()) {
            deadline = c.deadline;
          }
        }
      }
    } else {
      const next = await this.prisma.campaign.findFirst({
        where: {
          startup: { founderId },
          status: 'OPEN',
          deadline: { gte: new Date() },
        },
        orderBy: { deadline: 'asc' },
        select: { deadline: true },
      });
      deadline = next?.deadline ?? null;
    }
    if (!deadline) {
      return {
        diasAteProximoFechamento: null,
        dataFechamentoMaisProxima: null,
      };
    }
    const ms = deadline.getTime() - Date.now();
    const dias = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return {
      diasAteProximoFechamento: dias,
      dataFechamentoMaisProxima: toIsoDateKey(deadline),
    };
  }

  /**
   * Count de campanhas: abertas + total.
   *
   * Aceita `campaignsFetched` (lista de campanhas do founder já carregada por
   * `buildSummary`) para evitar 2 queries `count`. Sem ela, cai no caminho
   * legado (2 counts) — preservado para chamadas unitárias/spec.
   */
  async getCampanhasCount(
    founderId: number,
    campaignsFetched?: Array<{ status: string }>,
  ): Promise<CampanhasCount> {
    if (campaignsFetched) {
      const abertas = campaignsFetched.filter(
        (c) => c.status === 'OPEN',
      ).length;
      return { abertas, total: campaignsFetched.length };
    }
    const [abertas, total] = await Promise.all([
      this.prisma.campaign.count({
        where: { startup: { founderId }, status: 'OPEN' },
      }),
      this.prisma.campaign.count({
        where: { startup: { founderId } },
      }),
    ]);
    return { abertas, total };
  }

  /**
   * Orquestrador que consolida o summary do dashboard do founder.
   *
   * OTIMIZAÇÃO: carrega as campanhas do founder UMA vez e deriva
   * `progressoMedio`, `restantes` e `campanhas` em memória — antes eram 4
   * queries (1 findMany + 1 findFirst + 2 counts). `captado30d` e
   * `investidoresUnicos` continuam como queries próprias (agregações sobre
   * Investment que não derivam da lista de campanhas).
   */
  async buildSummary(founderId: number): Promise<DashboardSummary> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { startup: { founderId } },
      select: {
        status: true,
        deadline: true,
        tokensSold: true,
        totalTokens: true,
      },
    });
    const openCampaigns = campaigns.filter((c) => c.status === 'OPEN');

    const [captado30d, investidoresUnicos] = await Promise.all([
      this.getCaptado30d(founderId),
      this.getInvestidoresUnicos(founderId),
    ]);

    const progressoMedio = await this.getProgressoMedio(
      founderId,
      openCampaigns,
    );
    const restantes = await this.getRestantes(founderId, campaigns);
    const campanhas = await this.getCampanhasCount(founderId, campaigns);

    return {
      captado30d,
      investidoresUnicos,
      progressoMedio,
      restantes,
      campanhas,
    };
  }
}
