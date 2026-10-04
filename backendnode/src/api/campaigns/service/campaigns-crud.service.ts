import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from 'src/api/config/config.service';
import { QueryCampaignsDto } from '../dto/query-campaigns.dto';

/**
 * Service de leituras publicas de Campaign (findAll, findOne, getCheckoutData).
 *
 * Migrado de CampaignsService (S01.2a) - preserva comportamento exato
 * (calculos de equity/progress, warnings de CVM, etc).
 *
 * NOTA: equity atual usa `targetAmount / valuation` (legado). Migracao
 * para formula por tokens vendidos (ADR-008) sera feita em S01.2b.
 */
const PUBLIC_CAMPAIGN_STATUSES = ['OPEN', 'FUNDED', 'PAID_OUT'] as const;

@Injectable()
export class CampaignsCrudService {
  private readonly logger = new Logger(CampaignsCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async findAll(query: QueryCampaignsDto) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;
      const search = query?.search?.trim();
      const status = query?.status;

      const where: any = {
        status: { in: [...PUBLIC_CAMPAIGN_STATUSES] },
      };

      if (search) {
        where.title = { contains: search };
      }

      if (
        status &&
        PUBLIC_CAMPAIGN_STATUSES.includes(
          status as (typeof PUBLIC_CAMPAIGN_STATUSES)[number],
        )
      ) {
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
                logo: { select: { url_sm: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.campaign.count({ where }),
      ]);

      return {
        error: false,
        message: 'Lista de campanhas retornada com sucesso',
        codigo: 200,
        data: campaigns,
        total,
        pagina: page,
      };
    } catch (error) {
      return {
        error: true,
        message: 'Erro ao buscar campanhas',
        codigo: 500,
        detalhe: error,
      };
    }
  }

