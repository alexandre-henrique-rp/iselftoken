-- S18.6: Breakdown financeiro + Fast Track Review no checkout da reserva de tokens.
--
-- Adiciona colunas ao Payment para auditoria (originalAmount / discountAmount /
-- paidAmount) e o novo campo StartupDraft.fastTrackPaymentId que referencia o
-- Payment adicional de FAST_TRACK_REVIEW (1:1, opcional).
--
-- Remove o UNIQUE INDEX de Payment.txid — um PIX consolidado (reserva + fast
-- track) gera 1 cobrança EFI e 1 txid compartilhado por 2 Payments. Substitui
-- por índice não-único para o lookup O(1) no webhook.
--
-- Convenção do projeto (AGENTS.md): migrations SQLite são SQL escrito à mão;
-- Decimal/DateTime/Json são armazenados como TEXT em SQLite.
-- (S18.6 — payment_fast_track_breakdown)

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "originalAmount" TEXT;
ALTER TABLE "Payment" ADD COLUMN "discountAmount" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paidAmount" TEXT;

-- AlterTable
ALTER TABLE "StartupDraft" ADD COLUMN "fastTrackPaymentId" INTEGER
  REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex (txid deixa de ser UNIQUE — 2 Payments podem compartilhar 1 txid)
DROP INDEX "Payment_txid_key";

-- CreateIndex (não-único, para lookup do webhook)
CREATE INDEX "Payment_txid_idx" ON "Payment"("txid");

-- CreateIndex (relação StartupDraft.fastTrackPaymentId)
CREATE UNIQUE INDEX "StartupDraft_fastTrackPaymentId_key"
  ON "StartupDraft"("fastTrackPaymentId");

-- AlterTable (S18.6 — flag de Fast Track Review na Startup)
ALTER TABLE "startups" ADD COLUMN "fastTrackReview" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "startups" ADD COLUMN "fastTrackReviewedAt" TEXT;