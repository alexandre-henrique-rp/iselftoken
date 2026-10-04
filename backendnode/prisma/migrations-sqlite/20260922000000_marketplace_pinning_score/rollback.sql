-- ============================================================
-- Rollback: marketplace_pinning_score (DOWN)
-- Data: 2026-09-22
-- Sprint: S1 (scripts/marketplace/sprints.json :: MKT-S1-T01)
--
-- ATENCAO: este rollback remove os 6 campos adicionados em S1 e o indice
-- composto. Antes de executar em producao:
--   1. Confirmar que nenhuma query do codigo referencia os campos
--   2. Confirmar que nenhum pino esta ativo (manuallyPinned = 0 para todos)
--   3. Fazer backup do dev.db / staging / prod
--   4. Aplicar em horario de baixo trafego
--
-- Em staging/dev, basta rodar este arquivo apos o UP correspondente.
-- Em prod, copiar os comandos ALTER TABLE para um script de migration DOWN.
-- ============================================================

-- SQLite nao suporta DROP COLUMN diretamente em todas as versoes;
-- a forma segura e recriar a tabela. Para ambientes SQLite 3.35+,
-- o DROP COLUMN funciona e os comandos abaixo sao suficientes.

DROP INDEX IF EXISTS "startups_manuallyPinned_score_idx";

ALTER TABLE "startups" DROP COLUMN "scoreLastCalculatedAt";
ALTER TABLE "startups" DROP COLUMN "scoreBreakdown";
ALTER TABLE "startups" DROP COLUMN "manuallyPinnedReason";
ALTER TABLE "startups" DROP COLUMN "manuallyPinnedAt";
ALTER TABLE "startups" DROP COLUMN "manuallyPinnedBy";
ALTER TABLE "startups" DROP COLUMN "manuallyPinned";

-- Apos rodar:
--   npx prisma generate --schema=prisma/schema.sqlite.prisma
--   pnpm run prisma:sync
-- E reverter os tipos manualmentePinned* no schema.prisma.

-- Referencia: https://www.sqlite.org/lang_altertable.html#otheralter