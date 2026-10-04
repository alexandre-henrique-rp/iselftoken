import { Injectable, Logger } from '@nestjs/common';
import type { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import type { FinanceiroSplitQueryDto } from './dto/financeiro-split-query.dto';

/**
 * Service dedicado à auditoria do split financeiro (repasse × lucro
 * plataforma) por campanha.
 *
 * Apenas leitura — não toca em estado de domínio. Usado pelo painel
 * `/admin/financeiro/split`.
 *
 * Regras:
 *  - Lista campanhas que têm investments CONFIRMED.
 *  - Filtro de período (`from`/`to`) atua em `Investment.allocatedAt`
 *    (carimbo de confirmação — não em `createdAt` que é o pedido).
 *  - Filtro `status` aceita múltiplos valores de CampaignStatus
 *    (default: FUNDED + PAID_OUT + CLOSED — exclui OPEN/DRAFT).
 *  - Para cada campanha, agrega os snapshots gravados em Investment
 *    (migration 20261001000000_investment_financial_split):
 *      startupRepasseAmount, platformSpreadAmount, platformFeeAmount,
 *      platformRevenueAmount, affiliateCommissionAmount.
 *  - Fallback `?? amount` para investments legados (sem split gravado),
 *    mesma convenção de `startup-query.service.ts:168`.
 */
@Injectable()
export class AdminFinanceiroSplitService {
  private readonly logger = new Logger(AdminFinanceiroSplitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista campanhas com breakdown agregado.
   */
  async list(query: FinanceiroSplitQueryDto) {
    try {
      const page = Math.max(1, Math.trunc(query.page ?? 1));
      const pageSize = Math.min(
        100,
        Math.max(1, Math.trunc(query.pageSize ?? 20)),
      );

      const where: Prisma.CampaignWhereInput = {
        status: this.buildStatusFilter(query.status),
      };

      if (query.search) {
        where.startup = {
          OR: [
            { nome: { contains: query.search } },
            { slug: { contains: query.search } },
          ],
        };
      }

      // Pré-filtrar campaigns por período exige subquery — para evitar
      // join manual, filtramos pela existência de investments no range.
      // A agregação completa (sem filtro de período) preserva-se no
      // totais; o filtro afeta apenas as campaigns listadas.
      const [campaigns, total] = await Promise.all([
        this.prisma.campaign.findMany({
          where,
          orderBy: { closedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            status: true,
            targetAmount: true,
            deadline: true,
            closedAt: true,
            startup: {
              select: { id: true, nome: true, slug: true },
            },
          },
        }),
        this.prisma.campaign.count({ where }),
      ]);

      const campaignIds = campaigns.map((c) => c.id);

      // Agrega split por campanha — uma única query groupBy.
      const splitRows = campaignIds.length
        ? await this.prisma.investment.groupBy({
            by: ['campaignId'],
            where: {
              campaignId: { in: campaignIds },
              status: 'CONFIRMED',
              ...(query.from || query.to
                ? {
                    allocatedAt: {
                      ...(query.from ? { gte: new Date(query.from) } : {}),
                      ...(query.to
                        ? { lte: new Date(`${query.to}T23:59:59.999Z`) }
                        : {}),
                    },
                  }
                : {}),
            },
            _sum: {
              amount: true,
              startupRepasseAmount: true,
              platformSpreadAmount: true,
              platformFeeAmount: true,
              platformRevenueAmount: true,
              affiliateCommissionAmount: true,
            },
            _count: {
              _all: true,
              userId: true,
            },
          })
        : [];

      const splitByCampaign = new Map(splitRows.map((r) => [r.campaignId, r]));

      const data = campaigns.map((c) => {
        const split = splitByCampaign.get(c.id);
        const amountRaised = this.toNumber(split?._sum.amount);
        const repasse = this.toNumber(split?._sum.startupRepasseAmount);
        const spread = this.toNumber(split?._sum.platformSpreadAmount);
        const fee = this.toNumber(split?._sum.platformFeeAmount);
        const revenue = this.toNumber(split?._sum.platformRevenueAmount);
        const affiliate = this.toNumber(split?._sum.affiliateCommissionAmount);
        return {
          campaignId: c.id,
          startupId: c.startup.id,
          startupNome: c.startup.nome,
          startupSlug: c.startup.slug,
          campaignTitle: c.title,
          status: c.status,
          targetAmount: this.toNumber(c.targetAmount),
          amountRaised,
          startupRepasseTotal: repasse,
          platformSpreadTotal: spread,
          platformFeeTotal: fee,
          platformRevenueTotal: revenue,
          affiliateCommissionTotal: affiliate,
          investorsCount: split?._count.userId ?? 0,
          deadline: c.deadline,
          closedAt: c.closedAt,
        };
      });

      const totals = data.reduce(
        (acc, row) => ({
          amountRaised: acc.amountRaised + row.amountRaised,
          startupRepasseTotal:
            acc.startupRepasseTotal + row.startupRepasseTotal,
          platformSpreadTotal:
            acc.platformSpreadTotal + row.platformSpreadTotal,
          platformFeeTotal: acc.platformFeeTotal + row.platformFeeTotal,
          platformRevenueTotal:
            acc.platformRevenueTotal + row.platformRevenueTotal,
          affiliateCommissionTotal:
            acc.affiliateCommissionTotal + row.affiliateCommissionTotal,
        }),
        {
          amountRaised: 0,
          startupRepasseTotal: 0,
          platformSpreadTotal: 0,
          platformFeeTotal: 0,
          platformRevenueTotal: 0,
          affiliateCommissionTotal: 0,
        },
      );

      return ResponseDto.success('Split financeiro listado', 200, {
        data,
        totals,
        pagina: page,
        pageSize,
        total,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error listing financeiro split: ${msg}`);
      return ResponseDto.error('Erro ao listar split financeiro', 500, error);
    }
  }

  /**
   * Detalhe de uma campanha: campaign + investments individuais.
   */
  async detail(campaignId: number) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          title: true,
          status: true,
          targetAmount: true,
          tokenPrice: true,
          tokenBaseValue: true,
          tokenSellPrice: true,
          tokenMintingCost: true,
          totalTokens: true,
          tokensSold: true,
          deadline: true,
          closedAt: true,
          startup: {
            select: {
              id: true,
              nome: true,
              slug: true,
              cnpj: true,
            },
          },
        },
      });

      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404, null);
      }

      const investments = await this.prisma.investment.findMany({
        where: { campaignId, status: 'CONFIRMED' },
        orderBy: { allocatedAt: 'desc' },
        include: {
          user: { select: { id: true, publicId: true, nome: true } },
          payment: {
            select: {
              id: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          },
        },
      });

      const breakdown = investments.reduce(
        (acc, inv) => {
          const repasse = this.toNumber(inv.startupRepasseAmount);
          const spread = this.toNumber(inv.platformSpreadAmount);
          const fee = this.toNumber(inv.platformFeeAmount);
          const revenue = this.toNumber(inv.platformRevenueAmount);
          const subtotal = this.toNumber(inv.tokenSubtotal ?? inv.amount);
          const affiliate = this.toNumber(inv.affiliateCommissionAmount);
          return {
            amountRaised: acc.amountRaised + subtotal,
            startupRepasseTotal: acc.startupRepasseTotal + repasse,
            platformSpreadTotal: acc.platformSpreadTotal + spread,
            platformFeeTotal: acc.platformFeeTotal + fee,
            platformRevenueTotal: acc.platformRevenueTotal + revenue,
            affiliateCommissionTotal: acc.affiliateCommissionTotal + affiliate,
            investorsCount: acc.investorsCount + 1,
          };
        },
        {
          amountRaised: 0,
          startupRepasseTotal: 0,
          platformSpreadTotal: 0,
          platformFeeTotal: 0,
          platformRevenueTotal: 0,
          affiliateCommissionTotal: 0,
          investorsCount: 0,
        },
      );

      const items = investments.map((inv) => {
        const subtotal = this.toNumber(inv.tokenSubtotal ?? inv.amount);
        const repasse = this.toNumber(inv.startupRepasseAmount);
        const spread = this.toNumber(inv.platformSpreadAmount);
        const fee = this.toNumber(inv.platformFeeAmount);
        const revenue = this.toNumber(inv.platformRevenueAmount);
        const affiliate = this.toNumber(inv.affiliateCommissionAmount);
        return {
          id: inv.id,
          userPublicId: inv.user.publicId,
          userNome: inv.user.nome,
          tokensQty: inv.tokensQty,
          tokenBasePrice: this.toNumber(inv.tokenBasePrice),
          tokenSellPrice: this.toNumber(inv.tokenSellPrice),
          tokenSubtotal: subtotal,
          platformFeePct: this.toNumber(inv.platformFeePct),
          platformFeeAmount: fee,
          startupRepasseAmount: repasse,
          platformSpreadAmount: spread,
          platformRevenueAmount: revenue,
          affiliateCommissionAmount: affiliate,
          totalCharged: inv.payment
            ? this.toNumber(inv.payment.amount)
            : subtotal + fee,
          paidAt: inv.payment?.paidAt ?? null,
          allocatedAt: inv.allocatedAt,
          method: inv.payment?.method ?? null,
        };
      });

      return ResponseDto.success('Detalhe do split financeiro', 200, {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status,
          targetAmount: this.toNumber(campaign.targetAmount),
          tokenBaseValue: this.toNumber(campaign.tokenBaseValue),
          tokenSellPrice: this.toNumber(campaign.tokenSellPrice),
          totalTokens: campaign.totalTokens,
          tokensSold: campaign.tokensSold,
          deadline: campaign.deadline,
          closedAt: campaign.closedAt,
          startup: campaign.startup,
        },
        breakdown,
        investments: items,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching split detail ${campaignId}: ${msg}`);
      return ResponseDto.error('Erro ao buscar detalhe do split', 500, error);
    }
  }

  /**
   * Exporta os investments do split em CSV (string).
   * Apenas leitura — usado pelo botão "Exportar" no frontend.
   *
   * Mapeia o shape camelCase de `detail()` para colunas snake_case
   * consumidas por planilha/BI sem necessidade de rename manual.
   */
  async exportCsv(campaignId: number): Promise<string> {
    const detailResp = await this.detail(campaignId);
    if (detailResp.error || !detailResp.data) {
      return '';
    }
    const data = detailResp.data as {
      campaign: { id: number; title: string };
      investments: Array<Record<string, unknown>>;
    };

    if (!data.investments.length) return '';

    const columnMap: Array<[string, string]> = [
      ['investment_id', 'id'],
      ['user_public_id', 'userPublicId'],
      ['user_nome', 'userNome'],
      ['tokens_qty', 'tokensQty'],
      ['token_base_price', 'tokenBasePrice'],
      ['token_sell_price', 'tokenSellPrice'],
      ['token_subtotal', 'tokenSubtotal'],
      ['platform_fee_pct', 'platformFeePct'],
      ['platform_fee_amount', 'platformFeeAmount'],
      ['startup_repasse_amount', 'startupRepasseAmount'],
      ['platform_spread_amount', 'platformSpreadAmount'],
      ['platform_revenue_amount', 'platformRevenueAmount'],
      ['affiliate_commission_amount', 'affiliateCommissionAmount'],
      ['total_charged', 'totalCharged'],
      ['method', 'method'],
      ['paid_at', 'paidAt'],
      ['allocated_at', 'allocatedAt'],
    ];

    const headers = columnMap.map(([header]) => header);
    const rows = data.investments.map((inv) =>
      columnMap
        .map(([, field]) =>
          this.escapeCsv(inv[field] as string | number | null | Date),
        )
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // --- helpers ---

  private buildStatusFilter(
    status?: string,
  ): { in: CampaignStatus[] } | CampaignStatus {
    if (!status) {
      // Default: campanhas pós-captação (exclui OPEN/DRAFT — só histórico).
      return { in: ['FUNDED', 'PAID_OUT', 'CLOSED'] };
    }
    return status as CampaignStatus;
  }

  private toNumber(v: unknown): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v);
    if (typeof v === 'object' && v !== null && 'toString' in v) {
      return Number((v as { toString: () => string }).toString());
    }
    return 0;
  }

  private escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = value instanceof Date ? value.toISOString() : String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
}
