/**
 * Função pura que calcula o valuation pré-money para a página
 * `founder-new-round.tsx` (abrir nova rodada).
 *
 * Fonte única de verdade (espelha `computeRoundMetrics` em
 * new-startup-wizard.metrics.ts). Manter em sync ao alterar a fórmula.
 *
 * valuation = targetAmount * 100 / equityPercent
 *
 * Guards:
 *  - equityPercent <= 0 ou > 100 → 0 (evita divisão por zero + range impossível)
 *  - targetAmount fora de MAX_SAFE_INTEGER → 0 (evita perda de precisão JS)
 *  - resultado fora de MAX_SAFE_INTEGER → 0 (overflow em equity muito pequeno)
 *  - targetAmount <= 0 → 0 (sem captação, sem valuation)
 */
export function computeNewRoundValuation(
  targetAmount: number,
  equityPercent: number,
): number {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0;
  if (!Number.isFinite(equityPercent) || equityPercent <= 0) return 0;
  if (equityPercent > 100) return 0;
  // Math.abs para cobrir tanto -targetAmount quanto equity negativo
  if (
    Math.abs(targetAmount) > Number.MAX_SAFE_INTEGER ||
    Math.abs(targetAmount * 100) > Number.MAX_SAFE_INTEGER
  ) {
    return 0;
  }
  // Guard final contra overflow no resultado. Com equity=0.01 e meta=1M,
  // resultado=10B (passa). Com equity=0.0001 e meta=1M, resultado=100B
  // (passa). Mas equity=0.000001 e meta=1B → resultado=100T → estoura.
  const result = (targetAmount * 100) / equityPercent;
  if (!Number.isFinite(result) || result > Number.MAX_SAFE_INTEGER) return 0;
  return result;
}
