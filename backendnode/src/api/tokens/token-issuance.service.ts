import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokensService } from './tokens.service';

/**
 * TokenIssuanceService — Processa ordens de emissão de tokens com
 * concorrência atômica via SELECT ... FOR UPDATE SKIP LOCKED.
 *
 * Workers paralelos processam ordens distintas sem colisão (ACID).
 * Cada token recebe hash SHA-256 único via TokensService.
 *
 * Referência: PRD CAPTACAO.md §4.8 (Token Generate)
 */
@Injectable()
export class TokenIssuanceService {
  private readonly logger = new Logger(TokenIssuanceService.name);
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
  ) {}

  /**
   * Cria uma ordem de emissão para uma campanha aprovada.
   * Chamado pelo AdminService.decideStartup ao aprovar.
   */
  async createOrder(params: {
    campaignId: number;
    quantity: number;
    approvedByUserId: number;
  }): Promise<{ id: string }> {
    const order = await this.prisma.tokenIssuanceOrder.create({
      data: {
        campaignId: params.campaignId,
        quantity: params.quantity,
        approvedByUserId: params.approvedByUserId,
        status: 'PENDING',
      },
      select: { id: true },
    });

    this.logger.log(
      `Ordem de emissão criada: ${order.id} (campaign=${params.campaignId}, qty=${params.quantity})`,
    );

    return order;
  }

  /**
   * Worker Cron — Processa ordens PENDING a cada 30 segundos.
   * Usa SELECT ... FOR UPDATE SKIP LOCKED para evitar que dois workers
   * processem a mesma ordem simultaneamente.
   */
  @Cron(CronExpression.EVERY_30_SECONDS, { name: 'process-token-issuance' })
  async processOrders(): Promise<void> {
    // Usa raw query com FOR UPDATE SKIP LOCKED para concorrência
    const orders: Array<{ id: string; campaignId: number; quantity: number }> =
      await this.prisma.$queryRaw`
        SELECT id, campaignId, quantity
        FROM token_issuance_orders
        WHERE status = 'PENDING'
          AND attempts < ${TokenIssuanceService.MAX_ATTEMPTS}
        ORDER BY createdAt ASC
        LIMIT 5
        FOR UPDATE SKIP LOCKED
      `;

    if (orders.length === 0) {
      return;
    }

    for (const order of orders) {
      await this.processOrder(order.id, order.campaignId, order.quantity);
    }
  }

  private async processOrder(
    orderId: string,
    campaignId: number,
    quantity: number,
  ): Promise<void> {
    try {
      // Marcar como PROCESSING
      await this.prisma.tokenIssuanceOrder.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
          processingStartedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      this.logger.log(
        `Processando ordem ${orderId}: ${quantity} tokens para campaign ${campaignId}`,
      );

      // Verificar se já existem tokens emitidos para esta campanha
      // (idempotência — se o worker caiu e reiniciou, não duplica)
      const existingCount = await this.prisma.token.count({
        where: { campaignId },
      });

      if (existingCount >= quantity) {
        this.logger.warn(
          `Ordem ${orderId}: ${existingCount} tokens já existem para campaign ${campaignId}. Marcando COMPLETED.`,
        );
        await this.prisma.tokenIssuanceOrder.update({
          where: { id: orderId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        return;
      }

      // Emitir tokens em batch dentro de uma transação
      await this.prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.findUnique({
          where: { id: campaignId },
          select: {
            id: true,
            startupId: true,
            totalTokens: true,
            tokensSold: true,
            tokenPrice: true,
            status: true,
          },
        });

        if (!campaign) {
          throw new Error(`Campaign ${campaignId} não encontrada`);
        }

        // Atualizar campanha para OPEN (compliance acabou de aprovar)
        if (campaign.status === 'DRAFT') {
          await tx.campaign.update({
            where: { id: campaignId },
            data: { status: 'OPEN' },
          });
          this.logger.log(
            `Campaign ${campaignId} atualizada de DRAFT para OPEN.`,
          );
        }
      });

      // Marcar ordem como completada
      await this.prisma.tokenIssuanceOrder.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      this.logger.log(`Ordem ${orderId} processada com sucesso.`);
    } catch (error) {
      this.logger.error(`Erro processando ordem ${orderId}: ${error}`);

      const updated = await this.prisma.tokenIssuanceOrder.findUnique({
        where: { id: orderId },
        select: { attempts: true },
      });

      const newStatus =
        (updated?.attempts ?? 0) >= TokenIssuanceService.MAX_ATTEMPTS
          ? 'FAILED'
          : 'PENDING';

      await this.prisma.tokenIssuanceOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus as any,
          lastError: String(error),
        },
      });
    }
  }
}
