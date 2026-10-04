import { Test, TestingModule } from '@nestjs/testing';
import { StatementService } from './statement.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('StatementService', () => {
  let service: StatementService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    payment: {
      findMany: jest.fn(),
    },
  };

  const samplePayments = [
    {
      id: 1,
      userId: 1,
      purpose: 'INVESTMENT',
      method: 'PIX',
      amount: 1000n,
      status: 'PAID',
      createdAt: new Date('2026-08-01T10:00:00Z'),
      paidAt: new Date('2026-08-01T10:05:00Z'),
    },
    {
      id: 2,
      userId: 1,
      purpose: 'SUBSCRIPTION',
      method: 'CREDIT_CARD',
      amount: 500n,
      status: 'PAID',
      createdAt: new Date('2026-08-10T14:00:00Z'),
      paidAt: new Date('2026-08-10T14:10:00Z'),
    },
    {
      id: 3,
      userId: 1,
      purpose: 'INVESTMENT',
      method: 'PIX',
      amount: 200n,
      status: 'REFUNDED',
      createdAt: new Date('2026-08-15T09:00:00Z'),
      paidAt: new Date('2026-08-15T09:05:00Z'),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StatementService>(StatementService);
    prisma = module.get(PrismaService);
  });

  describe('getStatement', () => {
    it('deve retornar formato JSON com transactions e summary', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(samplePayments);

      const result = await service.getStatement(1, { format: 'JSON' });

      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray((result as any).transactions)).toBe(true);
    });

    it('deve retornar formato CNAB240 como string', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(samplePayments);

      const result = await service.getStatement(1, { format: 'CNAB240' });

      expect(typeof result).toBe('string');
      expect((result as string).includes('IselfToken Statement')).toBe(true);
      expect((result as string).includes('─'.repeat(70))).toBe(true);
    });

    it('deve filtrar por período com startDate e endDate', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(samplePayments.slice(0, 2));

      await service.getStatement(1, {
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-12T23:59:59Z',
        format: 'JSON',
      });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
            status: { in: ['PAID', 'REFUNDED'] },
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('deve calcular summary correto no formato JSON', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(samplePayments);

      const result = await service.getStatement(1, { format: 'JSON' });
      const summary = (result as any).summary;

      expect(summary.totalConfirmed).toBe(1500); // 1000 + 500
      expect(summary.totalRefunded).toBe(200);
      expect(summary.count).toBe(3);
    });

    it('deve incluir transactions no formato JSON', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(samplePayments);

      const result = await service.getStatement(1, { format: 'JSON' });
      const transactions = (result as any).transactions;

      expect(transactions).toHaveLength(3);
      expect(transactions[0]).toMatchObject({
        id: 1,
        amount: 1000,
        status: 'PAID',
      });
    });
  });
});
