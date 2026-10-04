import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** Cliente Prisma normal ou o cliente recebido de uma transação interativa. */
type Db = PrismaService | Prisma.TransactionClient;

export type CouponUsageState = 'CONFIRMED' | 'RESERVED' | 'RELEASED';

export interface CouponUsageMetrics {
  /** Usos cujo Payment possui paidAt, inclusive REFUNDED posteriormente. */
  confirmed: number;
  /** Usos ligados a Payment PENDING ainda dentro da validade. */
  reserved: number;
  /** Todos os registros históricos de CouponUsage, inclusive liberados. */
  total: number;
}

interface CouponPaymentSnapshot {
  status: string;
  paidAt: Date | null;
  expiresAt: Date | null;
}

interface CouponCounterSnapshot {
  maxUses: number | null;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
}

/**
 * Centraliza a liquidação e a capacidade dos cupons.
 *
 * `CouponUsage` é criado no momento da reserva, mas não possui estado próprio
 * por decisão de compatibilidade do schema. Por isso, o estado é derivado do
 * Payment: paidAt != null confirma; PENDING vigente reserva; os demais ficam
 * apenas no histórico e não ocupam capacidade.
 */
@Injectable()
export class CouponSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageMetrics(
    couponId: number,
    now = new Date(),
    db: Db = this.prisma,
  ): Promise<CouponUsageMetrics> {
    const metrics = await this.getUsageMetricsByCouponIds([couponId], now, db);
    return (
      metrics.get(couponId) ?? {
        confirmed: 0,
        reserved: 0,
        total: 0,
      }
    );
  }

  async getUsageMetricsByCouponIds(
    couponIds: number[],
    now = new Date(),
    db: Db = this.prisma,
  ): Promise<Map<number, CouponUsageMetrics>> {
    const uniqueCouponIds = [...new Set(couponIds)];
    const result = new Map<number, CouponUsageMetrics>();

    for (const couponId of uniqueCouponIds) {
      result.set(couponId, { confirmed: 0, reserved: 0, total: 0 });
    }

    if (uniqueCouponIds.length === 0) return result;

    const usages =
      (await db.couponUsage.findMany({
        where: { couponId: { in: uniqueCouponIds } },
        select: {
          couponId: true,
          payment: {
            select: {
              status: true,
              paidAt: true,
              expiresAt: true,
            },
          },
        },
      })) ?? [];

    for (const usage of usages) {
      const metrics = result.get(usage.couponId);
      if (!metrics) continue;

      metrics.total += 1;
      const state = this.getUsageState(usage.payment, now);
      if (state === 'CONFIRMED') metrics.confirmed += 1;
      if (state === 'RESERVED') metrics.reserved += 1;
    }

    return result;
  }

  getUsageState(
    payment: CouponPaymentSnapshot | null | undefined,
    now = new Date(),
  ): CouponUsageState {
    if (payment?.paidAt) return 'CONFIRMED';

    if (
      payment?.status === 'PENDING' &&
      (!payment.expiresAt || payment.expiresAt > now)
    ) {
      return 'RESERVED';
    }

    return 'RELEASED';
  }

  getAvailableCount(
    maxUses: number | null,
    metrics: Pick<CouponUsageMetrics, 'confirmed' | 'reserved'>,
  ): number | null {
    if (maxUses === null) return null;
    return Math.max(0, maxUses - metrics.confirmed - metrics.reserved);
  }

  /**
   * Liquida os usos de um Payment confirmado de forma idempotente.
   *
   * Recalcular a contagem confirmada, em vez de incrementar, permite repetir
   * o caminho após webhook, consumer, retry ou reconciliação sem duplicar uso.
   */
  async settlePayment(
    paymentId: number,
    db: Db = this.prisma,
  ): Promise<{ settled: boolean; couponIds: number[] }> {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: { paidAt: true },
    });

    if (!payment?.paidAt) {
      return { settled: false, couponIds: [] };
    }

    const result = await this.reconcilePayment(paymentId, db);
    return { settled: true, couponIds: result.couponIds };
  }

  /**
   * Recalcula o contador persistido para os cupons ligados a um Payment.
   * Também é usado após cancelamentos para corrigir contadores legados que
   * foram incrementados antes da confirmação.
   */
  async reconcilePayment(
    paymentId: number,
    db: Db = this.prisma,
  ): Promise<{ couponIds: number[] }> {
    const usages =
      (await db.couponUsage.findMany({
        where: { paymentId },
        select: { couponId: true },
      })) ?? [];
    const couponIds = [...new Set(usages.map((usage) => usage.couponId))];

    await this.reconcileCouponCounters(couponIds, new Date(), db);
    return { couponIds };
  }

  private async reconcileCouponCounters(
    couponIds: number[],
    now: Date,
    db: Db,
  ): Promise<void> {
    for (const couponId of couponIds) {
      const coupon = await db.coupon.findUnique({
        where: { id: couponId },
        select: {
          maxUses: true,
          active: true,
          validFrom: true,
          validUntil: true,
        },
      });
      if (!coupon) continue;

      const metrics = await this.getUsageMetrics(couponId, now, db);
      await db.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: metrics.confirmed,
          status: this.resolveStatus(coupon, metrics, now),
        },
      });
    }
  }

  private resolveStatus(
    coupon: CouponCounterSnapshot,
    metrics: Pick<CouponUsageMetrics, 'confirmed' | 'reserved'>,
    now: Date,
  ): 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED' {
    if (!coupon.active) return 'INACTIVE';
    if (coupon.validFrom && coupon.validFrom > now) return 'INACTIVE';
    if (coupon.validUntil && coupon.validUntil < now) return 'EXPIRED';
    if (
      coupon.maxUses !== null &&
      metrics.confirmed + metrics.reserved >= coupon.maxUses
    ) {
      return 'EXHAUSTED';
    }
    return 'ACTIVE';
  }
}
