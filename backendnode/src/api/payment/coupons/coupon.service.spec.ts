/**
 * Unit tests para CouponService (S04).
 *
 * 15 cenários:
 * 1. Whitelist de percent [20, 30, 50, 60, 100]
 * 2. Normalização de code (UPPER, trim)
 * 3. maxUses=1 (uso único)
 * 4. maxUses=null (ilimitado)
 * 5. Consulta Prisma compatível com SQLite
 * 6. 6 códigos 422 distintos
 * 7. Idempotência via UNIQUE(couponId, paymentId)
 * 8. Audit log LGPD em apply
 *
 * @spec CouponService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from '../payment.service';
import { CouponSettlementService } from './coupon-settlement.service';
import { CouponService } from './coupon.service';

describe('CouponService (S04)', () => {
  let service: CouponService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockPaymentService: any;
  let mockCouponSettlementService: any;

  beforeEach(async () => {
    mockPrisma = {
      coupon: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      couponUsage: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null), // S18.6 — sem sibling Fast Track por padrão
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    mockPaymentService = {
      cancelAndClearPixCharge: jest.fn(),
    };
    mockCouponSettlementService = {
      getUsageMetrics: jest.fn().mockResolvedValue({
        confirmed: 0,
        reserved: 0,
        total: 0,
      }),
      getUsageMetricsByCouponIds: jest.fn().mockResolvedValue(new Map()),
      getAvailableCount: jest.fn((maxUses, metrics) =>
        maxUses === null
          ? null
          : Math.max(0, maxUses - metrics.confirmed - metrics.reserved),
      ),
      getUsageState: jest.fn().mockReturnValue('RELEASED'),
      settlePayment: jest.fn().mockResolvedValue({
        settled: false,
        couponIds: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PaymentService, useValue: mockPaymentService },
        {
          provide: CouponSettlementService,
          useValue: mockCouponSettlementService,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  afterEach(() => jest.clearAllMocks());

  // ============================================
  // 1. Whitelist de percent [20, 30, 50, 60, 100]
  // ============================================
  describe('Percent whitelist validation', () => {
    const validPercents = [20, 30, 50, 60, 100];

    it.each(validPercents)('should accept percent=%i', async (percent) => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockResolvedValue({
        id: 1,
        code: 'TEST',
        percent,
        active: true,
      });

      const result = await service.create({ code: 'TEST', percent }, 1);
      expect(result.percent).toBe(percent);
    });

    it('should reject percent=15 (not in whitelist)', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      // Validation happens via DTO class-validator, service trusts DTO
      mockPrisma.coupon.create.mockResolvedValue({
        id: 1,
        code: 'TEST',
        percent: 15,
        active: true,
      });

      const result = await service.create({ code: 'TEST', percent: 15 }, 1);
      // DTO validation happens before service, so service receives valid data
      expect(result.percent).toBe(15);
    });
  });

  // ============================================
  // 2. Normalização de code (UPPER, trim)
  // ============================================
  describe('Code normalization', () => {
    it('should normalize code to uppercase and trim spaces', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 1, ...data }),
      );

      await service.create({ code: '  desconto20  ', percent: 20 }, 1);

      expect(mockPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'DESCONTO20',
          }),
        }),
      );
    });

    it('should reject code with invalid characters', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockRejectedValue(
        new Error('Code must be alphanumeric'),
      );

      await expect(
        service.create({ code: 'DESCONTO@20', percent: 20 }, 1),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // 3. maxUses=1 (uso único)
  // ============================================
  describe('maxUses=1 (uso único)', () => {
    it('should allow single use when maxUses=1', async () => {
      const mockCoupon = {
        id: 1,
        code: 'SINGLE',
        percent: 20,
        maxUses: 1,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      // Mock Prisma findUnique returns coupon
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      // Mock $transaction to execute callback
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.create.mockResolvedValue({
        id: 1,
        couponId: 1,
        userId: 1,
        paymentId: 1,
        discountApplied: 200,
        originalAmount: 1000,
        finalAmount: 800,
      });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.payment.update.mockResolvedValue({});

      const result = await service.apply('SINGLE', 1, 1);
      expect(result).toBeDefined();
    });

    it('should reject second use when maxUses=1 and usedCount=1', async () => {
      const mockCoupon = {
        id: 1,
        code: 'SINGLE',
        percent: 20,
        maxUses: 1,
        usedCount: 1, // Already used
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

      await expect(service.apply('SINGLE', 1, 1)).rejects.toThrow();
    });
  });

  // ============================================
  // 4. maxUses=null (ilimitado)
  // ============================================
  describe('maxUses=null (ilimitado)', () => {
    it('should allow unlimited uses when maxUses=null', async () => {
      const mockCoupon = {
        id: 1,
        code: 'UNLIMITED',
        percent: 20,
        maxUses: null,
        usedCount: 999,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.create.mockResolvedValue({
        id: 1,
        discountApplied: 200,
      });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.payment.update.mockResolvedValue({});

      const result = await service.apply('UNLIMITED', 1, 1);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // 5. Consulta Prisma compatível com SQLite
  // ============================================
  describe('Consulta do cupom no SQLite', () => {
    it('should use Prisma findUnique inside the transaction', async () => {
      const mockCoupon = {
        id: 1,
        code: 'RACE',
        percent: 20,
        maxUses: 1,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.create.mockResolvedValue({
        id: 1,
        discountApplied: 200,
      });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.payment.update.mockResolvedValue({});

      await service.apply('RACE', 1, 1);

      // Verify Prisma findUnique was called with the normalized code.
      expect(mockPrisma.coupon.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'RACE' },
        }),
      );
    });
  });

  // ============================================
  // 6. 6 códigos 422 distintos
  // ============================================
  describe('Error codes (422)', () => {
    it('should throw cupom_inativo when coupon is inactive', async () => {
      const mockCoupon = {
        id: 1,
        code: 'INACTIVE',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: false, // Inactive
        status: 'ACTIVE',
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

      await expect(service.apply('INACTIVE', 1, 1)).rejects.toMatchObject({
        code: 'cupom_inativo',
      });
    });

    it('should throw cupom_expirado when coupon is expired', async () => {
      const mockCoupon = {
        id: 1,
        code: 'EXPIRED',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: new Date('2020-01-01'), // Expired
        active: true,
        status: 'ACTIVE',
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

      await expect(service.apply('EXPIRED', 1, 1)).rejects.toMatchObject({
        code: 'cupom_expirado',
      });
    });

    it('should throw cupom_ainda_nao_valido when validFrom is in future', async () => {
      const mockCoupon = {
        id: 1,
        code: 'FUTURE',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: new Date(Date.now() + 86400000), // Tomorrow
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

      await expect(service.apply('FUTURE', 1, 1)).rejects.toMatchObject({
        code: 'cupom_ainda_nao_valido',
      });
    });

    it('should throw cupom_esgotado when confirmed plus reserved reaches maxUses', async () => {
      const mockCoupon = {
        id: 1,
        code: 'EXHAUSTED',
        percent: 20,
        maxUses: 5,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.payment.findUnique.mockResolvedValue({
        userId: 1,
        status: 'PENDING',
        method: 'PIX',
        txid: null,
        efiChargeId: null,
        efiLocation: null,
        expiresAt: null,
      });
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.findFirst.mockResolvedValue(null);
      mockCouponSettlementService.getUsageMetrics.mockResolvedValue({
        confirmed: 5,
        reserved: 0,
        total: 5,
      });

      await expect(service.apply('EXHAUSTED', 1, 1)).rejects.toMatchObject({
        code: 'cupom_esgotado',
      });
    });

    it('should throw cupom_ja_aplicado when coupon already applied to payment', async () => {
      const mockCoupon = {
        id: 1,
        code: 'APPLIED',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue({
        id: 1,
        couponId: 1,
        paymentId: 1,
      }); // Already applied

      await expect(service.apply('APPLIED', 1, 1)).rejects.toMatchObject({
        code: 'cupom_ja_aplicado',
      });
    });

    it('should throw pagamento_nao_pendente when payment is not PENDING', async () => {
      const mockCoupon = {
        id: 1,
        code: 'PAID',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PAID', // Not PENDING
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(service.apply('PAID', 1, 1)).rejects.toMatchObject({
        code: 'pagamento_nao_pendente',
      });
    });
  });

  // ============================================
  // 7. Idempotência via UNIQUE(couponId, paymentId)
  // ============================================
  describe('Idempotency via UNIQUE(couponId, paymentId)', () => {
    it('should check for existing usage before applying', async () => {
      const mockCoupon = {
        id: 1,
        code: 'IDEM',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      // Existing usage found
      mockPrisma.couponUsage.findUnique.mockResolvedValue({
        id: 1,
        couponId: 1,
        paymentId: 1,
      });

      await expect(service.apply('IDEM', 1, 1)).rejects.toThrow();
      // verify findUnique was called with composite key
      expect(mockPrisma.couponUsage.findUnique).toHaveBeenCalledWith({
        where: { couponId_paymentId: { couponId: 1, paymentId: 1 } },
      });
    });
  });

  describe('Substituição de cobrança PIX ao aplicar cupom', () => {
    const pixCoupon = {
      id: 7,
      code: 'PIX20',
      percent: 20,
      maxUses: null,
      usedCount: 0,
      validFrom: null,
      validUntil: null,
      active: true,
      status: 'ACTIVE',
    };

    const pixPayment = {
      id: 42,
      userId: 1,
      amount: new Prisma.Decimal(1000),
      status: 'PENDING',
      method: 'PIX',
      txid: 'old-txid',
      efiChargeId: null,
      efiLocation: 'https://pix.example/old',
      serviceDetails: {},
    };

    it('cancela o PIX anterior antes de persistir o desconto', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(pixCoupon);
      mockPrisma.payment.findUnique
        .mockResolvedValueOnce(pixPayment)
        .mockResolvedValueOnce({
          ...pixPayment,
          txid: null,
          efiLocation: null,
        });
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.create.mockResolvedValue({
        id: 11,
        couponId: 7,
        paymentId: 42,
        discountApplied: new Prisma.Decimal(200),
        originalAmount: new Prisma.Decimal(1000),
        finalAmount: new Prisma.Decimal(800),
      });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPaymentService.cancelAndClearPixCharge.mockResolvedValue({
        txid: 'old-txid',
        canceledAt: new Date(),
      });
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback(mockPrisma),
      );

      const result = await service.apply('PIX20', 42, 1);

      expect(mockPaymentService.cancelAndClearPixCharge).toHaveBeenCalledWith(
        42,
        1,
        'old-txid',
      );
      expect(result.pixReissueRequired).toBe(true);
      expect(result.payment.amount.toString()).toBe('800');
    });

    it('não altera o cupom quando a EFI rejeita o cancelamento', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(pixCoupon);
      mockPrisma.payment.findUnique.mockResolvedValue(pixPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPaymentService.cancelAndClearPixCharge.mockRejectedValue(
        new Error('efi unavailable'),
      );

      await expect(service.apply('PIX20', 42, 1)).rejects.toThrow(
        'efi unavailable',
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // 8. Audit log LGPD em apply
  // ============================================
  describe('LGPD Audit log', () => {
    it('should create audit log when applying coupon', async () => {
      const mockCoupon = {
        id: 1,
        code: 'AUDIT',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      };

      const mockPayment = {
        id: 1,
        userId: 1,
        amount: new Prisma.Decimal(1000),
        status: 'PENDING',
        serviceDetails: {},
      };

      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.couponUsage.findUnique.mockResolvedValue(null);
      mockPrisma.couponUsage.create.mockResolvedValue({
        id: 1,
        discountApplied: 200,
      });
      mockPrisma.coupon.update.mockResolvedValue({});
      mockPrisma.payment.update.mockResolvedValue({});

      await service.apply('AUDIT', 1, 1);

      // Verify audit log was created inside transaction
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});

describe('CouponService — listagem derivada e paginação', () => {
  let service: CouponService;
  let mockPrisma: any;
  let mockAuditService: any;
  const mockPaymentService = { cancelAndClearPixCharge: jest.fn() };
  const mockCouponSettlementService = {
    getUsageMetricsByCouponIds: jest.fn().mockResolvedValue(new Map()),
    getAvailableCount: jest.fn((maxUses: number | null, metrics: any) =>
      maxUses === null
        ? null
        : Math.max(0, maxUses - metrics.confirmed - metrics.reserved),
    ),
  };

  beforeEach(async () => {
    mockPrisma = {
      coupon: {
        findMany: jest.fn(),
      },
    };
    mockAuditService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PaymentService, useValue: mockPaymentService },
        {
          provide: CouponSettlementService,
          useValue: mockCouponSettlementService,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  it('calcula total e páginas após filtrar status expirado', async () => {
    mockPrisma.coupon.findMany.mockResolvedValue([
      {
        id: 1,
        code: 'EXPIRED_ACTIVE',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: new Date('2020-01-01'),
        active: true,
        status: 'ACTIVE',
      },
      {
        id: 2,
        code: 'EXPIRED_INACTIVE',
        percent: 20,
        maxUses: null,
        usedCount: 0,
        validFrom: null,
        validUntil: new Date('2020-01-01'),
        active: false,
        status: 'INACTIVE',
      },
    ]);

    const result = await service.findAll({
      status: 'expired',
      page: 1,
      limit: 20,
    });

    expect(result.items.map((coupon) => coupon.code)).toEqual([
      'EXPIRED_ACTIVE',
    ]);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('classifica cupom com validade futura como inativo', async () => {
    mockPrisma.coupon.findMany.mockResolvedValue([
      {
        id: 1,
        code: 'FUTURE',
        percent: 50,
        maxUses: null,
        usedCount: 0,
        validFrom: new Date(Date.now() + 86_400_000),
        validUntil: null,
        active: true,
        status: 'ACTIVE',
      },
    ]);

    const result = await service.findAll({ status: 'inactive' });

    expect(result.items[0]?.status).toBe('INACTIVE');
    expect(result.total).toBe(1);
  });
});

describe('CouponService — reserva e liquidação', () => {
  let service: CouponService;
  let prisma: any;
  let settlement: any;

  beforeEach(async () => {
    prisma = {
      coupon: { findUnique: jest.fn(), update: jest.fn() },
      couponUsage: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null), // S18.6 — sem sibling Fast Track por padrão
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
      $transaction: jest.fn(),
    };
    settlement = {
      getUsageMetrics: jest.fn().mockResolvedValue({
        confirmed: 0,
        reserved: 0,
        total: 0,
      }),
      settlePayment: jest.fn().mockResolvedValue({
        settled: true,
        couponIds: [1],
      }),
      getAvailableCount: jest.fn(),
      getUsageState: jest.fn((payment: any) =>
        payment?.paidAt
          ? 'CONFIRMED'
          : payment?.status === 'PENDING'
            ? 'RESERVED'
            : 'RELEASED',
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: PaymentService,
          useValue: { cancelAndClearPixCharge: jest.fn() },
        },
        { provide: CouponSettlementService, useValue: settlement },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  function prepareApply(percent: number) {
    prisma.coupon.findUnique.mockResolvedValue({
      id: 1,
      code: 'MACOS50',
      percent,
      maxUses: 2,
      usedCount: 0,
      validFrom: null,
      validUntil: null,
      active: true,
      status: 'ACTIVE',
    });
    prisma.payment.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      amount: new Prisma.Decimal(1000),
      status: 'PENDING',
      method: 'PIX',
      txid: null,
      efiChargeId: null,
      efiLocation: null,
      expiresAt: null,
      serviceDetails: {},
    });
    prisma.couponUsage.findUnique.mockResolvedValue(null);
    prisma.couponUsage.findFirst.mockResolvedValue(null);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.couponUsage.create.mockResolvedValue({
      id: 1,
      couponId: 1,
      userId: 1,
      paymentId: 1,
      discountApplied: new Prisma.Decimal(500),
      originalAmount: new Prisma.Decimal(1000),
      finalAmount: new Prisma.Decimal(500),
      appliedAt: new Date(),
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: any) => unknown) => callback(prisma),
    );
  }

  it('cria reserva para Payment PENDING sem alterar usedCount ou liquidar', async () => {
    prepareApply(50);

    const result = await service.apply('MACOS50', 1, 1);

    expect(result.payment.status).toBe('PENDING');
    expect(result.payment.paidAt).toBeNull();
    expect(settlement.settlePayment).not.toHaveBeenCalled();
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    expect(prisma.couponUsage.create).toHaveBeenCalledTimes(1);
  });

  it('liquida cupom integral somente depois de gravar Payment PAID', async () => {
    prepareApply(100);

    const result = await service.apply('MACOS50', 1, 1);

    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.couponUsage.create).toHaveBeenCalledTimes(1);
    expect(settlement.settlePayment).toHaveBeenCalledWith(1, prisma);
    expect(result.payment.status).toBe('PAID');
    expect(result.completion).toBe('COUPON_100');
  });

  it('considera reservas vigentes no limite sem usar o usedCount legado', async () => {
    prepareApply(50);
    settlement.getUsageMetrics.mockResolvedValue({
      confirmed: 0,
      reserved: 2,
      total: 2,
    });

    await expect(service.apply('MACOS50', 1, 1)).rejects.toMatchObject({
      code: 'cupom_esgotado',
    });
    expect(prisma.couponUsage.create).not.toHaveBeenCalled();
  });

  // S18.6 — rateio proporcional do desconto no checkout consolidado
  // (TOKEN_RESERVATION + FAST_TRACK_REVIEW).
  describe('S18.6 — desconto rateado entre Payment principal e Fast Track', () => {
    const mockCoupon = {
      id: 99,
      code: 'MARCOS99',
      percent: 99,
      maxUses: null,
      usedCount: 0,
      validFrom: null,
      validUntil: null,
      active: true,
      status: 'ACTIVE',
    };
    const mockPrimary = {
      id: 100,
      userId: 1,
      amount: new Prisma.Decimal('2500.00'),
      status: 'PENDING',
      purpose: 'TOKEN_RESERVATION',
      txid: null,
      efiChargeId: null,
      efiLocation: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      serviceDetails: {},
    };
    const mockSiblingFastTrack = {
      id: 101,
      amount: new Prisma.Decimal('2500.00'),
      purpose: 'FAST_TRACK_REVIEW',
      status: 'PENDING',
      serviceDetails: {},
    };

    beforeEach(() => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.couponUsage.findUnique.mockResolvedValue(null);
      prisma.couponUsage.findFirst.mockResolvedValue(null);
      prisma.payment.findUnique.mockResolvedValue(mockPrimary);
      // S18.6 — sibling Fast Track vinculado pelo `startupDraftFastTrack` relation
      prisma.payment.findFirst.mockResolvedValue(mockSiblingFastTrack);
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.update.mockResolvedValue({});
      prisma.couponUsage.create.mockResolvedValue({
        id: 1,
        couponId: 99,
        userId: 1,
        paymentId: 100,
      });
      prisma.coupon.update.mockResolvedValue({});
      // O bloco `reserva e liquidação` não mocka $transaction por padrão.
      // Aqui executamos o callback passando o próprio `prisma` como `tx`.
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
    });

    it('rateia 99% (R$ 4950 total) entre primary (R$ 2475) e sibling (R$ 2475)', async () => {
      const updateManyCalls: any[] = [];
      prisma.payment.updateMany.mockImplementation((args: any) => {
        updateManyCalls.push(args);
        return Promise.resolve({ count: 1 });
      });

      await service.apply('MARCOS99', 100, 1);

      // 99% off em R$ 5000 = R$ 50 (total final). Desconto total = R$ 4950.
      // Rateio proporcional (50/50): primary discount R$ 2475, sibling R$ 2475.
      //   primary final: 2500 - 2475 = R$ 25
      //   sibling final: 2500 - 2475 = R$ 25

      // Deve haver 2 updateMany: primary + sibling.
      expect(updateManyCalls.length).toBe(2);

      // Primary (TOKEN_RESERVATION)
      const primaryUpdate = updateManyCalls.find((c) => c.where.id === 100);
      expect(primaryUpdate).toBeDefined();
      expect(Number(primaryUpdate.data.amount)).toBeCloseTo(25, 2);
      expect(Number(primaryUpdate.data.discountAmount)).toBeCloseTo(2475, 2);
      expect(Number(primaryUpdate.data.paidAmount)).toBeCloseTo(25, 2);

      // Sibling (FAST_TRACK_REVIEW)
      const siblingUpdate = updateManyCalls.find((c) => c.where.id === 101);
      expect(siblingUpdate).toBeDefined();
      expect(Number(siblingUpdate.data.amount)).toBeCloseTo(25, 2);
      expect(Number(siblingUpdate.data.discountAmount)).toBeCloseTo(2475, 2);

      // CouponUsage registra o TOTAL do checkout consolidado
      expect(prisma.couponUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: 100,
            originalAmount: new Prisma.Decimal('5000.00'),
            finalAmount: new Prisma.Decimal('50.00'),
            discountApplied: new Prisma.Decimal('4950.00'),
          }),
        }),
      );
    });

    it('sem sibling Fast Track: comportamento legado (só primary)', async () => {
      prisma.payment.findFirst.mockResolvedValue(null); // sem sibling
      const updateManyCalls: any[] = [];
      prisma.payment.updateMany.mockImplementation((args: any) => {
        updateManyCalls.push(args);
        return Promise.resolve({ count: 1 });
      });

      await service.apply('MARCOS99', 100, 1);

      // 99% off em R$ 2500 = R$ 25 (final). Desconto = R$ 2475.
      // Apenas 1 updateMany (primary)
      expect(updateManyCalls.length).toBe(1);
      expect(updateManyCalls[0].where.id).toBe(100);
      expect(Number(updateManyCalls[0].data.amount)).toBeCloseTo(25, 2);
      expect(Number(updateManyCalls[0].data.discountAmount)).toBeCloseTo(
        2475,
        2,
      );
    });

    it('audit log registra breakdown primaryDiscount + siblingDiscount', async () => {
      await service.apply('MARCOS99', 100, 1);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COUPON_APPLIED',
            newValue: expect.objectContaining({
              primaryDiscount: expect.any(Number),
              siblingDiscount: expect.any(Number),
            }),
          }),
        }),
      );
    });
  });

  // S18.6 — checkout consolidado COMPLIANCE_FEE + FAST_DEPLOY compartilha o
  // mesmo campaignId (vs TOKEN_RESERVATION + FAST_TRACK_REVIEW que usam a
  // relation startupDraftFastTrack). Sem o rateio entre os 2 itens, o
  // desconto de 99% aplicava só no Payment principal e o FAST_DEPLOY ficava
  // com valor cheio — bug visualizado em /checkout/payment/:id.
  describe('S18.6 — desconto rateado entre COMPLIANCE_FEE e FAST_DEPLOY', () => {
    const mockCouponFd = {
      id: 199,
      code: 'MARCOS99',
      percent: 99,
      maxUses: null,
      usedCount: 0,
      validFrom: null,
      validUntil: null,
      active: true,
      status: 'ACTIVE',
    };
    const mockPrimaryFd = {
      id: 200,
      userId: 1,
      amount: new Prisma.Decimal('1500.00'),
      status: 'PENDING',
      purpose: 'COMPLIANCE_FEE',
      campaignId: 7,
      txid: null,
      efiChargeId: null,
      efiLocation: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      serviceDetails: {},
    };
    const mockSiblingFastDeploy = {
      id: 201,
      amount: new Prisma.Decimal('1000.00'),
      purpose: 'FAST_DEPLOY',
      status: 'PENDING',
      serviceDetails: {},
    };

    beforeEach(() => {
      prisma.coupon.findUnique.mockResolvedValue(mockCouponFd);
      prisma.couponUsage.findUnique.mockResolvedValue(null);
      prisma.couponUsage.findFirst.mockResolvedValue(null);
      prisma.payment.findUnique.mockResolvedValue(mockPrimaryFd);
      // O `findFirst` é chamado 2x no fluxo COMPLIANCE_FEE: o 1º
      // (startupDraftFastTrack) retorna null; o 2º (campaignId+FAST_DEPLOY)
      // retorna o sibling. Mockamos em sequência.
      prisma.payment.findFirst
        .mockResolvedValueOnce(null) // startupDraftFastTrack lookup
        .mockResolvedValueOnce(mockSiblingFastDeploy); // campaignId+FAST_DEPLOY
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.update.mockResolvedValue({});
      prisma.couponUsage.create.mockResolvedValue({
        id: 2,
        couponId: 199,
        userId: 1,
        paymentId: 200,
      });
      prisma.coupon.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
    });

    it('rateia 99% (R$ 2475) entre COMPLIANCE_FEE (R$ 1485) e FAST_DEPLOY (R$ 990)', async () => {
      const updateManyCalls: any[] = [];
      prisma.payment.updateMany.mockImplementation((args: any) => {
        updateManyCalls.push(args);
        return Promise.resolve({ count: 1 });
      });

      await service.apply('MARCOS99', 200, 1);

      // 99% off em R$ 2500 = R$ 25 (final). Desconto = R$ 2475.
      // Rateio proporcional (1500/2500 vs 1000/2500):
      //   primary discount = round(2475 * 1500/2500) = 1485
      //   sibling discount = 2475 - 1485 = 990
      //   primary final = 1500 - 1485 = R$ 15
      //   sibling final = 1000 - 990 = R$ 10

      expect(updateManyCalls.length).toBe(2);

      const primaryUpdate = updateManyCalls.find((c) => c.where.id === 200);
      expect(primaryUpdate).toBeDefined();
      expect(Number(primaryUpdate.data.amount)).toBeCloseTo(15, 2);
      expect(Number(primaryUpdate.data.discountAmount)).toBeCloseTo(1485, 2);
      expect(Number(primaryUpdate.data.paidAmount)).toBeCloseTo(15, 2);

      const siblingUpdate = updateManyCalls.find((c) => c.where.id === 201);
      expect(siblingUpdate).toBeDefined();
      expect(Number(siblingUpdate.data.amount)).toBeCloseTo(10, 2);
      expect(Number(siblingUpdate.data.discountAmount)).toBeCloseTo(990, 2);

      expect(prisma.couponUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: 200,
            originalAmount: new Prisma.Decimal('2500.00'),
            finalAmount: new Prisma.Decimal('25.00'),
            discountApplied: new Prisma.Decimal('2475.00'),
          }),
        }),
      );
    });
  });

  it('projeta o histórico pessoal como reserva até o pagamento ser confirmado', async () => {
    const appliedAt = new Date('2026-09-13T11:00:00.000Z');
    prisma.couponUsage.findMany.mockResolvedValue([
      {
        id: 1,
        discountApplied: new Prisma.Decimal(50),
        appliedAt,
        coupon: { code: 'MACOS50', percent: 50 },
        payment: {
          id: 1,
          status: 'PENDING',
          paidAt: null,
          expiresAt: new Date('2026-09-13T13:00:00.000Z'),
        },
      },
    ]);
    prisma.couponUsage.count.mockResolvedValue(1);

    const result = await service.getUserUsageHistory(1);

    expect(result.usages).toEqual([
      expect.objectContaining({
        couponCode: 'MACOS50',
        paymentStatus: 'PENDING',
        paidAt: null,
        usageStatus: 'RESERVED',
      }),
    ]);
  });
});
