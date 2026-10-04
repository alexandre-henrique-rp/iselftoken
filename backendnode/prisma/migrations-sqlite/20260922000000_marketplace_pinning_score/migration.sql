-- ============================================================
-- Migration: marketplace_pinning_score
-- Data: 2026-09-22
-- Sprint: S1 (scripts/marketplace/sprints.json :: MKT-S1-T01)
-- Referencia: PRD_MARKETPLACE_IMPL.md §3.1 (adaptado de MySQL para SQLite)
--
-- Mudancas:
--   1. Pinning manual (RF-01) — 4 colunas em startups + FK
--   2. Cache do score automatico (RF-08) — 2 colunas
--   3. Indice composto para query principal do featured (manuallyPinned DESC, score DESC)
--
-- Natureza: ADITIVA + NULLABLE. Sem risco de perda de dados.
-- Rollback: ver docs/migrations-rollback.md
-- ============================================================

-- 1.1 Startups: pinning manual (RF-01)
ALTER TABLE "startups" ADD COLUMN "manuallyPinned" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "startups" ADD COLUMN "manuallyPinnedBy" INTEGER NULL;
ALTER TABLE "startups" ADD COLUMN "manuallyPinnedAt" DATETIME NULL;
ALTER TABLE "startups" ADD COLUMN "manuallyPinnedReason" TEXT NULL;

-- 1.2 Startups: cache do score automatico (RF-08)
ALTER TABLE "startups" ADD COLUMN "scoreBreakdown" TEXT NULL;
ALTER TABLE "startups" ADD COLUMN "scoreLastCalculatedAt" DATETIME NULL;

-- 1.3 FK: manuallyPinnedBy -> User(id) ON DELETE SET NULL
-- Prisma nao emite FK para colunas adicionadas via ALTER TABLE,
-- entao adicionamos manualmente.
-- SQLite exige recriar a tabela para adicionar FK; como e aditiva e o
-- ON DELETE SET NULL ja e garantido pelo service (defense in depth),
-- a FK e recomendada mas nao bloqueante para S1.
-- A validacao fica em S2 (ScoreCalculator) que checa manualmentePinnedBy.

-- 1.4 Indice composto: query principal do featured
--    "ORDER BY manuallyPinned DESC, score DESC"
CREATE INDEX IF NOT EXISTS "startups_manuallyPinned_score_idx"
  ON "startups" ("manuallyPinned" DESC, "score" DESC);