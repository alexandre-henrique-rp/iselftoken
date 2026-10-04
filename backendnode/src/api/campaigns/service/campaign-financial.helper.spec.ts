/**
 * Specs do CampaignFinancialHelper - regra compartilhada de validacao
 * e calculo de snapshots financeiros (ADR-008).
 */
import { BadRequestException } from '@nestjs/common';
import { CampaignFinancialHelper } from './campaign-financial.helper';
import type { FinancialConfigs } from 'src/common/system-config/interfaces/financial-configs.interface';

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

describe('CampaignFinancialHelper', () => {
  describe('validateCampaignLimits', () => {
    const valid = { targetAmount: 1000000, totalTokens: 50000 };

    it('rejeita targetAmount abaixo do minimo', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...valid, targetAmount: 100 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita targetAmount acima do maximo', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...valid, targetAmount: 99999999 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita totalTokens abaixo do minimo', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...valid, totalTokens: 10 },
          MOCK_CONFIGS,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita totalTokens acima do maximo', () => {
      expect(() =>
        CampaignFinancialHelper.validateCampaignLimits(
          { ...valid, totalTokens: 9999999 },
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

    it('erro inclui code estruturado + current/currentValue', () => {
      try {
        CampaignFinancialHelper.validateCampaignLimits(
          { ...valid, targetAmount: 100 },
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

  describe('computeFinancialSnapshots', () => {
    it('calcula todos os 4 snapshots do Modelo B (split venda/base) corretamente', () => {
      // Exemplo: targetAmount=500000, totalTokens=25000 → base=20.
      // Venda=24 (admin config), fee=5% cobrada do investidor.
      const snap = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: 500000, totalTokens: 25000 },
        MOCK_CONFIGS,
        { tokenSellPrice: 24, platformFeePct: 0.05 },
      );
      expect(snap).toEqual({
        tokenBaseValue: 20, // 500000 / 25000 (repasse por token)
        tokenSellPrice: 24, // preco cobrado do investidor
        adminFeeValue: 25000, // 500000 * 0.05
        tokenMintingCost: 25000, // 25000 * 1
      });
    });

    it('rejeita preco de venda abaixo do valor base', () => {
      expect(() =>
        CampaignFinancialHelper.computeFinancialSnapshots(
          { targetAmount: 500000, totalTokens: 25000 },
          MOCK_CONFIGS,
          { tokenSellPrice: 10, platformFeePct: 0.05 }, // 10 < base 20
        ),
      ).toThrow(BadRequestException);
    });

    it('snapshots sao funcao pura dos inputs', () => {
      const inputs = { targetAmount: 600000, totalTokens: 30000 };
      const pricing = { tokenSellPrice: 24, platformFeePct: 0.05 };
      const snap1 = CampaignFinancialHelper.computeFinancialSnapshots(
        inputs,
        MOCK_CONFIGS,
        pricing,
      );
      const snap2 = CampaignFinancialHelper.computeFinancialSnapshots(
        inputs,
        MOCK_CONFIGS,
        pricing,
      );
      expect(snap1).toEqual(snap2);
    });
  });
});
