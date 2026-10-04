import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponSettlementService } from '../payment/coupons/coupon-settlement.service';
import { PaymentService } from '../payment/payment.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrismaService = {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CouponSettlementService,
          useValue: {
            settlePayment: jest.fn().mockResolvedValue({
              settled: false,
              couponIds: [],
            }),
            reconcilePayment: jest.fn().mockResolvedValue({ couponIds: [] }),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            processPaymentEffects: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
