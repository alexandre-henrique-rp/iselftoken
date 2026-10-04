/**
 * Unit tests para SplitService (S05 T043).
 *
 * Testa:
 * 1. create rejeita soma != 100% com UnprocessableEntityException (code: invalid_split_percent)
 * 2. create persiste SplitConfig + AuditLog + invalida cache Redis
 * 3. listActive usa cache Redis se disponível (sem chamada Prisma)
 * 4. listActive busca DB se cache vazio e popula cache (TTL 300)
 * 5. deactivate marca isActive=false + AuditLog + invalida cache
 * 6. findOne lança NotFoundException se não existe
 * 7. update com novos percentuais revalida soma == 100%
 *
 * @spec SplitService
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { SplitService } from './split.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { Redis } from 'ioredis';

describe('SplitService (S05 T043)', () => {
  let service: SplitService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockRedis: any;

  const sampleSplitsJson = [
    { role: 'platform', percentage: 5, description: 'Plataforma' },
    { role: 'founder', percentage: 90, description: 'Founder' },
    { role: 'investor', percentage: 5, description: 'Cashback Investidor' },
  ];

  const sampleSplitRecord = {
    id: 'cuid-abc123',
    efiSplitId: 0,
    name: 'Split Teste',
    description: null,
    splits: sampleSplitsJson,
    active: true,
    createdById: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    cancelledAt: null,
    cancelledById: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      splitConfig: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<SplitService>(SplitService);
  });

  afterEach(() => jest.clearAllMocks());

  // ============================================
  // 1. create rejeita soma != 100%
  // ============================================
  describe('create — validação de percentuais', () => {
    it('rejeita soma = 95% com UnprocessableEntityException code invalid_split_percent', async () => {
      await expect(
        service.create({
          name: 'Split Inválido',
          platformPercent: 5,
          founderPercent: 90,
          investorCashbackPercent: 0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        service.create({
          name: 'Split Inválido',
          platformPercent: 5,
          founderPercent: 90,
          investorCashbackPercent: 0,
        }),
      ).rejects.toMatchObject({
        response: { code: 'invalid_split_percent' },
      });
    });

    it('rejeita soma = 110%', async () => {
      await expect(
        service.create({
          name: 'Split Inválido',
          platformPercent: 10,
          founderPercent: 100,
          investorCashbackPercent: 0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejeita sem investorCashbackPercent (soma 95%)', async () => {
      await expect(
        service.create({
          name: 'Split Sem Investor',
          platformPercent: 5,
          founderPercent: 90,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('aceita soma exatamente 100% com investorCashbackPercent', async () => {
      const created = { ...sampleSplitRecord };
      mockPrisma.splitConfig.create.mockResolvedValue(created);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.create({
        name: 'Split Válido',
        platformPercent: 5,
        founderPercent: 90,
        investorCashbackPercent: 5,
      });

      expect(result.platformPercent).toBe(5);
      expect(result.founderPercent).toBe(90);
      expect(result.investorCashbackPercent).toBe(5);
    });

    it('aceita soma exatamente 100% sem investorCashbackPercent', async () => {
      const created = {
        ...sampleSplitRecord,
        splits: [
          { role: 'platform', percentage: 10, description: 'Plataforma' },
          { role: 'founder', percentage: 90, description: 'Founder' },
        ],
      };
      mockPrisma.splitConfig.create.mockResolvedValue(created);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.create({
        name: 'Split Só Platform + Founder',
        platformPercent: 10,
        founderPercent: 90,
      });

      expect(result.investorCashbackPercent).toBe(0);
    });
  });

  // ============================================
  // 2. create persiste + AuditLog + invalida cache
  // ============================================
  it('create: persiste SplitConfig, chama AuditLog.log e invalida cache Redis', async () => {
    const created = { ...sampleSplitRecord };
    mockPrisma.splitConfig.create.mockResolvedValue(created);
    mockRedis.del.mockResolvedValue(1);

    await service.create({
      name: 'Split Válido',
      platformPercent: 5,
      founderPercent: 95,
      investorCashbackPercent: 0,
    });

    expect(mockPrisma.splitConfig.create).toHaveBeenCalledTimes(1);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SPLIT_CONFIG_CREATED',
        entity: 'SplitConfig',
      }),
    );
    expect(mockRedis.del).toHaveBeenCalledWith('split:active');
  });

  // ============================================
  // 3. listActive usa cache Redis se disponível
  // ============================================
  it('listActive: retorna do cache Redis sem chamar Prisma findMany', async () => {
    const cached = [
      {
        id: 'cached-1',
        name: 'Cached Split',
        platformPercent: 5,
        founderPercent: 90,
        investorCashbackPercent: 5,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.listActive();

    expect(mockRedis.get).toHaveBeenCalledWith('split:active');
    expect(mockPrisma.splitConfig.findMany).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  // ============================================
  // 4. listActive busca DB se cache vazio e popula cache TTL 300
  // ============================================
  it('listActive: busca DB se cache vazio e popula Redis com TTL 300', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.splitConfig.findMany.mockResolvedValue([sampleSplitRecord]);
    mockRedis.set.mockResolvedValue('OK');

    const result = await service.listActive();

    expect(mockPrisma.splitConfig.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockRedis.set).toHaveBeenCalledWith(
      'split:active',
      expect.any(String),
      'EX',
      300,
    );
    expect(result).toHaveLength(1);
    expect(result[0].platformPercent).toBe(5);
  });

  // ============================================
  // 5. deactivate marca isActive=false
  // ============================================
  it('deactivate: atualiza active=false, AuditLog, invalida cache', async () => {
    mockPrisma.splitConfig.findFirst.mockResolvedValue(sampleSplitRecord);
    mockPrisma.splitConfig.update.mockResolvedValue({
      ...sampleSplitRecord,
      active: false,
    });
    mockRedis.del.mockResolvedValue(1);

    const result = await service.deactivate(1);

    expect(result.isActive).toBe(false);
    expect(mockPrisma.splitConfig.update).toHaveBeenCalledWith({
      where: { id: 'cuid-abc123' },
      data: { active: false },
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SPLIT_CONFIG_DEACTIVATED',
        entity: 'SplitConfig',
        entityId: 'cuid-abc123',
      }),
    );
    expect(mockRedis.del).toHaveBeenCalledWith('split:active');
  });

  // ============================================
  // 6. findOne lança NotFoundException se não existe
  // ============================================
  it('findOne: lança NotFoundException se split não existe', async () => {
    mockPrisma.splitConfig.findFirst.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    await expect(service.findOne(999)).rejects.toMatchObject({
      response: { code: 'split_not_found' },
    });
  });

  // ============================================
  // 7. update revalida soma se percentuais mudam
  // ============================================
  it('update: rejeita soma != 100% quando percentual é alterado', async () => {
    mockPrisma.splitConfig.findFirst.mockResolvedValue(sampleSplitRecord);

    await expect(service.update(1, { platformPercent: 1 })).rejects.toThrow(
      UnprocessableEntityException,
    );

    await expect(
      service.update(1, { platformPercent: 1 }),
    ).rejects.toMatchObject({
      response: { code: 'invalid_split_percent' },
    });
  });

  it('update: permite alteração de name sem revalidar percentuais', async () => {
    mockPrisma.splitConfig.findFirst.mockResolvedValue(sampleSplitRecord);
    mockPrisma.splitConfig.update.mockResolvedValue({
      ...sampleSplitRecord,
      name: 'Nome Atualizado',
    });
    mockRedis.del.mockResolvedValue(1);

    const result = await service.update(1, { name: 'Nome Atualizado' });

    expect(result.name).toBe('Nome Atualizado');
    expect(mockPrisma.splitConfig.update).toHaveBeenCalled();
  });
});
