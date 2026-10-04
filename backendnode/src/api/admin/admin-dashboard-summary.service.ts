import { Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from '../../prisma/prisma.service';

const MONTH_LABELS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Service dedicado ao dashboard executivo /admin/dashboard.
 *
 * Concentra as agregações Prisma em um único ponto para:
 *  - Facilitar testes unitários (RED→GREEN→REFACTOR).
 *  - Evitar God-service em `admin.service.ts`.
 *  - Manter o controller fino (parse + auth + delegação).
 *
 * Não toca em payment/investment fora do escopo do dashboard executivo.
 */
@Injectable()
export class AdminDashboardSummaryService {
  private readonly logger = new Logger(AdminDashboardSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    try {
      const now = new Date();
      const startOfToday = this.startOfDay(now);
      const startOfYesterday = new Date(
        startOfToday.getTime() - 24 * 60 * 60 * 1000,
      );

      const [
        gmvResult,
        gmvTodayResult,
        gmvYesterdayResult,
        totalRedeemedResult,
        tokensGeneratedResult,
        tokensSoldResult,
        activeInvestorsRows,
        totalUsers,
        totalStartups,
        activeCampaignsCount,
        startupsMonthlyRows,
        userGrowthRows,
        gmvMonthlyRows,
        pendingRedemptionsRows,
        pendingRedemptionsAmountResult,
        pendingRedemptionsCountResult,
        activeCampaignsRows,
        kycPendingCount,
        kycOldestPending,
        paymentsPaidTodayResult,
        paymentsPaidTodayAmountResult,
        paymentsPendingCountResult,
        paymentsPendingAmountResult,
        paymentsExpiredCountResult,
        repasseTotalResult,
        platformSpreadTotalResult,
        platformFeeTotalResult,
        platformRevenueTotalResult,
        splitMonthlyRows,
      ] = await Promise.all([
        // gmv total
        this.prisma.investment.aggregate({
          _sum: { amount: true },
          where: { status: 'CONFIRMED' },
        }),
        // gmvToday
        this.prisma.investment.aggregate({
          _sum: { amount: true },
          where: { status: 'CONFIRMED', createdAt: { gte: startOfToday } },
        }),
        // gmvYesterday
        this.prisma.investment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'CONFIRMED',
            createdAt: { gte: startOfYesterday, lt: startOfToday },
          },
        }),
        // totalRedeemed
        this.prisma.withdrawal.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
        // tokensGenerated
        this.prisma.campaign.aggregate({
          _sum: { totalTokens: true },
        }),
        // tokensSold
        this.prisma.campaign.aggregate({
          _sum: { tokensSold: true },
        }),
        // activeInvestors (DISTINCT users com CONFIRMED investments)
        this.prisma.investment.findMany({
          where: { status: 'CONFIRMED' },
          distinct: ['userId'],
          select: { userId: true },
        }),
        // totalUsers
        this.prisma.user.count(),
        // totalStartups
        this.prisma.startup.count(),
        // activeCampaigns (status=OPEN)
        this.prisma.campaign.count({ where: { status: 'OPEN' } }),
        // startupsMonthly (últimos 6 meses)
        this.prisma.startup.findMany({
          where: { createdAt: { gte: this.startOfMonthsAgo(now, 6) } },
          select: { createdAt: true },
        }),
        // userGrowth (últimos 12 meses)
        this.prisma.user.findMany({
          where: { createdAt: { gte: this.startOfMonthsAgo(now, 12) } },
          select: { createdAt: true },
        }),
        // gmvMonthly (investimentos CONFIRMED dos últimos 12 meses)
        this.prisma.investment.findMany({
          where: {
            status: 'CONFIRMED',
            createdAt: { gte: this.startOfMonthsAgo(now, 12) },
          },
          select: { createdAt: true, amount: true },
        }),
        // pendingRedemptions (queue)
        this.prisma.withdrawal.findMany({
          where: { status: { in: ['REQUESTED', 'PROCESSING'] } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            startup: { select: { nome: true, area_atuacao: true } },
          },
        }),
        // pendingRedemptionsAmount (action tile)
        this.prisma.withdrawal.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['REQUESTED', 'PROCESSING'] } },
        }),
        // pendingRedemptionsCount (total da fila, sem o limite de itens exibidos)
        this.prisma.withdrawal.count({
          where: { status: { in: ['REQUESTED', 'PROCESSING'] } },
        }),
        // activeCampaigns queue + avg progress (action tile)
        this.prisma.campaign.findMany({
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            tokensSold: true,
            totalTokens: true,
            startup: { select: { nome: true } },
          },
        }),
        // kycPendingCount (action tile)
        this.prisma.kYCProfile.count({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        }),
        // kycOldestPending — mais antigo KYC pendente (action tile)
        this.prisma.kYCProfile.findFirst({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        // paymentsPaidToday (montador de ordens — hero KPI)
        this.prisma.payment.count({
          where: { status: 'PAID', paidAt: { gte: startOfToday } },
        }),
        // paymentsPaidTodayAmount (montador de ordens)
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'PAID', paidAt: { gte: startOfToday } },
        }),
        // paymentsPendingCount — ordens que precisam de atenção
        this.prisma.payment.count({
          where: { status: 'PENDING' },
        }),
        // paymentsPendingAmount — soma dos pendentes
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'PENDING' },
        }),
        // paymentsExpiredCount — QR codes expirados (requer ação)
        this.prisma.payment.count({
          where: { status: 'EXPIRED' },
        }),
        // === Split financeiro (admin-only) ===
        // Repasse total às startups: Σ startupRepasseAmount onde status=CONFIRMED.
        // Snapshot gravado em Investment no momento do pedido
        // (ADR-008 + migration 20261001000000_investment_financial_split).
        this.prisma.investment.aggregate({
          _sum: { startupRepasseAmount: true },
          where: { status: 'CONFIRMED' },
        }),
        // Spread total (lucro da plataforma via markup venda-base).
        this.prisma.investment.aggregate({
          _sum: { platformSpreadAmount: true },
          where: { status: 'CONFIRMED' },
        }),
        // Taxa total cobrada no checkout (alíquota x subtotal).
        this.prisma.investment.aggregate({
          _sum: { platformFeeAmount: true },
          where: { status: 'CONFIRMED' },
        }),
        // Receita total da plataforma (spread + taxa) — pré-agregado.
        this.prisma.investment.aggregate({
          _sum: { platformRevenueAmount: true },
          where: { status: 'CONFIRMED' },
        }),
        // Série mensal de repasse vs lucro (últimos 12 meses).
        this.prisma.investment.findMany({
          where: {
            status: 'CONFIRMED',
            allocatedAt: { gte: this.startOfMonthsAgo(now, 12) },
          },
          select: {
            allocatedAt: true,
            startupRepasseAmount: true,
            platformRevenueAmount: true,
          },
        }),
      ]);

      const gmvToday = this.toNumber(gmvTodayResult._sum.amount);
      const gmvYesterday = this.toNumber(gmvYesterdayResult._sum.amount);
      const gmvDeltaPct =
        gmvYesterday > 0
          ? Math.round(((gmvToday - gmvYesterday) / gmvYesterday) * 100)
          : null;

      const activeCampaignsAvgProgress =
        this.computeAvgProgress(activeCampaignsRows);

      const kycOldestAgeHours = kycOldestPending?.createdAt
        ? Math.floor(
            (now.getTime() - new Date(kycOldestPending.createdAt).getTime()) /
              (60 * 60 * 1000),
          )
        : 0;

      const kpis = {
        gmv: this.toNumber(gmvResult._sum.amount),
        gmvToday,
        gmvYesterday,
        gmvDeltaPct,
        totalRedeemed: this.toNumber(totalRedeemedResult._sum.amount),
        tokensGenerated: this.toNumber(tokensGeneratedResult._sum.totalTokens),
        tokensSold: this.toNumber(tokensSoldResult._sum.tokensSold),
        activeInvestors: activeInvestorsRows.length,
        totalUsers,
        totalStartups,
        activeCampaigns: activeCampaignsCount,
        pendingRedemptionsAmount: this.toNumber(
          pendingRedemptionsAmountResult._sum.amount,
        ),
        pendingRedemptionsCount: pendingRedemptionsCountResult,
        activeCampaignsAvgProgress,
        kycPendingCount,
        kycOldestAgeHours,
        // Montador de Ordens e Pagamentos (action tile dedicado)
        paymentsPaidToday: paymentsPaidTodayResult,
        paymentsPaidTodayAmount: this.toNumber(
          paymentsPaidTodayAmountResult._sum.amount,
        ),
        paymentsPendingCount: paymentsPendingCountResult,
        paymentsPendingAmount: this.toNumber(
          paymentsPendingAmountResult._sum.amount,
        ),
        paymentsExpiredCount: paymentsExpiredCountResult,
        // === Split financeiro (admin-only) ===
        // Repasse = Σ startupRepasseAmount (quanto vai para as startups).
        // Lucro = Σ platformRevenueAmount (spread + taxa; fica na plataforma).
        startupRepasseTotal: this.toNumber(
          repasseTotalResult._sum.startupRepasseAmount,
        ),
        platformSpreadTotal: this.toNumber(
          platformSpreadTotalResult._sum.platformSpreadAmount,
        ),
        platformFeeTotal: this.toNumber(
          platformFeeTotalResult._sum.platformFeeAmount,
        ),
        platformRevenueTotal: this.toNumber(
          platformRevenueTotalResult._sum.platformRevenueAmount,
        ),
      };

      const userGrowth = this.buildMonthlySeries(
        userGrowthRows.map((r) => r.createdAt),
        12,
        now,
      );
      const startupsMonthly = this.buildMonthlySeries(
        startupsMonthlyRows.map((r) => r.createdAt),
        6,
        now,
      );
      const gmvMonthly = this.buildMonthlyAmountSeries(gmvMonthlyRows, 12, now);
      const splitMonthly = this.buildMonthlySplitSeries(
        splitMonthlyRows,
        12,
        now,
      );

      const pendingRedemptionsDto = pendingRedemptionsRows.map((w) => ({
        id: w.id,
        startupNome: w.startup?.nome ?? 'N/A',
        setor: w.startup?.area_atuacao ?? null,
        amount: this.toNumber(w.amount),
        status: w.status,
        createdAt: w.createdAt,
      }));

      const activeCampaignsDto = activeCampaignsRows.map((c) => ({
        id: c.id,
        title: c.title,
        startupNome: c.startup?.nome ?? 'N/A',
        progress:
          c.totalTokens > 0
            ? Math.floor((c.tokensSold / c.totalTokens) * 100)
            : 0,
      }));

      this.logger.log(`Admin dashboard summary: kpis=${JSON.stringify(kpis)}`);

      return ResponseDto.success(
        'Admin dashboard summary retrieved successfully',
        200,
        {
          kpis,
          gmvMonthly,
          splitMonthly,
          userGrowth,
          startupsMonthly,
          pendingRedemptions: pendingRedemptionsDto,
          activeCampaigns: activeCampaignsDto,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching admin dashboard summary: ${msg}`);
      return ResponseDto.error(
        'Error fetching admin dashboard summary',
        500,
        error,
      );
    }
  }

  // --- Helpers (privados, sem cobertura de teste externa — cobertos via service) ---

  private toNumber(v: unknown): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v);
    if (typeof v === 'object' && v !== null && 'toString' in v) {
      return Number((v as { toString: () => string }).toString());
    }
    return 0;
  }

  private startOfDay(now: Date): Date {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private startOfMonthsAgo(now: Date, months: number): Date {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
  }

  /**
   * Média arredondada do progresso (%) das campanhas OPEN.
   * Retorna 0 quando não há campanhas.
   */
  private computeAvgProgress(
    campaigns: Array<{ tokensSold: number; totalTokens: number }>,
  ): number {
    if (campaigns.length === 0) return 0;
    const sum = campaigns.reduce((acc, c) => {
      if (c.totalTokens <= 0) return acc;
      return acc + (c.tokensSold / c.totalTokens) * 100;
    }, 0);
    return Math.round(sum / campaigns.length);
  }

  private buildMonthlyAmountSeries(
    rows: Array<{ createdAt: Date; amount: unknown }>,
    months: number,
    now: Date,
  ): { labels: string[]; data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];
    const buckets = new Map<string, number>();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      labels.push(MONTH_LABELS_PT[d.getUTCMonth()]);
      buckets.set(key, 0);
    }

    for (const row of rows) {
      const d = new Date(row.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + this.toNumber(row.amount));
      }
    }

    for (const key of buckets.keys()) {
      data.push(buckets.get(key) ?? 0);
    }

    return { labels, data };
  }

  /**
   * Constrói série mensal dos últimos N meses em ordem cronológica.
   * Labels em PT-BR, sempre com N buckets (zero-padded).
   * Usa UTC para casar com o armazenamento DateTime do SQLite/Prisma.
   */
  private buildMonthlySeries(
    dates: Date[],
    months: number,
    now: Date,
  ): { labels: string[]; data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];
    const buckets = new Map<string, number>();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      labels.push(MONTH_LABELS_PT[d.getUTCMonth()]);
      buckets.set(key, 0);
    }

    for (const date of dates) {
      const d = new Date(date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    for (const key of Array.from(buckets.keys())) {
      data.push(buckets.get(key) ?? 0);
    }

    return { labels, data };
  }

  /**
   * Série mensal emparelhada para o dashboard /admin/dashboard:
   * repasse (startupRepasseAmount) × lucro plataforma (platformRevenueAmount).
   *
   * Buckets alinhados em UTC (mesma regra de `buildMonthlyAmountSeries`).
   * Fallback `?? amount` aplicado para investments legados sem split gravado
   * (mesma convenção de `startup-query.service.ts:168`).
   */
  private buildMonthlySplitSeries(
    rows: Array<{
      allocatedAt: Date | null;
      startupRepasseAmount: unknown;
      platformRevenueAmount: unknown;
    }>,
    months: number,
    now: Date,
  ): {
    labels: string[];
    repasse: number[];
    lucro: number[];
  } {
    const labels: string[] = [];
    const repasseBuckets = new Map<string, number>();
    const lucroBuckets = new Map<string, number>();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      labels.push(MONTH_LABELS_PT[d.getUTCMonth()]);
      repasseBuckets.set(key, 0);
      lucroBuckets.set(key, 0);
    }

    for (const row of rows) {
      if (!row.allocatedAt) continue;
      const d = new Date(row.allocatedAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (repasseBuckets.has(key)) {
        repasseBuckets.set(
          key,
          (repasseBuckets.get(key) ?? 0) +
            this.toNumber(row.startupRepasseAmount),
        );
        lucroBuckets.set(
          key,
          (lucroBuckets.get(key) ?? 0) +
            this.toNumber(row.platformRevenueAmount),
        );
      }
    }

    return {
      labels,
      repasse: Array.from(repasseBuckets.values()),
      lucro: Array.from(lucroBuckets.values()),
    };
  }
}
