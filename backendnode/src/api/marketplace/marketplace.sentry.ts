/**
 * S5 — Marketplace Sentry Alerts
 *
 * Configuração de alertas Sentry para monitorar:
 *   1. Score cron com duration > 60min (anti loop infinito)
 *   2. Pin/unpin fora do padrao (mais de 5 acoes/dia pelo mesmo user)
 *   3. Outliers extremos (delta >= 50pts/dia — possivel burla)
 *
 * Aplicacao: via Sentry Workflow Engine API (ver skill sentry-create-alert).
 * Documentado aqui como runbook operacional — ainda nao aplicado em prod.
 *
 * Acoes tomadas:
 *   1. Score cron > 60min           -> email DPO + Slack #ops-marketplace
 *   2. Pin/unpin >= 5 por user/dia  -> email DPO (anti abuso)
 *   3. Score outlier delta >= 50    -> email DPO + flag para auditoria
 *
 * Threshold rationale:
 *   - 60min para cron: job percorre startups APPROVED (max ~100s em prod).
 *     Acima de 60min indica indice ruim ou loop.
 *   - 5 pinos/dia por user: raro. ADMIN raramente pinar 5x/dia legitimo.
 *   - 50pts outliers: PRD §10 diz 30pts, mas 30 eh comum para uploads massivos.
 *     50pts eh mais conservador.
 */
import { Logger } from '@nestjs/common';

const logger = new Logger('MarketplaceOp');

export const SENTRY_ALERTS_MARKETPLACE = {
  score_cron_duration_min: {
    threshold_seconds: 3600,
    action: 'email_dpo + slack_ops',
    rationale: 'Job de recalculo deveria levar < 5min em prod',
  },
  pin_actions_per_user_per_day: {
    threshold: 5,
    action: 'email_dpo',
    rationale: 'Dificilmente um ADMIN pina 5x/dia legitimamente',
  },
  score_outlier_delta: {
    threshold: 50,
    action: 'email_dpo + audit_flag',
    rationale: 'Delta de 30pts eh comum; 50pts indica possivel burla',
  },
} as const;

// =========================================================================
// Helpers para instrumentacao (uso nos services)
// =========================================================================

/**
 * Marca o inicio de uma operacao para ser capturada em metricas Sentry.
 * Retorna um token opaco que deve ser passado a `endMarketplaceOp`.
 *
 * Uso:
 *   const op = startMarketplaceOp('score-recalc', { startupId: 42 });
 *   try {
 *     ...
 *     endMarketplaceOp(op, 'success');
 *   } catch (err) {
 *     endMarketplaceOp(op, 'error', err);
 *     throw err;
 *   }
 */
export function startMarketplaceOp(
  name: string,
  context: Record<string, unknown> = {},
): { name: string; start: number; context: Record<string, unknown> } {
  return { name, start: Date.now(), context };
}

export function endMarketplaceOp(
  op: { name: string; start: number; context: Record<string, unknown> },
  status: 'success' | 'error',
  error?: unknown,
): number {
  const durationMs = Date.now() - op.start;
  const payload = {
    duration_ms: durationMs,
    status,
    ...op.context,
    ...(error ? { error: String((error as Error)?.message ?? error) } : {}),
  };
  if (status === 'success') {
    logger.log(`[MARKETPLACE-OP] ${op.name} ${JSON.stringify(payload)}`);
  } else {
    logger.error(
      `[MARKETPLACE-OP] ${op.name} FAILED ${JSON.stringify(payload)}`,
    );
  }
  return durationMs;
}
