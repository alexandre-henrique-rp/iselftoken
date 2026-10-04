-- Revisão do Compliance/Admin por documento (fluxo_startup §2), aditiva.
-- Enums em SQLite são TEXT (sem DDL). Colunas nullable/com default preservam
-- os StartupDocument existentes.
ALTER TABLE "StartupDocument" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE "StartupDocument" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "StartupDocument" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "StartupDocument" ADD COLUMN "reviewedById" INTEGER;
