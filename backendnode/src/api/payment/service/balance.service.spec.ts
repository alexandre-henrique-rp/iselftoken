import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService, UserBalance } from './balance.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('BalanceService', () => {
  let service: BalanceService;
  let prisma: jest.Mocked<PrismaService>;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockPrisma = {
    payment: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
    prisma = module.get(PrismaService);
  });

  describe('getUserBalance', () => {
    it('deve retornar dados do cache quando disponível (cache hit)', async () => {
      const cached: UserBalance = {
        totalConfirmed: 1000,
        totalRefunded: 200,
        netBalance: 800,
        asOf: '2026-08-23T10:00:00.000Z',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getUserBalance(1);

      expect(result).toEqual(cached);
      expect(mockRedis.get).toHaveBeenCalledWith('balance:user:1');
      expect(mockPrisma.payment.aggregate).not.toHaveBeenCalled();
    });

    it('deve fazer query no DB e popular cache quando cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1500n } }) // PAID
        .mockResolvedValueOnce({ _sum: { amount: 300n } }); // REFUNDED

      const result = await service.getUserBalance(1);

      expect(result.totalConfirmed).toBe(1500);
      expect(result.totalRefunded).toBe(300);
      expect(result.netBalance).toBe(1200);
      expect(result.asOf).toBeDefined();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'balance:user:1',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('deve calcular corretamente netBalance = totalConfirmed - totalRefunded', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000n } })
        .mockResolvedValueOnce({ _sum: { amount: 1200n } });

      const result = await service.getUserBalance(1);

      expect(result.netBalance).toBe(3800);
      expect(result.totalConfirmed).toBe(5000);
      expect(result.totalRefunded).toBe(1200);
    });

    it('deve lidar com null (sem transações)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getUserBalance(1);

      expect(result.totalConfirmed).toBe(0);
      expect(result.totalRefunded).toBe(0);
      expect(result.netBalance).toBe(0);
    });
  });
});
