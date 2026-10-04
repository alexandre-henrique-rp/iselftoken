import { Test, TestingModule } from '@nestjs/testing';
import { PayloadTooLargeException } from '@nestjs/common';
import { QuotaService, UserPlan } from './quota.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    upload: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserLimits', () => {
    it('deve retornar limites FREE para plano FREE', () => {
      const limits = service.getUserLimits(UserPlan.FREE);

      expect(limits.maxStorageBytes).toBe(500 * 1024 * 1024); // 500MB
      expect(limits.maxUploads).toBe(1000);
      expect(limits.maxFileSizeBytes).toBe(50 * 1024 * 1024); // 50MB
      expect(limits.maxUploadsPerHour).toBe(50);
    });

    it('deve retornar limites PRO para plano PRO', () => {
      const limits = service.getUserLimits(UserPlan.PRO);

      expect(limits.maxStorageBytes).toBe(5 * 1024 * 1024 * 1024); // 5GB
      expect(limits.maxUploads).toBe(10000);
      expect(limits.maxFileSizeBytes).toBe(100 * 1024 * 1024); // 100MB
      expect(limits.maxUploadsPerHour).toBe(200);
    });
  });

  describe('checkQuota', () => {
    it('deve lancar PayloadTooLargeException quando storage excede limite FREE', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 501 * 1024 * 1024 }, // 501MB
      });
      mockPrismaService.upload.count.mockResolvedValue(100);

      await expect(
        service.checkQuota(1, undefined, 1024, UserPlan.FREE),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('deve lancar PayloadTooLargeException quando count de uploads excede limite FREE', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 100 * 1024 * 1024 }, // 100MB
      });
      mockPrismaService.upload.count.mockResolvedValue(1001); // 1001 uploads

      await expect(
        service.checkQuota(1, undefined, 1024, UserPlan.FREE),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('deve lancar PayloadTooLargeException quando arquivo maior que limite FREE', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 100 * 1024 * 1024 }, // 100MB
      });
      mockPrismaService.upload.count.mockResolvedValue(100);

      await expect(
        service.checkQuota(1, undefined, 51 * 1024 * 1024, UserPlan.FREE), // 51MB arquivo
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('deve passar sem excecoes quando dentro do limite FREE', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 100 * 1024 * 1024 }, // 100MB
      });
      mockPrismaService.upload.count.mockResolvedValue(100);

      // 1MB arquivo = dentro do limite
      await expect(
        service.checkQuota(1, undefined, 1 * 1024 * 1024, UserPlan.FREE),
      ).resolves.toBeUndefined();
    });

    it('deve passar com startupId tambem', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 100 * 1024 * 1024 },
      });
      mockPrismaService.upload.count.mockResolvedValue(100);

      await expect(
        service.checkQuota(1, 10, 1 * 1024 * 1024, UserPlan.FREE),
      ).resolves.toBeUndefined();
    });
  });

  describe('getUsage', () => {
    it('deve retornar uso atual do usuario', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: 250 * 1024 * 1024 },
      });
      mockPrismaService.upload.count.mockResolvedValue(500);

      const usage = await service.getUsage(1, undefined);

      expect(usage.usedStorageBytes).toBe(250 * 1024 * 1024);
      expect(usage.uploadCount).toBe(500);
    });

    it('deve retornar 0 quando nao ha uploads', async () => {
      mockPrismaService.upload.aggregate.mockResolvedValue({
        _sum: { size: null },
      });
      mockPrismaService.upload.count.mockResolvedValue(0);

      const usage = await service.getUsage(1, undefined);

      expect(usage.usedStorageBytes).toBe(0);
      expect(usage.uploadCount).toBe(0);
    });
  });
});
