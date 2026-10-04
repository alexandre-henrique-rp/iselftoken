-- ============================================================
-- Migration: dashboard_perf_indexes
-- Data: 2026-09-26
-- Contexto: Otimização de performance da página /founder/dashboard
--           (endpoint GET /startup :: StartupQueryService.findAll +
--            DashboardSummaryService.buildSummary).
--
-- Problema: a tabela Investment NÃO possuía nenhum índice (nem nas FKs).
--           Todas as agregações do dashboard filtram por
--           (campaignId, status) e contam investidores únicos por userId,
--           forçando full table scan a cada request. Payment também não
--           tinha índice em (campaignId, status), usado pelo next-action.
--
-- Mudanças (apenas CREATE INDEX — ADITIVA, sem risco de perda de dados):
--   1. Investment(campaignId, status) — sum/aggregate de CONFIRMED por campanha
--   2. Investment(userId)             — distinct de investidores únicos
--   3. Payment(campaignId, status)    — reserva PENDING por campanha (next-action)
--
-- Rollback:
--   DROP INDEX "Investment_campaignId_status_idx";
--   DROP INDEX "Investment_userId_idx";
--   DROP INDEX "Payment_campaignId_status_idx";
-- ============================================================

CREATE INDEX IF NOT EXISTS "Investment_campaignId_status_idx"
  ON "Investment" ("campaignId", "status");

CREATE INDEX IF NOT EXISTS "Investment_userId_idx"
  ON "Investment" ("userId");

CREATE INDEX IF NOT EXISTS "Payment_campaignId_status_idx"
  ON "Payment" ("campaignId", "status");
