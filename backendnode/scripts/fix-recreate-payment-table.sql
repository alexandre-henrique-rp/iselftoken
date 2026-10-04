-- ============================================================
-- Fix: recriar tabela Payment (dropada acidentalmente em prod)
-- Uso: sqlite3 /app/data/dev.db < scripts/fix-recreate-payment-table.sql
--
-- Contexto: a migration 20261010000000_drop_payment_legacy_table dropou
-- a tabela Payment prematuramente, antes dos 19 arquivos que usam
-- prisma.payment.* serem refatorados. Isso quebrou o container com
-- P3009 e a seed com "table does not exist".
--
-- Este script recria a tabela Payment + índices para que:
--   1. O container possa subir (P3009 resolvido)
--   2. A seed funcione novamente
--   3. O backend continue usando Payment legacy
--
-- IMPORTANTE: este script é IDEMPOTENTE (usa IF NOT EXISTS). Pode
-- ser rodado múltiplas vezes sem causar problemas.
-- ============================================================

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

-- Marca a migration como 'applied' para que o Prisma não tente aplicá-la
-- de novo (que falharia porque a tabela agora existe).
-- IMPORTANTE: ajuste o checksum se necessário — rode `prisma migrate resolve`
-- para regenerar se Prisma reclamar.
INSERT OR IGNORE INTO "_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
) VALUES (
    'fix-recreate-payment-table',
    'manual_fix_2026_10_03',
    strftime('%s', 'now') * 1000,
    '20261010000000_drop_payment_legacy_table',
    NULL,
    NULL,
    strftime('%s', 'now') * 1000,
    1
);
