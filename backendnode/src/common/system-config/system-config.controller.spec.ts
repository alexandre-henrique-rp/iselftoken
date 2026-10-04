/**
 * Specs do SystemConfigController.
 *
 * Cobre:
 * - GET /admin/configs        — retorna snapshot completo
 * - GET /admin/configs/:key   — retorna 1 chave (404 se inválida)
 * - PATCH /admin/configs/:key — atualiza e propaga userId
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import type { FinancialConfigs } from './interfaces/financial-configs.interface';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';

const REDIS_CONNECTION_TOKEN = 'default_IORedisModuleConnectionToken';

describe('SystemConfigController', () => {
  let controller: SystemConfigController;
  let mockService: {
    getFinancialConfigs: jest.Mock;
    get: jest.Mock;
    setConfig: jest.Mock;
  };

  const user = { id: 7, role: 'ADMIN' } as any;
  const req = { user } as any;

  beforeEach(async () => {
    mockService = {
      getFinancialConfigs: jest.fn(),
      get: jest.fn(),
      setConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [
        { provide: SystemConfigService, useValue: mockService },
        {
          provide: REDIS_CONNECTION_TOKEN,
          useValue: { get: jest.fn(), setex: jest.fn(), del: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    })
      // Guards sao sobrescritos: teste foca no controller, nao no auth flow.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SystemConfigController>(SystemConfigController);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/configs', () => {
    it('1. retorna snapshot completo de configs', async () => {
      const snapshot: FinancialConfigs = {
        TOKEN_BASE_VALUE: 200,
        TOKEN_TRANSACTION_FEE: 40,
        TOKEN_MINT_FEE: 1,
        PLATFORM_ADMIN_FEE_PCT: 0.2,
        COMPLIANCE_FEE: 500,
        FAST_DEPLOY_FEE: 1000,
        CAMPAIGN_MIN_TARGET: 500000,
        CAMPAIGN_MAX_TARGET: 10000000,
        CAMPAIGN_MIN_TOKENS: 100,
        CAMPAIGN_MAX_TOKENS: 1000000,
      };
      mockService.getFinancialConfigs.mockResolvedValueOnce(snapshot);

      const response = await controller.listAll();

      expect(response.error).toBe(false);
      expect(response.codigo).toBe(200);
      expect(response.data).toEqual(snapshot);
    });
  });

  describe('GET /admin/configs/:key', () => {
    it('2. retorna 1 chave via service.get', async () => {
      mockService.get.mockResolvedValueOnce(0.2);

      const response = await controller.getOne('PLATFORM_ADMIN_FEE_PCT');

      expect(mockService.get).toHaveBeenCalledWith('PLATFORM_ADMIN_FEE_PCT');
      expect(response.data).toEqual({
        key: 'PLATFORM_ADMIN_FEE_PCT',
        value: 0.2,
      });
    });

    it('3. retorna 404 se chave nao existe no enum', async () => {
      const response = await controller.getOne('CHAVE_INEXISTENTE');

      expect(response.error).toBe(true);
      expect(response.codigo).toBe(404);
      expect(mockService.get).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /admin/configs/:key', () => {
    it('4. chama service.setConfig propagando userId do request', async () => {
      mockService.setConfig.mockResolvedValueOnce({
        key: 'PLATFORM_ADMIN_FEE_PCT',
        value: 0.25,
        updatedBy: 7,
      });

      const response = await controller.update(
        'PLATFORM_ADMIN_FEE_PCT',
        { value: 0.25 },
        req,
      );

      expect(mockService.setConfig).toHaveBeenCalledWith(
        'PLATFORM_ADMIN_FEE_PCT',
        0.25,
        7,
      );
      expect(response.error).toBe(false);
      expect(response.data?.updatedBy).toBe(7);
    });

    it('5. retorna 404 se chave nao existe no enum', async () => {
      const response = await controller.update(
        'CHAVE_INEXISTENTE',
        { value: 0.1 },
        req,
      );

      expect(response.error).toBe(true);
      expect(response.codigo).toBe(404);
      expect(mockService.setConfig).not.toHaveBeenCalled();
    });
  });
});
