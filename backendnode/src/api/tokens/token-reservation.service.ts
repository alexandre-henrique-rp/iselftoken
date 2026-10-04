import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** Janela padrão quando a reserva não recebe o expiresAt do Payment. */
const RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Cliente Prisma ou o handle transacional (ambos aceitos pelos métodos). */
type Db = PrismaService | Prisma.TransactionClient;

export interface CampaignAvailability {
  campaignId: number;
  totalTokens: number;
  /** Tokens já vendidos (investimentos CONFIRMED). */
  sold: number;
  /** Tokens presos por reservas RESERVED ainda vigentes. */
  reserved: number;
  /** totalTokens - sold - reserved (nunca negativo). */
  available: number;
}

/**
 * Ciclo de vida da reserva de tokens de uma campanha.
 *
 *   RESERVED  — segura o estoque enquanto o pagamento não confirma
 *   CONFIRMED — pagamento pago; os tokens foram emitidos (efetivação)
 *   DISCARDED — expirou/cancelou; o estoque volta a ficar disponível
 *
 * Disponibilidade = totalTokens - vendidos(CONFIRMED) - reservas RESERVED.
 * O incremento de `campaign.tokensSold` acontece na confirmação do
 * investimento; aqui só cuidamos do "hold" e da sua baixa.
 */
@Injectable()
export class TokenReservationService {
  private readonly logger = new Logger(TokenReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Disponibilidade atual da campanha. Considera apenas reservas RESERVED
   * ainda dentro da validade — reservas expiradas são ignoradas no cálculo
   * (o cron as marca DISCARDED, mas não dependemos disso para não vender de
   * novo um estoque que já venceu).
   */
  async getCampaignAvailability(
    campaignId: number,
    db: Db = this.prisma,
  ): Promise<CampaignAvailability> {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { totalTokens: true, tokensSold: true },
    });
    if (!campaign) {
      return {
        campaignId,
        totalTokens: 0,
        sold: 0,
        reserved: 0,
        available: 0,
      };
    }

    const agregado = await db.tokenReservation.aggregate({
      where: {
        campaignId,
        status: 'RESERVED',
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    });
    const reserved = agregado._sum.quantity ?? 0;
    const available = Math.max(
      0,
      campaign.totalTokens - campaign.tokensSold - reserved,
    );

    return {
      campaignId,
      totalTokens: campaign.totalTokens,
      sold: campaign.tokensSold,
      reserved,
      available,
    };
  }

  /**
   * Cria uma reserva RESERVED se houver disponibilidade. Deve ser chamada
   * dentro da mesma transação que cria o investimento, passando `db` = tx,
   * para que a checagem de disponibilidade e a criação sejam atômicas.
   *
   * Retorna { ok: false } quando o estoque é insuficiente — o chamador
   * decide como sinalizar (ex.: HttpException 409).
   */
  async reserve(
    params: {
      campaignId: number;
      userId: number;
      quantity: number;
      investmentId?: number;
      /** Mesmo vencimento do Payment para evitar janelas divergentes. */
      expiresAt?: Date;
    },
    db: Db = this.prisma,
  ): Promise<
    | { ok: true; reservation: { id: string; expiresAt: Date } }
    | { ok: false; available: number }
  > {
    const { campaignId, userId, quantity, investmentId } = params;

    const disp = await this.getCampaignAvailability(campaignId, db);
    if (quantity > disp.available) {
      return { ok: false, available: disp.available };
    }

    const expiresAt =
      params.expiresAt ?? new Date(Date.now() + RESERVATION_TTL_MS);
    const reservation = await db.tokenReservation.create({
      data: {
        campaignId,
        userId,
        quantity,
        status: 'RESERVED',
        investmentId: investmentId ?? null,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    this.logger.log(
      `Reserva ${reservation.id}: ${quantity} token(s) da campanha ${campaignId} ` +
        `para user ${userId} (expira ${expiresAt.toISOString()})`,
    );
    return { ok: true, reservation };
  }

  /**
   * Efetiva a reserva do investimento (RESERVED -> CONFIRMED). Idempotente:
   * se já estiver CONFIRMED não faz nada. Não mexe em tokensSold nem emite
   * tokens — isso é responsabilidade do confirmInvestment.
   */
  async confirmByInvestment(
    investmentId: number,
    db: Db = this.prisma,
  ): Promise<void> {
    const reservation = await db.tokenReservation.findUnique({
      where: { investmentId },
      select: { id: true, status: true },
    });
    if (!reservation || reservation.status !== 'RESERVED') return;

    await db.tokenReservation.update({
      where: { id: reservation.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    this.logger.log(
      `Reserva ${reservation.id} efetivada (investimento ${investmentId})`,
    );
  }

  /**
   * Descarta a reserva do investimento (RESERVED -> DISCARDED), liberando o
   * estoque. Idempotente para reservas não-RESERVED.
   */
  async discardByInvestment(
    investmentId: number,
    reason: string,
    db: Db = this.prisma,
  ): Promise<void> {
    const reservation = await db.tokenReservation.findUnique({
      where: { investmentId },
      select: { id: true, status: true },
    });
    if (!reservation || reservation.status !== 'RESERVED') return;

    await db.tokenReservation.update({
      where: { id: reservation.id },
      data: {
        status: 'DISCARDED',
        discardedAt: new Date(),
        discardReason: reason,
      },
    });
    this.logger.log(
      `Reserva ${reservation.id} descartada (investimento ${investmentId}): ${reason}`,
    );
  }
}
