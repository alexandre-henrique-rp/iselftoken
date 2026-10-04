/**
 * Specs para CampaignsStateService - T033 (executeAction) + update legado + updateDraft.
 * Migrado do antigo campaigns.service.spec.ts. Comportamento preservado (S01.2a).
 *
 * S01.2b: adicionados testes para updateDraft (PATCH /:id/draft).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsStateService } from './campaigns-state.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemConfigService } from 'src/common/system-config/system-config.service';
import { ConfigService } from 'src/api/config/config.service';
import { CampaignAction } from '../dto/action-campaign.dto';
import type { FinancialConfigs } from 'src/common/system-config/interfaces/financial-configs.interface';

/** Mock de FinancialConfigs compativel com a maioria dos testes. */
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

describe('CampaignsStateService', () => {
  let service: CampaignsStateService;
  let prisma: {
    campaign: {
      findUnique: jest.Mock;
      update: jest.Mock;
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
      campaign: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    };
    mockConfigService = {
      getFinancialConfigs: jest.fn().mockResolvedValue(MOCK_CONFIGS),
    };
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsStateService,
        { provide: PrismaService, useValue: prisma },
        { provide: SystemConfigService, useValue: mockConfigService },
        {
          provide: ConfigService,
          useValue: {
            getEffective: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(
                  key === 'fundraising.platformFee' ? 0.05 : null,
                ),
              ),
          },
        },
      ],
    }).compile();
    service = m.get(CampaignsStateService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  // ============ T033 (B06) - executeAction ============

  describe('executeAction (T033)', () => {
    it('1. OPEN + PAUSE -> PAUSED', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'OPEN',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'PAUSED' });

      const r = await service.executeAction(1, CampaignAction.PAUSE, user);
      expect(r.data!.status).toBe('PAUSED');
    });

    it('2. PAUSED + RESUME -> OPEN', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'PAUSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'OPEN' });

      const r = await service.executeAction(1, CampaignAction.RESUME, user);
      expect(r.data!.status).toBe('OPEN');
    });

    it('3. OPEN + FINISH -> 403 (so PAUSE permitido)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'OPEN',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });

      await expect(
        service.executeAction(1, CampaignAction.FINISH, user),
      ).rejects.toMatchObject({
        response: { code: 'ACAO_NAO_PERMITIDA_POS_RODADA' },
      });
    });

    it('4. CLOSED + FINISH -> CLOSED (setta closedAt)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'CLOSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'CLOSED' });

      const r = await service.executeAction(1, CampaignAction.FINISH, user);
      expect(r.data!.status).toBe('CLOSED');
      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ closedAt: expect.any(Date) }),
        }),
      );
    });

    it('5. FUNDED + qualquer -> 403', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'FUNDED',
        closedAt: new Date(),
        startup: { founderId: FOUNDER_ID },
      });

      await expect(
        service.executeAction(1, CampaignAction.PAUSE, user),
      ).rejects.toMatchObject({
        response: { code: 'ACAO_NAO_PERMITIDA_POS_RODADA' },
      });
    });

    it('6. PAUSED + FINISH -> CLOSED', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'PAUSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'CLOSED' });

      const r = await service.executeAction(1, CampaignAction.FINISH, user);
      expect(r.data!.status).toBe('CLOSED');
    });
  });

  // ============ update (legado) ============

  describe('update - campos de captação', () => {
    const baseCampaign = {
      id: 1,
      status: 'DRAFT',
      closedAt: null,
      aceiteTermoRepasse: false,
      declaracaoVeracidade: false,
      participacaoLucros: false,
      faturamentoMinimoLucros: null,
      startup: { founderId: FOUNDER_ID },
    };

    it('1. persiste campos de captação na campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseCampaign });
      prisma.campaign.update.mockResolvedValueOnce({
        id: 1,
        problema: 'PMEs não gerenciam caixa',
        solucao: 'SaaS financeiro',
        diferencial: 'IA preditiva',
      });

      const dto = {
        problema: 'PMEs não gerenciam caixa',
        solucao: 'SaaS financeiro',
        diferencial: 'IA preditiva',
      };

      const result = await service.update(1, dto, user);

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            problema: 'PMEs não gerenciam caixa',
            solucao: 'SaaS financeiro',
            diferencial: 'IA preditiva',
          }),
        }),
      );
      expect(result).toHaveProperty('problema', 'PMEs não gerenciam caixa');
    });

    it('2. campos de captação undefined não sobrescrevem existentes', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        ...baseCampaign,
        problema: 'Já existe',
      });
      prisma.campaign.update.mockResolvedValueOnce({
        id: 1,
        problema: 'Já existe',
      });

      const dto = { title: 'Novo título' };

      await service.update(1, dto, user);

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            problema: expect.anything(),
          }),
        }),
      );
    });

    it('3. retorna 404 se campaign não existe', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update(999, { problema: 'x' }, user),
      ).rejects.toMatchObject({
        response: { message: 'CAMPAIGN_NOT_FOUND' },
      });
    });

    it('4. retorna 403 se não é owner nem admin', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        ...baseCampaign,
        startup: { founderId: 999 },
      });

      await expect(
        service.update(1, { problema: 'x' }, { id: 1, role: 'USER' } as any),
      ).rejects.toMatchObject({
        response: { message: 'NOT_OWNER' },
      });
    });
  });

  // ============ updateDraft (S01.2b - PATCH /:id/draft) ============

  describe('updateDraft (S01.2b)', () => {
    const baseDraft = {
      id: 1,
      status: 'DRAFT',
      closedAt: null,
      aceiteTermoRepasse: false,
      declaracaoVeracidade: false,
      participacaoLucros: false,
      faturamentoMinimoLucros: null,
      targetAmount: { toString: () => '1000000' },
      totalTokens: 1000,
      tokenPrice: 2400, // preco de venda (snapshot preservado no update)
      tokenBaseValue: null,
      tokenSellPrice: null,
      adminFeeValue: null,
      tokenMintingCost: null,
      startup: { founderId: FOUNDER_ID },
    };

    it('1. campaign nao encontrada -> NotFound', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateDraft(999, { title: 'X' }, user),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('2. user nao eh owner nem ADMIN -> Forbidden (NOT_OWNER)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        ...baseDraft,
        startup: { founderId: 999 },
      });

      await expect(
        service.updateDraft(1, { title: 'X' }, {
          id: 1,
          role: 'FOUNDER',
        } as any),
      ).rejects.toMatchObject({
        response: { message: 'NOT_OWNER' },
      });
    });

    it('3. status diferente de DRAFT -> Forbidden (CAMPAIGN_NOT_EDITABLE)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        ...baseDraft,
        status: 'OPEN',
      });

      await expect(
        service.updateDraft(1, { title: 'X' }, user),
      ).rejects.toMatchObject({
        response: { code: 'CAMPAIGN_NOT_EDITABLE' },
      });
    });

    it('4. ADMIN pode editar mesmo sem ser owner', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        ...baseDraft,
        startup: { founderId: 999 }, // outro user
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(1, { title: 'Novo titulo' }, {
        id: 1,
        role: 'ADMIN',
      } as any);

      expect(prisma.campaign.update).toHaveBeenCalled();
    });

    it('5. recalcula snapshots quando targetAmount muda', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(
        1,
        { targetAmount: 2000000 }, // dobrou
        user,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            targetAmount: 2000000,
            tokenBaseValue: 2000, // 2000000 / 1000 (base do repasse)
            tokenSellPrice: 2400, // snapshot da campanha preservado
            adminFeeValue: 100000, // 2000000 * 0.05
            tokenMintingCost: 1000, // 1000 * 1 (totalTokens nao mudou)
          }),
        }),
      );
      expect(mockConfigService.getFinancialConfigs).toHaveBeenCalled();
    });

    it('6. recalcula snapshots quando totalTokens muda', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(
        1,
        { totalTokens: 5000 }, // 5x mais tokens
        user,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTokens: 5000,
            tokenBaseValue: 200, // 1000000 / 5000
            tokenSellPrice: 2400, // snapshot da campanha preservado
            adminFeeValue: 50000, // 1000000 * 0.05
            tokenMintingCost: 5000, // 5000 * 1
          }),
        }),
      );
    });

    it('7. rejeita targetAmount abaixo do limite (validacao dinamica)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      // findUnique chamado, depois configuracoes carregadas, depois validacao falha
      await expect(
        service.updateDraft(
          1,
          { targetAmount: 100 }, // abaixo de CAMPAIGN_MIN_TARGET (500000)
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'TARGET_BELOW_MINIMUM' },
      });
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it('8. permite editar apenas campos nao-financeiros sem recalcular snapshots', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(
        1,
        {
          description: 'Nova descricao',
          objetivoCaptacao: 'captacao objetivo',
        },
        user,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Nova descricao',
            objetivoCaptacao: 'captacao objetivo',
          }),
        }),
      );
      // Nao deve chamar getFinancialConfigs pq nao mudou targetAmount/totalTokens
      expect(mockConfigService.getFinancialConfigs).not.toHaveBeenCalled();
    });

    it('9. atualiza campos CVM (aceiteTermoRepasse) na edicao DRAFT', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(
        1,
        { aceiteTermoRepasse: true, declaracaoVeracidade: true },
        user,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aceiteTermoRepasse: true,
            declaracaoVeracidade: true,
          }),
        }),
      );
    });

    // ─── BUG-FT-008 — affiliateCommissionPct não persistia em updateDraft ────────
    // Frontend /founder/startups/:id/captacao/retornos enviava affiliateCommissionPct
    // (5 ou 10 quando aceito, 0 quando recusado), mas o service descartava o campo
    // silenciosamente porque (a) o DTO não declarava o campo e (b) o spread em
    // prisma.campaign.update não o incluía. Resultado: /admin/startups/24/3
    // mostrava "não tem" e a checkbox voltava desmarcada no reload.

    it('10. persiste affiliateCommissionPct quando aceito (10%)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(1, { affiliateCommissionPct: 10 }, user);

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            affiliateCommissionPct: 10,
          }),
        }),
      );
    });

    it('11. persiste affiliateCommissionPct=0 quando recusado (spread inclui 0)', async () => {
      // 0 !== undefined, então o spread condicional deve incluir o campo.
      // Garante que "recusar" persiste 0 (não apenas undefined).
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(1, { affiliateCommissionPct: 0 }, user);

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            affiliateCommissionPct: 0,
          }),
        }),
      );
    });

    it('12. NÃO escreve affiliateCommissionPct quando ausente (spread por !== undefined)', async () => {
      // dto sem affiliateCommissionPct → chave ausente no data (spread condicional)
      prisma.campaign.findUnique.mockResolvedValueOnce({ ...baseDraft });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1 });

      await service.updateDraft(1, { description: 'apenas descrição' }, user);

      const updateCall = prisma.campaign.update.mock.calls[0];
      const data = updateCall[0].data as Record<string, unknown>;
      expect(data).not.toHaveProperty('affiliateCommissionPct');
    });
  });
});