  async findOne(id: number) {
    try {
      const campaign = await this.prisma.campaign.findFirst({
        where: { id, status: { in: [...PUBLIC_CAMPAIGN_STATUSES] } },
        select: {
          id: true,
          title: true,
          status: true,
          targetAmount: true,
          minInvestment: true,
          valuation: true,
          tokenPrice: true,
          tokenSellPrice: true,
          totalTokens: true,
          tokensSold: true,
          deadline: true,
          startup: {
            select: {
              nome: true,
              slug: true,
              area_atuacao: true,
              estagio: true,
              logo: { select: { url_sm: true } },
            },
          },
        },
      });

      if (!campaign) {
        return {
          error: true,
          message: 'Campanha não encontrada',
          codigo: 404,
        };
      }

      const equity = this.formatEquityPct(
        campaign.targetAmount,
        campaign.valuation,
      );

      const progress =
        campaign.totalTokens > 0
          ? ((campaign.tokensSold / campaign.totalTokens) * 100).toFixed(1)
          : '0';

      return {
        error: false,
        message: 'Campanha encontrada com sucesso',
        codigo: 200,
        data: {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status,
          targetAmount: campaign.targetAmount,
          minInvestment: campaign.minInvestment,
          valuation: campaign.valuation,
          tokenPrice: campaign.tokenPrice,
          tokenSellPrice: campaign.tokenSellPrice,
          totalTokens: campaign.totalTokens,
          tokensSold: campaign.tokensSold,
          deadline: campaign.deadline,
          startup: campaign.startup,
          equity: `${equity}%`,
          progress: `${progress}%`,
          remainingTokens: campaign.totalTokens - campaign.tokensSold,
        },
      };
    } catch (error) {
      return {
        error: true,
        message: 'Erro ao buscar campanha',
        codigo: 500,
        detalhe: error,
      };
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
          // S01.2b (ADR-008): tokenSellPrice eh o snapshot financeiro do
          // Modelo A. tokenPrice eh legado (deprecated, mantido p/ compat).
          tokenSellPrice: true,
          tokenPrice: true,
          tokenBaseValue: true,
          adminFeeValue: true,
          totalTokens: true,
          tokensSold: true,
          deadline: true,
          status: true,
          // Campos CVM publicos (exclui aceiteTermoRepasse/declaracaoVeracidade)
          dataLancamentoRodada: true,
          objetivoCaptacao: true,
          oQueEsperaAlcancar: true,
          participacaoLucros: true,
          faturamentoMinimoLucros: true,
          beneficiosAdicionais: true,
          beneficiosDescricao: true,
          // Campos de captacao (realocados de Startup -> Campaign)
          problema: true,
          solucao: true,
          modeloReceita: true,
          diferencial: true,
          mercadoAlvo: true,
          sociosCount: true,
          dedicacao: true,
          compradores: true,
          investimentoPrevio: true,
          concorrencia: true,
          startup: {
            select: {
              nome: true,
              slug: true,
              area_atuacao: true,
              logo: { select: { url_sm: true } },
            },
          },
        },
      });

      if (!campaign) {
        return {
          error: true,
          message: 'Campanha não encontrada',
          codigo: 404,
        };
      }

      if (campaign.status !== 'OPEN') {
        return {
          error: true,
          message: `Campanha está com status ${campaign.status}. Apenas campanhas OPEN aceitam investimentos.`,
          codigo: 400,
        };
      }

      const equity = this.formatEquityPct(
        campaign.targetAmount,
        campaign.valuation,
      );

      // Modelo B: a taxa exibida no checkout DEVE ser a mesma que o backend
      // cobra — fundraising.platformFee (ConfigService, editado em
      // /admin/config). NAO derivar de adminFeeValue, que e o fee sobre a
      // captacao (20%), conceito diferente.
      const feePctRaw = this.configService
        ? await this.configService.getEffective('fundraising.platformFee')
        : null;
      const platformFeePct =
        typeof feePctRaw === 'number' && Number.isFinite(feePctRaw)
          ? feePctRaw
          : null;

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

      return {
        error: false,
        message: 'Dados de checkout retornados',
        codigo: 200,
        data: {
          id: campaign.id,
          title: campaign.title,
          // S01.2b (ADR-008): price vem do snapshot tokenSellPrice (Modelo A:
          // tokenSellPrice = targetAmount / totalTokens). Fallback para tokenPrice
          // legado garante compat com campanhas pre-migration.
          price: Number(campaign.tokenSellPrice ?? campaign.tokenPrice),
          minInvestment: Number(campaign.minInvestment),
          equity: `${equity}%`,
          valuation: Number(campaign.valuation),
          targetAmount: Number(campaign.targetAmount),
          // Alias p/ compatibilidade com frontend que consome tokenPrice.
          tokenPrice: Number(campaign.tokenSellPrice ?? campaign.tokenPrice),
          // Modelo B: preco base (repasse) + preco de venda + aliquota da
          // taxa da plataforma vigente (fundraising.platformFee).
          tokenBasePrice:
            campaign.tokenBaseValue != null
              ? Number(campaign.tokenBaseValue)
              : null,
          tokenSellPrice: Number(
            campaign.tokenSellPrice ?? campaign.tokenPrice,
          ),
          platformFeePct,
          totalTokens: campaign.totalTokens,
          tokensSold: campaign.tokensSold,
          remainingTokens: campaign.totalTokens - campaign.tokensSold,
          deadline: campaign.deadline,
          startup: campaign.startup,
          dataLancamentoRodada: campaign.dataLancamentoRodada,
          objetivoCaptacao: campaign.objetivoCaptacao,
          oQueEsperaAlcancar: campaign.oQueEsperaAlcancar,
          participacaoLucros: campaign.participacaoLucros,
          faturamentoMinimoLucros: campaign.faturamentoMinimoLucros,
          beneficiosAdicionais: campaign.beneficiosAdicionais,
          beneficiosDescricao: campaign.beneficiosDescricao,
          problema: campaign.problema,
          solucao: campaign.solucao,
          modeloReceita: campaign.modeloReceita,
          diferencial: campaign.diferencial,
          mercadoAlvo: campaign.mercadoAlvo,
          sociosCount: campaign.sociosCount,
          dedicacao: campaign.dedicacao,
          compradores: campaign.compradores,
          investimentoPrevio: campaign.investimentoPrevio,
          concorrencia: campaign.concorrencia,
          paymentMethods: ['PIX', 'CREDIT_CARD'] as const,
          ...(warnings.length > 0 ? { warnings } : {}),
        },
      };
    } catch (error) {
      return {
        error: true,
        message: 'Erro ao buscar dados de checkout',
        codigo: 500,
        detalhe: error,
      };
    }
  }

  /**
   * Formata equity como string percentual.
   * Formula legado: targetAmount / valuation * 100.
   * Migrar para (tokensSold / totalTokens) em S01.2b conforme ADR-008.
   */
  private formatEquityPct(target: unknown, valuation: unknown): string {
    if (!valuation) return '0';
    return ((Number(target) / Number(valuation)) * 100).toFixed(2);
  }
}
