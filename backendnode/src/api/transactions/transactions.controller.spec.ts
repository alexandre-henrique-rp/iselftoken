import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponSettlementService } from '../payment/coupons/coupon-settlement.service';
import { PaymentService } from '../payment/payment.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CouponSettlementService,
          useValue: {
            settlePayment: jest.fn(),
            reconcilePayment: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            processPaymentEffects: jest.fn(),
          },
        },
        {
          provide: CookiesService,
          useValue: {},
        },
        {
          provide: SessionService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
