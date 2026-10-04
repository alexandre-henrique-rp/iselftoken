import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  EarlyAccessRankingItem,
  EarlyAccessRankingResponse,
} from './dto/early-access-ranking.dto';

@Injectable()
export class EarlyAccessService {
  private readonly logger = new Logger(EarlyAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o ranking de startups por número de reservas Early Access.
   *
   * Lógica:
   * 1. Busca todos os pagamentos com purpose = EARLY_ACCESS e status = PAID
   * 2. Agrupa por campaignId
   * 3. Para cada campaign, busca dados da startup associada
   * 4. Ordena por número de reservas (desc)
   * 5. Limita ao top N
   *
   * Parâmetros:
   * - limit: número máximo de itens no ranking (padrão 10)
   *
   * Retorno:
   * - ResponseDto com EarlyAccessRankingResponse
   */
  async getRanking(limit = 10) {
    try {
      // Passo 1: Agrupa pagamentos EARLY_ACCESS por campaign
      const rawReservations = await this.prisma.payment.groupBy({
        by: ['campaignId'],
        where: {
          purpose: 'EARLY_ACCESS',
          status: 'PAID',
          campaignId: { not: null },
        },
        _count: {
          id: true,
        },
      });

      // Passo 2: Para cada campaign com reservas, busca dados da startup
      const campaignIds = rawReservations
        .filter((g) => g.campaignId != null)
        .map((g) => g.campaignId as number);

      const campaigns = await this.prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        include: {
          startup: {
            include: {
              logo: true,
            },
          },
        },
      });

      // Mapa campaignId -> dados da startup
      const startupMap = new Map<
        number,
        {
          id: number;
          nome: string;
          area_atuacao: string | null;
          logo: { url: string; url_sm: string | null } | null;
        }
      >();

      for (const campaign of campaigns) {
        if (campaign.startup) {
          startupMap.set(campaign.id, {
            id: campaign.startup.id,
            nome: campaign.startup.nome,
            area_atuacao: campaign.startup.area_atuacao,
            logo: campaign.startup.logo,
          });
        }
      }

      // Passo 3: Monta ranking
      const rankingItems: EarlyAccessRankingItem[] = [];
      let totalReservations = 0;

      for (const group of rawReservations) {
        if (!group.campaignId) continue;
        const startupData = startupMap.get(group.campaignId);
        if (!startupData) continue;

        const count = group._count.id;
        totalReservations += count;

        rankingItems.push({
          position: 0,
          startupId: String(startupData.id),
          startupName: startupData.nome,
          category: startupData.area_atuacao ?? 'Sem categoria',
          reservations: count,
          logoUrl: startupData.logo?.url_sm ?? startupData.logo?.url ?? null,
        });
      }

      // Passo 4: Ordena e limita
      rankingItems.sort((a, b) => b.reservations - a.reservations);
      const topItems = rankingItems.slice(0, limit);
      topItems.forEach((item, index) => {
        item.position = index + 1;
      });

      const response: EarlyAccessRankingResponse = {
        ranking: topItems,
        totalReservations,
        lastUpdated: new Date().toISOString(),
      };

      return ResponseDto.success(
        'Ranking de Early Access retornado com sucesso',
        200,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar ranking Early Access: ${error.message}`,
      );
      throw new HttpException(
        ResponseDto.error(
          'Erro ao buscar ranking de Early Access',
          error.status || 500,
          error.message,
        ),
        error.status || 500,
      );
    }
  }
}
