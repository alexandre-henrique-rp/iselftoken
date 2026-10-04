import { CouponSettlementService } from './coupon-settlement.service';

describe('CouponSettlementService', () => {
  const now = new Date('2026-09-13T12:00:00.000Z');
  let service: CouponSettlementService;

  beforeEach(() => {
    service = new CouponSettlementService({} as never);
  });

  describe('getUsageState', () => {
    it.each([
      [
        'PAID sem paidAt',
        { status: 'PAID', paidAt: null, expiresAt: null },
        'RELEASED',
      ],
      [
        'PENDING sem expiração',
        { status: 'PENDING', paidAt: null, expiresAt: null },
        'RESERVED',
      ],
      [
        'PENDING vigente',
        {
          status: 'PENDING',
          paidAt: null,
          expiresAt: new Date('2026-09-13T12:01:00.000Z'),
        },
        'RESERVED',
      ],
      [
        'PENDING expirado',
        {
          status: 'PENDING',
          paidAt: null,
          expiresAt: new Date('2026-09-13T11:59:00.000Z'),
        },
        'RELEASED',
      ],
      [
        'CANCELED sem paidAt',
        { status: 'CANCELED', paidAt: null, expiresAt: null },
        'RELEASED',
      ],
      [
        'REFUNDED sem paidAt',
        { status: 'REFUNDED', paidAt: null, expiresAt: null },
        'RELEASED',
      ],
      [
        'REFUNDED com paidAt',
        {
          status: 'REFUNDED',
          paidAt: new Date('2026-09-13T11:00:00.000Z'),
          expiresAt: null,
        },
        'CONFIRMED',
      ],
    ])('%s deriva %s', (_label, payment, expected) => {
      expect(service.getUsageState(payment, now)).toBe(expected);
    });

    it('considera Payment inexistente como liberado', () => {
      expect(service.getUsageState(null, now)).toBe('RELEASED');
      expect(service.getUsageState(undefined, now)).toBe('RELEASED');
    });
  });

  it('calcula confirmados, reservas vigentes e histórico sem contar liberados na capacidade', async () => {
    const db = {
      couponUsage: {
        findMany: jest.fn().mockResolvedValue([
          {
            couponId: 1,
            payment: {
              status: 'PAID',
              paidAt: new Date('2026-09-13T10:00:00.000Z'),
              expiresAt: null,
            },
          },
          {
            couponId: 1,
            payment: {
              status: 'PENDING',
              paidAt: null,
              expiresAt: new Date('2026-09-13T13:00:00.000Z'),
            },
          },
          {
            couponId: 1,
            payment: {
              status: 'CANCELED',
              paidAt: null,
              expiresAt: null,
            },
          },
          { couponId: 2, payment: null },
        ]),
      },
    };

    const metrics = await service.getUsageMetricsByCouponIds(
      [1, 2],
      now,
      db as never,
    );

    expect(metrics.get(1)).toEqual({ confirmed: 1, reserved: 1, total: 3 });
    expect(metrics.get(2)).toEqual({ confirmed: 0, reserved: 0, total: 1 });
    expect(service.getAvailableCount(5, metrics.get(1)!)).toBe(3);
  });

  it('não liquida Payment sem paidAt', async () => {
    const db = {
      payment: { findUnique: jest.fn().mockResolvedValue({ paidAt: null }) },
      couponUsage: { findMany: jest.fn() },
    };

    const result = await service.settlePayment(10, db as never);

    expect(result).toEqual({ settled: false, couponIds: [] });
    expect(db.couponUsage.findMany).not.toHaveBeenCalled();
  });

  it('recalcula o contador confirmado de forma idempotente em retries', async () => {
    const db = {
      payment: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ paidAt: new Date('2026-09-13T10:00:00.000Z') }),
      },
      couponUsage: {
        findMany: jest
          .fn()
          .mockImplementation((args: { select?: { payment?: unknown } }) => {
            if (args.select?.payment === undefined) {
              return Promise.resolve([{ couponId: 7 }]);
            }
            return Promise.resolve([
              {
                couponId: 7,
                payment: {
                  status: 'PAID',
                  paidAt: new Date('2026-09-13T10:00:00.000Z'),
                  expiresAt: null,
                },
              },
            ]);
          }),
      },
      coupon: {
        findUnique: jest.fn().mockResolvedValue({
          maxUses: 3,
          active: true,
          validFrom: null,
          validUntil: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const first = await service.settlePayment(10, db as never);
    const second = await service.settlePayment(10, db as never);

    expect(first).toEqual({ settled: true, couponIds: [7] });
    expect(second).toEqual({ settled: true, couponIds: [7] });
    expect(db.coupon.update).toHaveBeenCalledTimes(2);
    expect(db.coupon.update).toHaveBeenNthCalledWith(1, {
      where: { id: 7 },
      data: { usedCount: 1, status: 'ACTIVE' },
    });
    expect(db.coupon.update).toHaveBeenNthCalledWith(2, {
      where: { id: 7 },
      data: { usedCount: 1, status: 'ACTIVE' },
    });
  });

  it('reconcilia cancelamento liberando a reserva sem remover o histórico', async () => {
    const db = {
      couponUsage: {
        findMany: jest
          .fn()
          .mockImplementation((args: { select?: { payment?: unknown } }) => {
            if (args.select?.payment === undefined) {
              return Promise.resolve([{ couponId: 8 }]);
            }
            return Promise.resolve([
              {
                couponId: 8,
                payment: { status: 'CANCELED', paidAt: null, expiresAt: null },
              },
            ]);
          }),
      },
      coupon: {
        findUnique: jest.fn().mockResolvedValue({
          maxUses: 1,
          active: true,
          validFrom: null,
          validUntil: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const result = await service.reconcilePayment(11, db as never);

    expect(result).toEqual({ couponIds: [8] });
    expect(db.coupon.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { usedCount: 0, status: 'ACTIVE' },
    });
    expect(db.couponUsage.findMany).toHaveBeenCalledTimes(2);
  });
});
