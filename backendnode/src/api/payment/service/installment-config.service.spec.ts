import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InstallmentConfigService } from './installment-config.service';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  installmentConfig: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('InstallmentConfigService', () => {
  let service: InstallmentConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallmentConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<InstallmentConfigService>(InstallmentConfigService);
  });

  describe('create', () => {
    it('cria config e fecha a anterior vigente', async () => {
      const dto = {
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: 100,
      };
      const userId = 1;
      const createdConfig = {
        id: 2,
        ...dto,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
      };

      mockPrisma.installmentConfig.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.installmentConfig.create.mockResolvedValue(createdConfig);

      const result = await service.create(dto, userId);

      expect(mockPrisma.installmentConfig.updateMany).toHaveBeenCalledWith({
        where: { effectiveUntil: null },
        data: { effectiveUntil: expect.any(Date) },
      });
      expect(mockPrisma.installmentConfig.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId,
        action: 'INSTALLMENT_CONFIG_CREATED',
        entity: 'InstallmentConfig',
        entityId: 2,
        newValue: createdConfig,
      });
      expect(result.id).toBe(2);
      expect(result.isActive).toBe(true);
    });

    it('throws 422 limite_efi quando maxInstallments > 18', async () => {
      const dto = {
        interestRate: 0.0299,
        maxInstallments: 19,
        minInstallmentAmount: 100,
      };
      await expect(service.create(dto, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 400 quando minInstallmentAmount < 0', async () => {
      const dto = {
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: -1,
      };
      await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
    });

    it('cria primeira config sem fechar nenhuma anterior', async () => {
      const dto = {
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: 100,
      };
      const createdConfig = {
        id: 1,
        ...dto,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
      };

      mockPrisma.installmentConfig.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.installmentConfig.create.mockResolvedValue(createdConfig);

      const result = await service.create(dto, 1);

      expect(mockPrisma.installmentConfig.updateMany).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('persiste minInstallmentAmount=100 na criação da config', async () => {
      const dto = {
        interestRate: 0.0299,
        maxInstallments: 18,
        minInstallmentAmount: 100,
      };
      mockPrisma.installmentConfig.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.installmentConfig.create.mockImplementation(
        ({ data }: any) => ({
          id: 10,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create(dto, 1);

      expect(mockPrisma.installmentConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ minInstallmentAmount: 100 }),
        }),
      );
      expect(Number(result.minInstallmentAmount)).toBe(100);
    });
  });

  describe('getVigente', () => {
    it('retorna a mais recente com effectiveUntil=null', async () => {
      const config = {
        id: 2,
        interestRate: 0.03,
        maxInstallments: 12,
        minInstallmentAmount: 100,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
      };
      mockPrisma.installmentConfig.findFirst.mockResolvedValue(config);

      const result = await service.getVigente();

      expect(mockPrisma.installmentConfig.findFirst).toHaveBeenCalledWith({
        where: { effectiveUntil: null, isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });
      expect(result).toEqual(config);
    });

    it('retorna null quando nao ha config vigente', async () => {
      mockPrisma.installmentConfig.findFirst.mockResolvedValue(null);

      const result = await service.getVigente();

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('retorna lista paginada', async () => {
      const configs = [
        {
          id: 2,
          interestRate: 0.03,
          maxInstallments: 12,
          minInstallmentAmount: 100,
          effectiveFrom: new Date(),
          effectiveUntil: new Date(),
          isActive: false,
          createdById: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: null,
        },
      ];
      mockPrisma.installmentConfig.findMany.mockResolvedValue(configs);
      mockPrisma.installmentConfig.count.mockResolvedValue(1);

      const result = await service.list(1, 20);

      expect(result.data).toEqual(configs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('deactivate', () => {
    it('marca effectiveUntil=now + isActive=false + AuditLog', async () => {
      const existing = {
        id: 1,
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: 100,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
      };
      const updated = {
        ...existing,
        effectiveUntil: new Date(),
        isActive: false,
      };

      mockPrisma.installmentConfig.findUnique.mockResolvedValue(existing);
      mockPrisma.installmentConfig.update.mockResolvedValue(updated);

      const result = await service.deactivate(1, 1);

      expect(mockPrisma.installmentConfig.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { effectiveUntil: expect.any(Date), isActive: false },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 1,
        action: 'INSTALLMENT_CONFIG_DEACTIVATED',
        entity: 'InstallmentConfig',
        entityId: 1,
        oldValue: { effectiveUntil: null, isActive: true },
        newValue: { effectiveUntil: expect.any(Date), isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException quando config nao existe', async () => {
      mockPrisma.installmentConfig.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException quando config ja desativada', async () => {
      const existing = {
        id: 1,
        effectiveUntil: new Date(),
        isActive: false,
      } as any;
      mockPrisma.installmentConfig.findUnique.mockResolvedValue(existing);

      await expect(service.deactivate(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
