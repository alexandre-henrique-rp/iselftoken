-- ============================================================
-- Migration: drop_payment_legacy_table (REVERTIDA → NO-OP)
-- Data original: 2026-10-03
-- Atualizado: 2026-10-03 (rollback de emergência em prod)
--
-- CONTEXTO: Esta migration foi criada como parte do plano S18.7 para
-- cutover final do modelo Payment legacy. No entanto, ela foi aplicada
-- prematuramente em prod antes que os 19 arquivos que usam
-- `prisma.payment.*` (112 usos) fossem refatorados, quebrando o startup
-- do container com erro P3009:
--
--   "migrate found failed migrations in the target database, new
--    migrations will not be applied. The `20261010000000_drop_payment_legacy_table`
--    migration started at 2026-10-03 05:22:48.158 UTC failed"
--
-- CORREÇÃO: Esta migration foi transformada em NO-OP que apenas garante
-- que a tabela `Payment` existe (criando-a como vazia se foi dropada).
-- Isso permite o container subir novamente. O cutover REAL continua
-- planejado para uma fase dedicada APÓS refatorar todos os consumidores
-- de `prisma.payment.*` para `prisma.paymentOrder`/`prisma.paymentItem`.
--
-- Para prod, executa este SQL manualmente ANTES de subir o container:
--
--   sqlite3 /app/data/dev.db < prisma/migrations-sqlite/20261010000000_drop_payment_legacy_table/migration.sql
--
-- Ou, equivalentemente, recriar a tabela Payment com o schema original
-- (cujas colunas estão abaixo no comentário para referência).
--
-- ============================================================
-- Schema original da tabela Payment (para referência):
-- ============================================================
-- CREATE TABLE "Payment" (
--     "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
--     "userId" INTEGER NOT NULL,
--     "subscriptionId" INTEGER,
--     "investmentId" INTEGER,
--     "purpose" TEXT NOT NULL,
--     "amount" DECIMAL NOT NULL,
--     "method" TEXT NOT NULL,
--     "status" TEXT NOT NULL DEFAULT 'PENDING',
--     "txid" TEXT,
--     "endToEndId" TEXT,
--     "efiChargeId" TEXT,
--     "efiLocation" TEXT,
--     "qrCodeBase64" TEXT,
--     "copyPastePix" TEXT,
--     "paidAt" DATETIME,
--     "effectsAppliedAt" DATETIME,
--     "expiresAt" DATETIME,
--     "campaignId" INTEGER,
--     "serviceDetails" JSONB,
--     "manualApprovedById" INTEGER,
--     "manualApprovedAt" DATETIME,
--     "manualJustification" TEXT,
--     "manualComprovanteKey" TEXT,
--     "refundedAt" DATETIME,
--     "refundedById" INTEGER,
--     "refundReason" TEXT,
--     "refundTxid" TEXT,
--     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" DATETIME NOT NULL,
--     "originalAmount" TEXT,
--     "discountAmount" TEXT,
--     "paidAmount" TEXT,
--     "paymentGroupId" INTEGER
-- );
-- ============================================================

-- NO-OP: a tabela Payment é recriada se foi dropada (rollback defensivo).
-- Foreign keys e índices são recriados com IF NOT EXISTS para idempotência.
-- Após esta migration ser marcada como "applied", o container sobe
-- normalmente e o backend continua usando Payment legacy (como antes).

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "investmentId" INTEGER,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txid" TEXT,
    "endToEndId" TEXT,
    "efiChargeId" TEXT,
    "efiLocation" TEXT,
    "qrCodeBase64" TEXT,
    "copyPastePix" TEXT,
    "paidAt" DATETIME,
    "effectsAppliedAt" DATETIME,
    "expiresAt" DATETIME,
    "campaignId" INTEGER,
    "serviceDetails" JSONB,
    "manualApprovedById" INTEGER,
    "manualApprovedAt" DATETIME,
    "manualJustification" TEXT,
    "manualComprovanteKey" TEXT,
    "refundedAt" DATETIME,
    "refundedById" INTEGER,
    "refundReason" TEXT,
    "refundTxid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "originalAmount" TEXT,
    "discountAmount" TEXT,
    "paidAmount" TEXT,
    "paymentGroupId" INTEGER
);

CREATE INDEX IF NOT EXISTS "Payment_paymentGroupId_idx" ON "Payment"("paymentGroupId");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_campaignId_status_idx" ON "Payment"("campaignId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_investmentId_key" ON "Payment"("investmentId");
