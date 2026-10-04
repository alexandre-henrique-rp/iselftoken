import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from 'src/api/notifications/dto/query-notifications.dto';
import { NotificationsService } from 'src/api/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * CampaignDeadlineCron — Encerramento automático de campanhas.
 *
 * Verifica a cada 5 minutos se alguma campanha com status OPEN
 * ultrapassou seu deadline. Caso positivo:
 *   - Se tokensSold == totalTokens → status = FUNDED
 *   - Caso contrário → status = CLOSED
 *   - Atualiza closedAt = now()
 *   - Notifica o fundador sobre o encerramento
 *
 * Referência: PRD CAPTACAO.md §2.3 / §4.10
 */
@Injectable()
export class CampaignDeadlineCronService {
  private readonly logger = new Logger(CampaignDeadlineCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'campaign-deadline-check' })
  async checkDeadlines(): Promise<void> {
    const now = new Date();

    // Busca campanhas OPEN que ultrapassaram o deadline
    const expiredCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'OPEN',
        deadline: { lte: now },
      },
      select: {
        id: true,
        startupId: true,
        title: true,
        totalTokens: true,
        tokensSold: true,
        deadline: true,
        startup: { select: { founderId: true, nome: true } },
      },
    });

    if (expiredCampaigns.length === 0) {
      return;
    }

    this.logger.log(
      `Encontradas ${expiredCampaigns.length} campanha(s) com deadline vencido.`,
    );

    for (const campaign of expiredCampaigns) {
      try {
        const isFunded = campaign.tokensSold >= campaign.totalTokens;
        const newStatus = isFunded ? 'FUNDED' : 'CLOSED';

        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: newStatus as any,
            closedAt: now,
          },
        });

        this.logger.log(
          `Campaign ${campaign.id} ("${campaign.title}") encerrada automaticamente: ` +
            `${campaign.tokensSold}/${campaign.totalTokens} tokens vendidos → status=${newStatus}.`,
        );

        // Notificar o fundador sobre o encerramento
        const founderId = (campaign as any).startup?.founderId;
        const startupNome = (campaign as any).startup?.nome || campaign.title;
        if (founderId) {
          const notifType = isFunded
            ? NotificationType.CAMPAIGN_FUNDED
            : NotificationType.CAMPAIGN_DEADLINE;
          const notifTitle = isFunded
            ? 'Campanha 100% financiada!'
            : 'Campanha encerrada por deadline';
          const notifDesc = isFunded
            ? `A campanha "${campaign.title}" da ${startupNome} atingiu 100% da meta. Parabéns!`
            : `A campanha "${campaign.title}" da ${startupNome} atingiu o prazo final. ${campaign.tokensSold}/${campaign.totalTokens} tokens vendidos.`;

          await this.notificationsService.create(
            founderId,
            notifTitle,
            notifDesc,
            notifType,
          );
        }

        // Se a campanha foi totalmente fundada, atualizar status da startup para LIVE
        if (isFunded) {
          await this.prisma.startup.updateMany({
            where: {
              id: campaign.startupId,
              status: { in: ['APPROVED'] },
            },
            data: { status: 'LIVE' },
          });
        }
      } catch (error) {
        this.logger.error(`Erro ao encerrar campanha ${campaign.id}: ${error}`);
      }
    }
  }
}
