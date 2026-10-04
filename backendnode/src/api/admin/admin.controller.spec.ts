import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { AdminConfigController } from './admin.controller';

const MOCK_FINANCE_CONFIG_ROWS = [
  { key: 'fundraising.authFeePerToken', value: '1' },
  { key: 'fundraising.minCampaign', value: '10000' },
  { key: 'fundraising.maxCampaign', value: '5000000' },
  { key: 'fundraising.equityMin', value: '5' },
  { key: 'fundraising.equityMax', value: '49' },
  { key: 'fundraising.tokenPrice', value: '200' },
  { key: 'fundraising.platformFee', value: '0.05' },
  { key: 'fundraising.fastTrackReview', value: '600' },
  { key: 'fundraising.complianceFee', value: '1500' },
  { key: 'fundraising.fastTrackFee', value: '2500' },
];

describe('AdminConfigController', () => {
  let controller: AdminConfigController;
  let mockFinanceConfig: any;
  let mockConfigService: any;

  const mockPrismaService = {
    financeConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFinanceConfig = mockPrismaService.financeConfig;
    mockConfigService = {
      listForAdmin: jest.fn(),
      setValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminConfigController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminConfigController>(AdminConfigController);
  });

  it('protege a classe com AuthGuard e AdminGuard', () => {
    const guards =
      Reflect.getMetadata('__guards__', AdminConfigController) ?? [];

    expect(guards).toEqual(expect.arrayContaining([AuthGuard, AdminGuard]));
  });

  describe('getFundraisingConfig', () => {
    it('should return all 10 fundraising config fields from DB (8 old + complianceFee + fastTrackFee)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      const result = await controller.getFundraisingConfig();

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data).toHaveProperty('authFeePerToken');
      expect(result.data).toHaveProperty('minCampaign');
      expect(result.data).toHaveProperty('maxCampaign');
      expect(result.data).toHaveProperty('equityMin');
      expect(result.data).toHaveProperty('equityMax');
      expect(result.data).toHaveProperty('tokenPrice');
      expect(result.data).toHaveProperty('platformFee');
      expect(result.data).toHaveProperty('fastTrackReview');
      expect(result.data).toHaveProperty('complianceFee');
      expect(result.data).toHaveProperty('fastTrackFee');
      expect(result.data.complianceFee).toBe(1500);
      expect(result.data.fastTrackFee).toBe(2500);
    });

    it('should return tokenPrice=200 and fastTrackReview=600 from DB', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      const result = await controller.getFundraisingConfig();

      expect(result.data.tokenPrice).toBe(200);
      expect(result.data.fastTrackReview).toBe(600);
    });

    it('should use default values when DB rows are empty', async () => {
      mockFinanceConfig.findMany.mockResolvedValue([]);

      const result = await controller.getFundraisingConfig();

      expect(result.data.tokenPrice).toBe(200);
      expect(result.data.fastTrackReview).toBe(600);
      expect(result.data.authFeePerToken).toBe(1);
    });
  });

  describe('updateFundraisingConfig', () => {
    it('should update tokenPrice in DB via upsert', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await controller.updateFundraisingConfig({ tokenPrice: 250 });

      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'fundraising.tokenPrice' },
        update: { value: '250' },
        create: {
          key: 'fundraising.tokenPrice',
          value: '250',
          description: 'Fundraising config: tokenPrice',
        },
      });
    });

    it('should update fastTrackReview in DB via upsert', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await controller.updateFundraisingConfig({ fastTrackReview: 900 });

      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'fundraising.fastTrackReview' },
        update: { value: '900' },
        create: {
          key: 'fundraising.fastTrackReview',
          value: '900',
          description: 'Fundraising config: fastTrackReview',
        },
      });
    });

    it('should return updated config after put', async () => {
      const updatedRows = MOCK_FINANCE_CONFIG_ROWS.map((row) =>
        row.key === 'fundraising.tokenPrice' ? { ...row, value: '250' } : row,
      );
      mockFinanceConfig.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(updatedRows);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      const result = await controller.updateFundraisingConfig({
        tokenPrice: 250,
      });

      expect(result.error).toBe(false);
    });

    it('should update complianceFee via upsert', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await controller.updateFundraisingConfig({ complianceFee: 2000 });

      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'fundraising.complianceFee' },
        update: { value: '2000' },
        create: {
          key: 'fundraising.complianceFee',
          value: '2000',
          description: 'Fundraising config: complianceFee',
        },
      });
    });

    it('should reject negative complianceFee', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ complianceFee: -100 }),
      ).rejects.toThrow('complianceFee invalido: deve estar entre 0 e');
    });

    it('should reject NaN complianceFee', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ complianceFee: NaN }),
      ).rejects.toThrow('complianceFee invalido: deve ser numero finito');
    });

    it('should reject negative fastTrackFee', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ fastTrackFee: -100 }),
      ).rejects.toThrow('fastTrackFee invalido: deve estar entre 0 e');
    });

    it('should accept valid authFeePerToken (>= 0) and upsert', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await controller.updateFundraisingConfig({ authFeePerToken: 0.5 });

      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'fundraising.authFeePerToken' },
        update: { value: '0.5' },
        create: {
          key: 'fundraising.authFeePerToken',
          value: '0.5',
          description: 'Fundraising config: authFeePerToken',
        },
      });
    });

    it('should accept authFeePerToken=0 (sem taxa)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await expect(
        controller.updateFundraisingConfig({ authFeePerToken: 0 }),
      ).resolves.toBeDefined();
      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'fundraising.authFeePerToken' },
          update: { value: '0' },
        }),
      );
    });

    it('should reject negative authFeePerToken', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ authFeePerToken: -0.5 }),
      ).rejects.toThrow('authFeePerToken invalido: deve estar entre 0 e');
    });

    it('should reject NaN authFeePerToken', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ authFeePerToken: NaN }),
      ).rejects.toThrow('authFeePerToken invalido: deve ser numero finito');
    });

    it('should accept valid tokenPrice (> 0) and upsert', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      await controller.updateFundraisingConfig({ tokenPrice: 150 });

      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'fundraising.tokenPrice' },
        update: { value: '150' },
        create: {
          key: 'fundraising.tokenPrice',
          value: '150',
          description: 'Fundraising config: tokenPrice',
        },
      });
    });

    it('should reject tokenPrice=0 (quebraria totalTokens = ceil/0)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ tokenPrice: 0 }),
      ).rejects.toThrow('tokenPrice invalido: deve estar entre');
    });

    it('should reject negative tokenPrice', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ tokenPrice: -10 }),
      ).rejects.toThrow('tokenPrice invalido: deve estar entre');
    });

    it('should reject NaN tokenPrice', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ tokenPrice: NaN }),
      ).rejects.toThrow('tokenPrice invalido: deve ser numero finito');
    });

    it('should reject Infinity tokenPrice (isNaN(Infinity) === false)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ tokenPrice: Infinity }),
      ).rejects.toThrow('tokenPrice invalido: deve ser numero finito');
    });

    it('should reject Infinity authFeePerToken', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ authFeePerToken: Infinity }),
      ).rejects.toThrow('authFeePerToken invalido: deve ser numero finito');
    });

    it('should reject tokenPrice acima do cap (R$ 1M)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ tokenPrice: 2_000_000 }),
      ).rejects.toThrow('tokenPrice invalido: deve estar entre');
    });

    it('should reject authFeePerToken acima do cap (R$ 1.000)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);

      await expect(
        controller.updateFundraisingConfig({ authFeePerToken: 5000 }),
      ).rejects.toThrow('authFeePerToken invalido: deve estar entre');
    });

    it('should IGNORE unknown keys (whitelist — poluição de dados)', async () => {
      mockFinanceConfig.findMany.mockResolvedValue(MOCK_FINANCE_CONFIG_ROWS);
      mockFinanceConfig.upsert.mockResolvedValue({} as any);

      // Tenta injetar chaves desconhecidas (anti-mass-assignment)
      await controller.updateFundraisingConfig({
        authFeePerToken: 0.5, // legit
        evilKey: 'DROP TABLE',
        isAdmin: true,
      } as any);

      // Apenas a chave whitelisted deve ter sido upserted
      expect(mockFinanceConfig.upsert).toHaveBeenCalledTimes(1);
      expect(mockFinanceConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'fundraising.authFeePerToken' },
          update: { value: '0.5' },
        }),
      );
    });
  });

  describe('listParameters', () => {
    it('should return list of parameters from configService', async () => {
      const mockParams = [
        {
          key: 'platformFee',
          label: 'Taxa da Plataforma',
          group: 'Taxas',
          unit: 'PERCENT',
          default: 0.05,
          currentValue: 0.05,
          currentEffectiveFrom: new Date(),
          scheduled: null,
          history: [],
        },
      ];
      mockConfigService.listForAdmin.mockResolvedValue(mockParams);

      const result = await controller.listParameters();

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data).toEqual(mockParams);
      expect(mockConfigService.listForAdmin).toHaveBeenCalled();
    });
  });

  describe('setParameter', () => {
    it('should save parameter version and return success', async () => {
      const mockVersion = {
        id: 10,
        value: 0.07,
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
        note: 'Ajuste',
        createdById: 1,
        createdAt: new Date(),
      };
      mockConfigService.setValue.mockResolvedValue(mockVersion);

      const result = await controller.setParameter(
        {
          key: 'platformFee',
          value: 0.07,
          effectiveFrom: '2026-10-01T00:00:00.000Z',
          note: 'Ajuste',
        },
        { user: { id: 1 } },
      );

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data).toEqual(mockVersion);
      expect(mockConfigService.setValue).toHaveBeenCalledWith({
        key: 'platformFee',
        value: 0.07,
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
        note: 'Ajuste',
        createdById: 1,
      });
    });

    it('should reject invalid effectiveFrom date', async () => {
      await expect(
        controller.setParameter(
          {
            key: 'platformFee',
            value: 0.07,
            effectiveFrom: 'data-invalida',
          },
          { user: { id: 1 } },
        ),
      ).rejects.toThrow('Data de vigência inválida');
    });

    it('should throw BadRequestException when configService throws', async () => {
      mockConfigService.setValue.mockRejectedValue(
        new Error('Parâmetro desconhecido'),
      );

      await expect(
        controller.setParameter(
          {
            key: 'chave_invalida',
            value: 10,
          },
          { user: { id: 1 } },
        ),
      ).rejects.toThrow('Parâmetro desconhecido');
    });
  });
});
