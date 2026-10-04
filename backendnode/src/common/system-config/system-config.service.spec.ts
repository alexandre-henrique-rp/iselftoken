/**
 * Specs do SystemConfigService — TDD S01.1.
 *
 * Cobre:
 * - Cache hit/miss em `getFinancialConfigs()`
 * - Invalidação após `setConfig` e após `invalidateCache`
 * - Tipagem forte em `get<K>(key)`
 * - `setConfig` upserta no Prisma e invalida cache IMEDIATAMENTE
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from './system-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { FinancialConfigs } from './interfaces/financial-configs.interface';

const REDIS_CONNECTION_TOKEN = 'default_IORedisModuleConnectionToken';

/** Snapshot de configs válidas para popular o mock do Prisma. */
const DEFAULT_DB_ROWS: Array<{
  key: keyof FinancialConfigs;
  value: { toString(): string };
  description: string | null;
  updatedAt: Date;
  updatedBy: number | null;
}> = [
  {
    key: 'TOKEN_BASE_VALUE',
    value: { toString: () => '200' },
    description: 'Token base',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'TOKEN_TRANSACTION_FEE',
    value: { toString: () => '40' },
    description: 'Taxa tx',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'TOKEN_MINT_FEE',
    value: { toString: () => '1' },
    description: 'Mint fee',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'PLATFORM_ADMIN_FEE_PCT',
    value: { toString: () => '0.20' },
    description: 'Admin %',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'COMPLIANCE_FEE',
    value: { toString: () => '500' },
    description: 'Compliance',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'CAMPAIGN_MIN_TARGET',
    value: { toString: () => '500000' },
    description: 'Min target',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'CAMPAIGN_MAX_TARGET',
    value: { toString: () => '10000000' },
    description: 'Max target',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'CAMPAIGN_MIN_TOKENS',
    value: { toString: () => '100' },
    description: 'Min tokens',
    updatedAt: new Date(),
    updatedBy: null,
  },
  {
    key: 'CAMPAIGN_MAX_TOKENS',
    value: { toString: () => '1000000' },
    description: 'Max tokens',
    updatedAt: new Date(),
    updatedBy: null,
  },
];

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockPrisma: { systemConfig: { findMany: jest.Mock; upsert: jest.Mock } };
  let mockRedis: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue(DEFAULT_DB_ROWS),
        upsert: jest.fn(),
      },
    };
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CONNECTION_TOKEN, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
    // Silencia o logger durante os testes para nao poluir o output.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============ getFinancialConfigs ============

  describe('getFinancialConfigs', () => {
    it('1. primeira chamada: cache miss -> busca no DB e popula cache', async () => {
      const configs = await service.getFinancialConfigs();

      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex.mock.calls[0][0]).toBe('financial_configs');
      expect(configs.TOKEN_BASE_VALUE).toBe(200);
      expect(configs.PLATFORM_ADMIN_FEE_PCT).toBe(0.2);
    });

    it('2. segunda chamada: cache hit -> NAO consulta DB', async () => {
      // Pre-popula cache com snapshot
      const cached: FinancialConfigs = {
        TOKEN_BASE_VALUE: 250,
        TOKEN_TRANSACTION_FEE: 50,
        TOKEN_MINT_FEE: 2,
        PLATFORM_ADMIN_FEE_PCT: 0.25,
        COMPLIANCE_FEE: 600,
        FAST_DEPLOY_FEE: 1000,
        CAMPAIGN_MIN_TARGET: 600000,
        CAMPAIGN_MAX_TARGET: 12000000,
        CAMPAIGN_MIN_TOKENS: 200,
        CAMPAIGN_MAX_TOKENS: 2000000,
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const configs = await service.getFinancialConfigs();

      expect(mockPrisma.systemConfig.findMany).not.toHaveBeenCalled();
      expect(configs.TOKEN_BASE_VALUE).toBe(250);
      expect(configs.PLATFORM_ADMIN_FEE_PCT).toBe(0.25);
    });

    it('3. retorna todas as 9 chaves tipadas', async () => {
      const configs = await service.getFinancialConfigs();
      const keys: Array<keyof FinancialConfigs> = [
        'TOKEN_BASE_VALUE',
        'TOKEN_TRANSACTION_FEE',
        'TOKEN_MINT_FEE',
        'PLATFORM_ADMIN_FEE_PCT',
        'COMPLIANCE_FEE',
        'CAMPAIGN_MIN_TARGET',
        'CAMPAIGN_MAX_TARGET',
        'CAMPAIGN_MIN_TOKENS',
        'CAMPAIGN_MAX_TOKENS',
      ];
      for (const k of keys) {
        expect(configs).toHaveProperty(String(k));
        expect(typeof configs[k]).toBe('number');
      }
    });
  });

  // ============ invalidateCache ============

  describe('invalidateCache', () => {
    it('4. apos invalidar, proxima chamada busca do DB novamente', async () => {
      // 1a chamada popula cache
      await service.getFinancialConfigs();
      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledTimes(1);

      await service.invalidateCache();
      expect(mockRedis.del).toHaveBeenCalledWith('financial_configs');

      // 2a chamada apos invalidar -> DB novamente
      await service.getFinancialConfigs();
      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledTimes(2);
    });
  });

  // ============ setConfig ============

  describe('setConfig', () => {
    it('5. atualiza DB via upsert e invalida cache IMEDIATAMENTE', async () => {
      mockPrisma.systemConfig.upsert.mockResolvedValueOnce({
        key: 'PLATFORM_ADMIN_FEE_PCT',
        value: { toString: () => '0.25' },
        description: null,
        updatedAt: new Date(),
        updatedBy: 42,
      });

      await service.setConfig('PLATFORM_ADMIN_FEE_PCT', 0.25, 42);

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'PLATFORM_ADMIN_FEE_PCT' },
        update: { value: 0.25, updatedBy: 42 },
        create: { key: 'PLATFORM_ADMIN_FEE_PCT', value: 0.25, updatedBy: 42 },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('financial_configs');
    });
  });

  // ============ get<K> ============

  describe('get<K extends keyof FinancialConfigs>', () => {
    it('6. retorna valor de uma chave especifica', async () => {
      const tokenBase = await service.get('TOKEN_BASE_VALUE');
      expect(tokenBase).toBe(200);
      expect(typeof tokenBase).toBe('number');
    });

    it('7. lanca NotFoundException se chave nao existe no DB', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValueOnce([]);

      await expect(service.get('COMPLIANCE_FEE')).rejects.toThrow(
        'Chave de configuração não encontrada: COMPLIANCE_FEE',
      );
    });

    it('8. tipagem forte: get<K> retorna tipo da chave', async () => {
      // Compilacao: o tipo deve ser number, nao any.
      const v: number = await service.get('CAMPAIGN_MIN_TARGET');
      expect(v).toBe(500000);
    });
  });
});
