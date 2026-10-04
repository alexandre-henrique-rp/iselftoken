import { BadRequestException } from '@nestjs/common';
import type { FinancialConfigs } from 'src/common/system-config/interfaces/financial-configs.interface';

/** Inputs minimos para validacao e calculo de snapshots. */
export interface CampaignLimitInputs {
  targetAmount: number;
  totalTokens: number;
}

/** Snapshots financeiros do ADR-008 (Modelo B — split venda/base). */
export interface CampaignFinancialSnapshots {
  tokenBaseValue: number;
  tokenSellPrice: number;
  adminFeeValue: number;
  tokenMintingCost: number;
}

/**
 * Parametros de precificacao resolvidos pelo caller.
 *
 * `tokenSellPrice` vem de `fundraising.tokenSalePrice` (ConfigService) no
 * fluxo do wizard, ou do DTO (`tokenPrice`) nas rodadas manuais — e o preco
 * efetivamente cobrado do investidor por token.
 *
 * `platformFeePct` vem de `fundraising.platformFee` (fracao, ex: 0.05) — a
 * aliquota cobrada do investidor NO CHECKOUT, por cima do subtotal de tokens.
 */
export interface CampaignPricingConfig {
  tokenSellPrice: number;
  platformFeePct: number;
}

/**
 * Helper compartilhado para validacao de limites e calculo de snapshots
 * financeiros de Campaign (ADR-008 - Modelo A).
 *
 * Usado por CampaignsCreateService (requestNewRound, createFirstCampaign)
 * e CampaignsStateService (updateDraft). Centralizado aqui para garantir
 * que a regra de validacao + a formula fiquem em UM lugar so (DRY).
 *
 * Nao precisa ser injetado (sem dependencia de servico externo) - basta
 * passar as configs ja carregadas pelo SystemConfigService.
 */
export class CampaignFinancialHelper {
  /**
   * Validacao dinamica de limites via SystemConfig.
   * Lanca BadRequestException com codigo estruturado se fora dos limites.
   *
   * Codigos retornados:
   *  - TARGET_BELOW_MINIMUM   targetAmount < CAMPAIGN_MIN_TARGET
   *  - TARGET_ABOVE_MAXIMUM   targetAmount > CAMPAIGN_MAX_TARGET
   *  - TOKENS_BELOW_MINIMUM   totalTokens < CAMPAIGN_MIN_TOKENS
   *  - TOKENS_ABOVE_MAXIMUM   totalTokens > CAMPAIGN_MAX_TOKENS
   *
   * @param inputs - targetAmount + totalTokens
   * @param configs - snapshot de configs financeiras
   * @throws BadRequestException se algum limite for violado
   */
  static validateCampaignLimits(
    inputs: CampaignLimitInputs,
    configs: FinancialConfigs,
  ): void {
    if (inputs.targetAmount < configs.CAMPAIGN_MIN_TARGET) {
      throw new BadRequestException({
        code: 'TARGET_BELOW_MINIMUM',
        currentMin: configs.CAMPAIGN_MIN_TARGET,
        receivedValue: inputs.targetAmount,
      });
    }
    if (inputs.targetAmount > configs.CAMPAIGN_MAX_TARGET) {
      throw new BadRequestException({
        code: 'TARGET_ABOVE_MAXIMUM',
        currentMax: configs.CAMPAIGN_MAX_TARGET,
        receivedValue: inputs.targetAmount,
      });
    }
    if (inputs.totalTokens < configs.CAMPAIGN_MIN_TOKENS) {
      throw new BadRequestException({
        code: 'TOKENS_BELOW_MINIMUM',
        currentMin: configs.CAMPAIGN_MIN_TOKENS,
        receivedValue: inputs.totalTokens,
      });
    }
    if (inputs.totalTokens > configs.CAMPAIGN_MAX_TOKENS) {
      throw new BadRequestException({
        code: 'TOKENS_ABOVE_MAXIMUM',
        currentMax: configs.CAMPAIGN_MAX_TOKENS,
        receivedValue: inputs.totalTokens,
      });
    }
  }

