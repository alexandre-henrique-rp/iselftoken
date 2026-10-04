/**
 * ComplianceCampaignsService (PRD_COMPLIANCE_STARTUP_CAMPANHA).
 *
 * Serviço dedicado para operações de compliance sobre campanhas:
 * listagem com filtro, detalhe completo e decisão (aprovar/rejeitar/solicitar revisão).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';

type CampaignDecision = 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';

@Injectable()
export class ComplianceCampaignsService {
  private readonly logger = new Logger(ComplianceCampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista campanhas com filtro por status, paginação e busca.
   */
  async listCampaigns(filters: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    try {
      const page = Math.max(1, filters.page ?? 1);
      const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.status && filters.status !== 'ALL') {
        where.status = filters.status;
      }

      if (filters.search?.trim()) {
        const q = filters.search.trim();
        where.OR = [
          { title: { contains: q } },
          { startup: { nome: { contains: q } } },
        ];
      }

      const [total, campaigns] = await Promise.all([
        this.prisma.campaign.count({ where }),
        this.prisma.campaign.findMany({
          where,
          include: {
            startup: {
              select: {
                id: true,
                nome: true,
                slug: true,
                logo: { select: { url: true, url_sm: true } },
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const data = campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        targetAmount: Number(c.targetAmount),
        tokenPrice: Number(c.tokenPrice),
        totalTokens: c.totalTokens,
        tokensSold: c.tokensSold,
        deadline: c.deadline,
        createdAt: c.createdAt,
        closedAt: c.closedAt,
        startup: {
          id: c.startup.id,
          nome: c.startup.nome,
          slug: c.startup.slug,
          logo: c.startup.logo?.url_sm ?? c.startup.logo?.url ?? null,
          status: c.startup.status,
        },
      }));

      return ResponseDto.success('Campanhas listadas com sucesso', 200, {
        data,
        total,
        page,
        limit,
        hasMore: skip + campaigns.length < total,
      });
    } catch (error: any) {
      this.logger.error(`Erro listCampaigns: ${error?.message ?? error}`);
      return ResponseDto.error('Erro ao listar campanhas', 500);
    }
  }

  /**
   * Detalhe completo de uma campanha para revisão pelo compliance.
   * Inclui dados da startup, pitch, governança, recursos, retornos.
   */
  async getCampaignDetail(campaignId: number) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              slug: true,
              cnpj: true,
              razao_social: true,
              email: true,
              telefone: true,
              site: true,
              area_atuacao: true,
              category: true,
              estagio: true,
              descricao: true,
              youtube_url: true,
              banco: true,
              agencia: true,
              conta: true,
              digito: true,
              tipo_conta: true,
              pix_key: true,
              titular: true,
              documento_titular: true,
              socios: true,
              teams: true,
              status: true,
              logo: { select: { url: true } },
              founder: { select: { id: true, nome: true, email: true } },
            },
          },
          resources: {
            orderBy: { categoria: 'asc' },
          },
          investments: {
            select: {
              id: true,
              status: true,
              amount: true,
              startupRepasseAmount: true,
            },
          },
        },
      });

      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404);
      }

      const tokensSold = campaign.tokensSold ?? 0;
      const totalTokens = campaign.totalTokens ?? 0;
      const tokenPrice = Number(campaign.tokenPrice ?? 0);
      const targetAmount = Number(campaign.targetAmount ?? 0);
      // Captado = Σ repasse dos investimentos CONFIRMED (preco base), com
      // fallback `amount` para linhas legadas sem split.
      const raisedNum = campaign.investments
        .filter((i) => i.status === 'CONFIRMED')
        .reduce(
          (sum, i) => sum + Number(i.startupRepasseAmount ?? i.amount ?? 0),
          0,
        );
      const percentage =
        targetAmount > 0
          ? Math.min(100, Math.round((raisedNum / targetAmount) * 100))
          : 0;

      const confirmedInvestments = campaign.investments.filter(
        (i) => i.status === 'CONFIRMED',
      );

      const detail = {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        createdAt: campaign.createdAt,
        closedAt: campaign.closedAt,
        deadline: campaign.deadline,

        // Financeiro
        targetAmount: Number(campaign.targetAmount),
        minInvestment: Number(campaign.minInvestment),
        valuation: Number(campaign.valuation),
        tokenPrice: Number(campaign.tokenPrice),
        totalTokens: campaign.totalTokens,
        tokensSold,
        raised: raisedNum,
        percentage,
        investorsCount: confirmedInvestments.length,

        // Tese de investimento
        problema: campaign.problema,
        solucao: campaign.solucao,
        diferencial: campaign.diferencial,
        modeloReceita: campaign.modeloReceita,
        mercadoAlvo: campaign.mercadoAlvo,

        // Governança
        sociosCount: campaign.sociosCount,
        dedicacao: campaign.dedicacao,
        compradores: campaign.compradores,
        investimentoPrevio: campaign.investimentoPrevio,
        concorrencia: campaign.concorrencia,

        // Retornos
        participacaoLucros: campaign.participacaoLucros,
        faturamentoMinimoLucros: campaign.faturamentoMinimoLucros
          ? Number(campaign.faturamentoMinimoLucros)
          : null,
        beneficiosAdicionais: campaign.beneficiosAdicionais,
        beneficiosDescricao: campaign.beneficiosDescricao,

        // Termos CVM
        aceiteTermoRepasse: campaign.aceiteTermoRepasse,
        declaracaoVeracidade: campaign.declaracaoVeracidade,

        // Recursos
        resources: campaign.resources.map((r) => ({
          categoria: r.categoria,
          percentual: r.percentual,
          descricaoCustomizada: r.descricaoCustomizada,
        })),

        // Startup
        startup: campaign.startup,
      };

      return ResponseDto.success('Campanha encontrada', 200, detail);
    } catch (error: any) {
      this.logger.error(`Erro getCampaignDetail: ${error?.message ?? error}`);
      return ResponseDto.error('Erro ao buscar campanha', 500);
    }
  }

  /**
   * Decide sobre uma campanha: aprovar (OPEN), solicitar revisão ou rejeitar.
   *
   * Regras:
   * - Somente campanhas DRAFT ou OPEN podem receber decisão.
   * - APPROVED → status muda para OPEN.
   * - NEEDS_REVISION → status volta para DRAFT.
   * - REJECTED → status muda para CLOSED.
   * - Observação obrigatória para NEEDS_REVISION e REJECTED.
   */
  async decideCampaign(
    campaignId: number,
    decision: CampaignDecision,
    observation: string | undefined,
    userId: number | null,
  ) {
    try {
      // Validar observação obrigatória
      if (
        (decision === 'NEEDS_REVISION' || decision === 'REJECTED') &&
        (!observation || observation.trim().length === 0)
      ) {
        return ResponseDto.error(
          'Observação é obrigatória para revisão ou rejeição.',
          400,
        );
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              founderId: true,
              founder: { select: { email: true, nome: true } },
            },
          },
        },
      });

      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404);
      }

      // Somente DRAFT ou OPEN podem receber decisão
      const allowedStatuses = ['DRAFT', 'OPEN'];
      if (!allowedStatuses.includes(campaign.status)) {
        return ResponseDto.error(
          `Campanha com status ${campaign.status} não pode receber decisão.`,
          400,
        );
      }

      // Mapear decisão para novo status
      const statusMap: Record<CampaignDecision, string> = {
        APPROVED: 'OPEN',
        NEEDS_REVISION: 'DRAFT',
        REJECTED: 'CLOSED',
      };
      const newStatus = statusMap[decision];

      // Atualizar campanha
      const updateData: any = { status: newStatus };
      if (decision === 'REJECTED') {
        updateData.closedAt = new Date();
      }

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          action: `COMPLIANCE_CAMPAIGN_${decision}`,
          entity: 'Campaign',
          entityId: String(campaignId),
          userId,
          oldValue: { status: campaign.status },
          newValue: {
            status: newStatus,
            observation: observation?.trim() ?? null,
          },
        },
      });

      this.logger.log(
        `Campanha #${campaignId} (${campaign.startup.nome}): ${decision} por userId=${userId}`,
      );

      const messages: Record<CampaignDecision, string> = {
        APPROVED: 'Campanha aprovada e aberta para captação.',
        NEEDS_REVISION: 'Campanha devolvida para revisão do fundador.',
        REJECTED: 'Campanha rejeitada.',
      };

      return ResponseDto.success(messages[decision], 200, {
        campaignId,
        decision,
        newStatus,
        startupId: campaign.startup.id,
        startupNome: campaign.startup.nome,
      });
    } catch (error: any) {
      this.logger.error(`Erro decideCampaign: ${error?.message ?? error}`);
      return ResponseDto.error('Erro ao processar decisão', 500);
    }
  }
}
