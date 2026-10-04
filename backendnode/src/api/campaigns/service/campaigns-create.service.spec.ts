/**
 * Specs para CampaignsCreateService - T032 (requestNewRound).
 * Migrado do antigo campaigns.service.spec.ts. Comportamento preservado (S01.2a).
 *
 * S01.2b: adicionados testes para
 *   - validateCampaignLimits (validacao dinamica via SystemConfig)
 *   - computeFinancialSnapshots (formula ADR-008 Modelo A)
 *   - requestNewRound agora chama SystemConfigService.getFinancialConfigs()
 *   - createFirstCampaign (novo endpoint para criar 1a campanha, status DRAFT)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CampaignsCreateService } from './campaigns-create.service';
import { CampaignFinancialHelper } from './campaign-financial.helper';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemConfigService } from 'src/common/system-config/system-config.service';
import { ConfigService } from 'src/api/config/config.service';
import type { FinancialConfigs } from 'src/common/system-config/interfaces/financial-configs.interface';

/** Mock de FinancialConfigs com valores compativeis com a maioria dos testes. */
const MOCK_CONFIGS: FinancialConfigs = {
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

describe('CampaignsCreateService', () => {
  let service: CampaignsCreateService;
  let prisma: {
    startup: { findUnique: jest.Mock; findFirst: jest.Mock };
    campaign: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $executeRawUnsafe: jest.Mock;
  };
  let mockConfigService: {
    getFinancialConfigs: jest.Mock;
  };
  const FOUNDER_ID = 42;
  const user = { id: FOUNDER_ID, role: 'FOUNDER' } as any;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn(), findFirst: jest.fn() },
      campaign: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    };
    mockConfigService = {
      getFinancialConfigs: jest.fn().mockResolvedValue(MOCK_CONFIGS),
    };
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsCreateService,
        { provide: PrismaService, useValue: prisma },
        { provide: SystemConfigService, useValue: mockConfigService },
        {
          provide: ConfigService,
          useValue: {
            // platformFee = 5%; tokenSalePrice null → cai no dto.tokenPrice.
            getEffective: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(
                  key === 'fundraising.platformFee'
                    ? 0.05
                    : key === 'fundraising.tokenSalePrice'
                      ? 1200
                      : null,
                ),
              ),
          },
        },
      ],
    }).compile();
    service = m.get(CampaignsCreateService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  // ============ validateCampaignLimits (S01.2b - validacao dinamica) ============

  describe('validateCampaignLimits (via CampaignFinancialHelper)', () => {
    const validDto = {
      targetAmount: 1000000,
      totalTokens: 50000,
    };

    it('rejeita targetAmount abaixo do minimo configurado', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...validDto, targetAmount: 100000 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita targetAmount acima do maximo configurado', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...validDto, targetAmount: 20000000 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita totalTokens abaixo do minimo configurado', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...validDto, totalTokens: 50 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita totalTokens acima do maximo configurado', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...validDto, totalTokens: 2000000 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('aceita valores exatamente nos limites (boundary inclusivo)', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          {
            targetAmount: MOCK_CONFIGS.CAMPAIGN_MIN_TARGET,
            totalTokens: MOCK_CONFIGS.CAMPAIGN_MAX_TOKENS,
          },
          MOCK_CONFIGS,
        ),
      ).not.toThrow();
    });

    it('mensagem de erro inclui currentMin/currentMax e receivedValue', () => {
      try {
        CampaignFinancialHelper.validateCampaignLimits(
          { ...validDto, targetAmount: 100 },
          MOCK_CONFIGS,
        );
        fail('Deveria ter lancado');
      } catch (e: any) {
        const r = e.getResponse();
        expect(r.code).toBe('TARGET_BELOW_MINIMUM');
        expect(r.currentMin).toBe(MOCK_CONFIGS.CAMPAIGN_MIN_TARGET);
        expect(r.receivedValue).toBe(100);
      }
    });
  });

  // ============ computeFinancialSnapshots (S01.2b - ADR-008 Modelo A) ============

  describe('computeFinancialSnapshots (via CampaignFinancialHelper)', () => {
    const PRICING = { tokenSellPrice: 24, platformFeePct: 0.05 };

    it('calcula tokenBaseValue = targetAmount / totalTokens (base do repasse)', () => {
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: 500000, totalTokens: 25000 },
        MOCK_CONFIGS,
        PRICING,
      );
      expect(snap.tokenBaseValue).toBe(20);
    });

    it('calcula tokenSellPrice a partir do pricing resolvido (nao do target)', () => {
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: 500000, totalTokens: 25000 },
        MOCK_CONFIGS,
        PRICING,
      );
      expect(snap.tokenSellPrice).toBe(24);
    });

    it('calcula adminFeeValue = targetAmount * platformFeePct', () => {
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: 500000, totalTokens: 25000 },
        MOCK_CONFIGS,
        PRICING,
      );
      // 500000 * 0.05 = 25000
      expect(snap.adminFeeValue).toBe(25000);
    });

    it('calcula tokenMintingCost = totalTokens * TOKEN_MINT_FEE', () => {
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: 500000, totalTokens: 25000 },
        MOCK_CONFIGS,
        PRICING,
      );
      // 25000 * 1 = 25000
      expect(snap.tokenMintingCost).toBe(25000);
    });
  });

  // ============ T032 (B05) - requestNewRound ============

  describe('requestNewRound (T032)', () => {
    it('1. sem campanha anterior -> cria direto (primeira rodada)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({
        id: 99,
        title: 'R1',
        status: 'OPEN',
      });

      const result = await service.requestNewRound(
        1,
        {
          title: 'R1',
          targetAmount: 1000000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(result.codigo).toBe(201);
      expect(prisma.campaign.create).toHaveBeenCalled();
      expect(mockConfigService.getFinancialConfigs).toHaveBeenCalled();
    });

    it('2. rodada anterior < 100% vendida -> BadRequest', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 500,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 200),
        status: 'FUNDED',
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R2',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'RODADA_ANTERIOR_NAO_VENDIDA' },
      });
    });

    it('3. rodada anterior < 3 meses -> BadRequest', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 1000,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: 'FUNDED',
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R2',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'INTERVALO_MINIMO_3_MESES' },
      });
    });

    it('4. rodada anterior 100% vendida + > 3 meses -> cria nova', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 1000,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        status: 'FUNDED',
      });
      prisma.campaign.create.mockResolvedValueOnce({ id: 99 });

      const result = await service.requestNewRound(
        1,
        {
          title: 'R2',
          targetAmount: 1000000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(result.codigo).toBe(201);
    });

    it('5. startup nao pertence ao user -> Forbidden', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 999,
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('6. startup inexistente -> NotFound', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { message: 'STARTUP_NOT_FOUND' },
      });
    });

    it('7. targetAmount abaixo do limite -> BadRequest ANTES de checar B05', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      // nao mockamos campaign.findFirst porque a validacao deve falhar antes

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R',
            targetAmount: 1000, // abaixo de CAMPAIGN_MIN_TARGET (500000)
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TARGET_BELOW_MINIMUM' },
      });
      expect(prisma.campaign.findFirst).not.toHaveBeenCalled();
    });

    it('8. persiste snapshots financeiros no Prisma (ADR-008 Modelo B)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({ id: 99 });

      await service.requestNewRound(
        1,
        {
          title: 'R',
          targetAmount: 1000000, // valid (entre 500k e 10M)
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenBaseValue: 1000, // 1000000 / 1000 (base do repasse)
            tokenSellPrice: 1200, // fundraising.tokenSalePrice (config admin)
            adminFeeValue: 50000, // 1000000 * 0.05
            tokenMintingCost: 1000, // 1000 * 1
            status: 'OPEN',
          }),
        }),
      );
    });

    it('9. com aceiteTermoRepasse=true -> cria audit log CVM (LGPD Art. 7 V)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({ id: 99 });

      await service.requestNewRound(
        1,
        {
          title: 'R',
          targetAmount: 1000000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
          aceiteTermoRepasse: true,
          declaracaoVeracidade: true,
        },
        user,
      );

      // Deve chamar $executeRawUnsafe 2x (uma para cada aceite CVM)
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    });
  });

  // ============ S01.2b - createFirstCampaign (novo endpoint) ============

  describe('createFirstCampaign (S01.2b)', () => {
    it('1. startup nao encontrada -> NotFound', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createFirstCampaign(
          999,
          {
            title: 'C1',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { message: 'STARTUP_NOT_FOUND' },
      });
    });

    it('2. user nao eh owner nem ADMIN -> Forbidden', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 999,
      });
      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          { id: 1, role: 'FOUNDER' } as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('3. ADMIN pode criar mesmo sem ser owner', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 999, // outro user
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null); // sem campanha anterior
      prisma.campaign.create.mockResolvedValueOnce({ id: 100 });

      await service.createFirstCampaign(
        1,
        {
          title: 'C1',
          targetAmount: 1000000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        { id: 1, role: 'ADMIN' } as any,
      );

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('4. ja existe campanha anterior -> BadRequest com codigo STARTUP_ALREADY_HAS_CAMPAIGN', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({ id: 99 }); // ja existe

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: {
          code: 'STARTUP_ALREADY_HAS_CAMPAIGN',
        },
      });
    });

    it('5. cria com status DRAFT e persiste snapshots financeiros', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({ id: 100 });

      await service.createFirstCampaign(
        1,
        {
          title: 'C1',
          targetAmount: 1000000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            tokenBaseValue: 1000,
            tokenSellPrice: 1200,
            adminFeeValue: 50000,
            tokenMintingCost: 1000,
          }),
        }),
      );
    });

    it('6. targetAmount abaixo do limite -> BadRequest (nao cria)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      // findFirst nao deve ser chamado pq a validacao falha antes

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 100, // abaixo de 500000
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TARGET_BELOW_MINIMUM' },
      });
      expect(prisma.campaign.create).not.toHaveBeenCalled();
    });

    // ============ R1-D2: testes adicionais de validacao ============

    it('7. targetAmount > 10M rejeitado com TARGET_ABOVE_MAXIMUM', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 15_000_000, // acima de 10M
            minInvestment: 100,
            valuation: 50000000,
            tokenPrice: 200,
            totalTokens: 75000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TARGET_ABOVE_MAXIMUM' },
      });
      expect(prisma.campaign.create).not.toHaveBeenCalled();
    });

    it('8. totalTokens = 0 rejeitado com TOKENS_BELOW_MINIMUM', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 500000,
            minInvestment: 100,
            valuation: 5000000,
            tokenPrice: 200,
            totalTokens: 0, // invalido
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TOKENS_BELOW_MINIMUM' },
      });
    });

    it('9. totalTokens > 100M rejeitado com TOKENS_ABOVE_MAXIMUM', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C1',
            targetAmount: 500000,
            minInvestment: 100,
            valuation: 5000000,
            tokenPrice: 200,
            totalTokens: 200_000_000, // acima de 100M
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TOKENS_ABOVE_MAXIMUM' },
      });
    });

    it('10. segundo createFirstCampaign para mesma startup rejeitado com STARTUP_ALREADY_HAS_CAMPAIGN', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
      });
      // Primeira campanha ja existe
      prisma.campaign.findFirst.mockResolvedValueOnce({ id: 99 });

      await expect(
        service.createFirstCampaign(
          1,
          {
            title: 'C2',
            targetAmount: 1000000,
            minInvestment: 100,
            valuation: 10000000,
            tokenPrice: 200,
            totalTokens: 5000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'STARTUP_ALREADY_HAS_CAMPAIGN' },
      });
      expect(prisma.campaign.create).not.toHaveBeenCalled();
    });
  });
});
