/**
 * Contrato tipado para todas as chaves de configuração financeira
 * consumidas pelo módulo `campaigns` (ADR-008).
 *
 * O backend é source-of-truth dos cálculos — nenhum valor hardcoded.
 * Para ler essas configs use `SystemConfigService.getFinancialConfigs()`.
 *
 * Chaves mantidas em `SystemConfig.value` (Decimal 15,4):
 * - TOKEN_BASE_VALUE          Valor base (face) de cada token (R$)
 * - TOKEN_TRANSACTION_FEE     Taxa de transação aplicada sobre o valor base (R$)
 * - TOKEN_MINT_FEE            Custo de geração por token (R$/token)
 * - PLATFORM_ADMIN_FEE_PCT    Percentual da meta que vai para admin (0.20 = 20%)
 * - COMPLIANCE_FEE            Taxa fixa cobrada da startup quando campaign.status = FUNDED (R$)
 * - FAST_DEPLOY_FEE           Preço do serviço "Publicação Rápida" (publicação imediata na aprovação) (R$)
 * - CAMPAIGN_MIN_TARGET       Captação mínima por campanha (R$)
 * - CAMPAIGN_MAX_TARGET       Captação máxima por campanha (R$)
 * - CAMPAIGN_MIN_TOKENS       Mínimo de tokens por campanha (anti-token-unitário)
 * - CAMPAIGN_MAX_TOKENS       Máximo de tokens por campanha (anti-diluição)
 */
export interface FinancialConfigs {
  TOKEN_BASE_VALUE: number;
  TOKEN_TRANSACTION_FEE: number;
  TOKEN_MINT_FEE: number;
  PLATFORM_ADMIN_FEE_PCT: number;
  COMPLIANCE_FEE: number;
  /** Preço do serviço "Publicação Rápida" (FAST_DEPLOY); default R$ 1.000. */
  FAST_DEPLOY_FEE: number;
  CAMPAIGN_MIN_TARGET: number;
  CAMPAIGN_MAX_TARGET: number;
  CAMPAIGN_MIN_TOKENS: number;
  CAMPAIGN_MAX_TOKENS: number;
}

/** Conjunto de chaves válidas — exportado para validação no controller/PATCH. */
export const FINANCIAL_CONFIG_KEYS: ReadonlyArray<keyof FinancialConfigs> = [
  'TOKEN_BASE_VALUE',
  'TOKEN_TRANSACTION_FEE',
  'TOKEN_MINT_FEE',
  'PLATFORM_ADMIN_FEE_PCT',
  'COMPLIANCE_FEE',
  'FAST_DEPLOY_FEE',
  'CAMPAIGN_MIN_TARGET',
  'CAMPAIGN_MAX_TARGET',
  'CAMPAIGN_MIN_TOKENS',
  'CAMPAIGN_MAX_TOKENS',
] as const;
