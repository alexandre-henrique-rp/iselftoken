import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefundService } from 'src/api/payment/refund.service';
import { InvestmentsService } from 'src/api/investments/investments.service';

/**
 * Serviço de ações de rodada (captação) para startups.
 * Responsável por pauseRound e cancelRound.
 */
@Injectable()
export class StartupRoundService {
  private readonly logger = new Logger(StartupRoundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundService: RefundService,
    private readonly investmentsService: InvestmentsService,
  ) {}

  /**
   * Deriva roundStatus a partir do status da campanha.
   *
   * @param campaigns Array de campanhas da startup
   * @returns Status da rodada: 'ativa', 'pausada', 'encerrada', 'criada_aguardando_reserva', 'sem_rodada'
   */
  private computeRoundStatus(campaigns: Array<{ status: string }>): string {
    if (campaigns.some((c) => c.status === 'OPEN')) return 'ativa';
    if (campaigns.some((c) => c.status === 'PAUSED')) return 'pausada';
    if (
      campaigns.some(
        (c) =>
          c.status === 'CLOSED' ||
          c.status === 'FUNDED' ||
          c.status === 'PAID_OUT',
      )
    )
      return 'encerrada';
    if (campaigns.some((c) => c.status === 'DRAFT'))
      return 'criada_aguardando_reserva';
    return 'sem_rodada';
  }

  /**
   * Pausa uma rodada de captação (T107).
   * Validação: roundStatus deve ser 'ativa'.
   *
   * @param startupId ID da startup
   * @param campaignId ID da campanha
   * @param user Usuário autenticado
   * @returns ResponseDto com status atualizado
   * @throws ConflictException se roundStatus !== 'ativa'
   */
  async pauseRound(startupId: number, campaignId: number, user: PayloadEntity) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        id: true,
        founderId: true,
        campaigns: { select: { id: true, status: true } },
      },
    });

    if (!startup) {
      return ResponseDto.error('Startup nao encontrada', 404);
    }

    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso negado', 403);
    }

    const campaign = startup.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return ResponseDto.error('Rodada nao encontrada', 404);
    }

    const roundStatus = this.computeRoundStatus(startup.campaigns);
    if (roundStatus !== 'ativa') {
      throw new ConflictException(
        `So eh possivel pausar uma rodada em captacao ativa. Status atual: ${roundStatus}`,
      );
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    this.logger.log(
      `Campaign ${campaignId} pausada por user ${user.id} (startup=${startupId})`,
    );

    return ResponseDto.success('Rodada pausada com sucesso', 200, {
      campaignId: updated.id,
      status: updated.status,
      roundStatus: 'pausada',
    });
  }

  /**
   * Cancela uma rodada de captação (T108/T055).
   * Validação: roundStatus deve ser 'criada_aguardando_reserva' ou 'pausada'.
   *
   * Fluxo de refund (T055):
   * 1. Busca Investments CONFIRMED vinculadas à campaign
   * 2. Para cada Investment com Payment PAID, processa refund via C6
   * 3. Se qualquer refund falhar → aborta (sem fechar campaign)
   * 4. Se todos OK → fecha campaign (CLOSED + closedAt)
   *
   * @param startupId ID da startup
   * @param campaignId ID da campanha
   * @param user Usuário autenticado
   * @returns ResponseDto com status atualizado
   * @throws ConflictException se roundStatus nao permitido
   */
  async cancelRound(
    startupId: number,
    campaignId: number,
    user: PayloadEntity,
  ) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        id: true,
        founderId: true,
        campaigns: { select: { id: true, status: true } },
      },
    });

    if (!startup) {
      return ResponseDto.error('Startup nao encontrada', 404);
    }

    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso negado', 403);
    }

    const campaign = startup.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return ResponseDto.error('Rodada nao encontrada', 404);
    }

    const roundStatus = this.computeRoundStatus(startup.campaigns);
    const allowedStatuses = ['criada_aguardando_reserva', 'pausada'];
    if (!allowedStatuses.includes(roundStatus)) {
      throw new ConflictException(
        `So eh possivel cancelar uma rodada em criacao ou pausada. Status atual: ${roundStatus}`,
      );
    }

    // Busca Investments CONFIRMED com Payments PAID para esta campaign
    const investments = await this.prisma.investment.findMany({
      where: { campaignId, status: 'CONFIRMED' },
      include: {
        payment: {
          select: {
            id: true,
            txid: true,
            purpose: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    const paidInvestments = investments.filter(
      (inv) => inv.payment && inv.payment.status === 'PAID',
    );

    // Processa refunds sequencialmente — aborta se qualquer um falhar
    const refundedIds: number[] = [];
    for (const inv of paidInvestments) {
      const result = await this.refundService.refundPayment(
        inv.payment!,
        user.id,
      );

      if (!result.success) {
        this.logger.error(
          `CancelRound abortado: refund falhou payment=${inv.payment!.id} — ${result.error}`,
        );
        return ResponseDto.error(
          `Refund falhou para pagamento ${inv.payment!.id}: ${result.error}`,
          502,
        );
      }

      refundedIds.push(inv.payment!.id);

      // Estorno integral do investimento: REFUNDED + devolve tokensQty ao
      // estoque + remove tokens emitidos + cancela comissao de afiliado
      // (idempotente — seguro mesmo se o payment ja estiver REFUNDED).
      await this.investmentsService.refundInvestment(
        inv.id,
        user.id,
        'CANCEL_ROUND',
      );
    }

    // Fecha a campaign
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    this.logger.log(
      `Campaign ${campaignId} cancelada por user ${user.id} (startup=${startupId}) — ${refundedIds.length} refund(s) processado(s)`,
    );

    return ResponseDto.success('Rodada cancelada com sucesso', 200, {
      campaignId: updated.id,
      status: updated.status,
      roundStatus: 'cancelada',
      refundsProcessed: refundedIds.length,
    });
  }
}