  /**
   * Calcula snapshots financeiros do ADR-008 (Modelo B — split venda/base).
   *  - tokenBaseValue     = targetAmount / totalTokens (face/base do token;
   *                         quanto a startup recebe por token no repasse)
   *  - tokenSellPrice     = preco de venda por token (resolvido pelo caller —
   *                         fundraising.tokenSalePrice no wizard, dto.tokenPrice
   *                         nas rodadas manuais). Deve ser >= tokenBaseValue.
   *  - adminFeeValue      = targetAmount * platformFeePct (fundraising.platformFee)
   *  - tokenMintingCost   = totalTokens * TOKEN_MINT_FEE
   *
   * Guards (defense-in-depth): valida que todos os inputs sao finitos antes
   * de calcular. Divisao por zero (totalTokens=0) ou Infinity nos parametros
   * produz NaN/Infinity no snapshot, que persiste como TEXT no SQLite e quebra
   * downstream (JSON.stringify converte Infinity para null silenciosamente).
   *
   * @param inputs - targetAmount + totalTokens (validados)
   * @param configs - configs carregadas do SystemConfig (TOKEN_MINT_FEE)
   * @param pricing - preco de venda + aliquota da plataforma (ConfigService/DTO)
   * @returns objeto com 4 snapshots a persistir
   */
  static computeFinancialSnapshots(
    inputs: CampaignLimitInputs,
    configs: FinancialConfigs,
    pricing: CampaignPricingConfig,
  ): CampaignFinancialSnapshots {
    // Guard 1: inputs numericos devem ser finitos.
    if (
      !Number.isFinite(inputs.targetAmount) ||
      !Number.isFinite(inputs.totalTokens)
    ) {
      throw new BadRequestException({
        code: 'INVALID_FINANCIAL_INPUT',
        message:
          'Inputs financeiros devem ser numeros finitos (sem NaN/Infinity)',
      });
    }

    // Guard 2: totalTokens > 0 (divisao por zero produziria Infinity).
    if (inputs.totalTokens <= 0) {
      throw new BadRequestException({
        code: 'INVALID_TOTAL_TOKENS',
        message: 'totalTokens deve ser > 0 para calcular snapshots financeiros',
      });
    }

    // Guard 3: configs devem ser finitas (proteção contra TOKEN_MINT_FEE
    // corrompido no banco).
    if (!Number.isFinite(configs.TOKEN_MINT_FEE)) {
      throw new BadRequestException({
        code: 'INVALID_SYSTEM_CONFIG',
        message: 'TOKEN_MINT_FEE deve ser numero finito',
      });
    }

    // Guard 4: pricing resolvido deve ser finito e o preco de venda nao pode
    // ser menor que o valor base (spread negativo = plataforma subsidiando).
    const tokenBaseValue = inputs.targetAmount / inputs.totalTokens;
    if (
      !Number.isFinite(pricing.tokenSellPrice) ||
      !Number.isFinite(pricing.platformFeePct) ||
      pricing.tokenSellPrice <= 0 ||
      pricing.platformFeePct < 0
    ) {
      throw new BadRequestException({
        code: 'INVALID_PRICING',
        message:
          'tokenSellPrice e platformFeePct devem ser numeros finitos e positivos',
      });
    }
    if (pricing.tokenSellPrice < tokenBaseValue) {
      throw new BadRequestException({
        code: 'SELL_PRICE_BELOW_BASE',
        message:
          'Preco de venda do token nao pode ser menor que o valor base (targetAmount / totalTokens)',
      });
    }

    return {
      tokenBaseValue,
      tokenSellPrice: pricing.tokenSellPrice,
      adminFeeValue: inputs.targetAmount * pricing.platformFeePct,
      tokenMintingCost: inputs.totalTokens * configs.TOKEN_MINT_FEE,
    };
  }
}
