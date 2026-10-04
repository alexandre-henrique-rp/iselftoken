/**
 * Função pura que calcula os 4 derivados financeiros da rodada:
 *  - valuationPreMoney (R$)
 *  - tokensCount (inteiro)
 *  - tokenReservationFee (R$)
 *  - equityPerToken (%)
 *
 * Fórmula (corrigida em 2026-09-10 — antes usava `meta / (1 - equity/100)`
 * que produzia valores errados para equity < 50%):
 *   valuation = targetAmount * 100 / equityPercent
 *   tokensCount = ceil(targetAmount / tokenPrice)
 *   tokenReservationFee = tokensCount * authFeePerToken
 *   equityPerToken = equityPercent (direto, sem dividir por tokens)
 *
 * Guards (defense-in-depth):
 *  - equityPercent <= 0 ou > 100 → valuation=0 (evita divisão por zero + range)
 *  - tokenPrice <= 0 → tokensCount=0 (evita divisão por zero)
 *  - targetAmount <= 0 → valuation=0, tokensCount=0
 *  - overflow em MAX_SAFE_INTEGER → valuation=0
 *  - inputs não-finitos (NaN/Infinity) → 0 em todos os derivados
 *
 * Esta função é o "single source of truth" usado pelo wizard
 * (new-startup-wizard.tsx) e replicada na página de nova rodada
 * (founder-new-round.tsx) — manter em sync ao alterar.
 */
export interface RoundMetricsInput {
  targetAmount: number;
  equityPercent: number;
  tokenPrice: number;
  authFeePerToken: number;
}

export interface RoundMetrics {
  valuationPreMoney: number;
  tokensCount: number;
  tokenReservationFee: number;
  equityPerToken: number;
}

export function computeRoundMetrics(input: RoundMetricsInput): RoundMetrics {
  const { targetAmount, equityPercent, tokenPrice, authFeePerToken } = input;

  // Guard 1: todos os inputs devem ser finitos (rejeita NaN/Infinity).
  if (
    !Number.isFinite(targetAmount) ||
    !Number.isFinite(equityPercent) ||
    !Number.isFinite(tokenPrice) ||
    !Number.isFinite(authFeePerToken)
  ) {
    return { valuationPreMoney: 0, tokensCount: 0, tokenReservationFee: 0, equityPerToken: 0 };
  }

  // Guard 2: ranges validos.
  if (targetAmount <= 0 || equityPercent <= 0 || equityPercent > 100) {
    return { valuationPreMoney: 0, tokensCount: 0, tokenReservationFee: 0, equityPerToken: 0 };
  }

  // Guard 3: overflow em MAX_SAFE_INTEGER (JS Number perde precisão > 2^53).
  if (
    targetAmount > Number.MAX_SAFE_INTEGER / 100 ||
    tokenPrice > Number.MAX_SAFE_INTEGER / 1_000_000
  ) {
    return { valuationPreMoney: 0, tokensCount: 0, tokenReservationFee: 0, equityPerToken: 0 };
  }

  const valuationPreMoney = (targetAmount * 100) / equityPercent;

  // Guard 4: tokenPrice > 0 quebraria tokensCount (divisão por zero).
  const tokensCount =
    tokenPrice > 0 ? Math.ceil(targetAmount / tokenPrice) : 0;

  const tokenReservationFee = tokensCount * authFeePerToken;

  // equityPerToken: % direto (sem divisao por tokens). Mostra "10%" quando
  // equity=10, em vez de "0.002%" por token — mais legivel.
  const equityPerToken = equityPercent;

  return {
    valuationPreMoney,
    tokensCount,
    tokenReservationFee,
    equityPerToken,
  };
}
