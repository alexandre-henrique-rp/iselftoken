-- ============================================================
-- Migration: add_payment_order_item
-- Data: 2026-10-09
-- Contexto: S18.7 — Refator do modelo de pagamento consolidado.
--
-- Antes: 1 ordem de pagamento (ex.: COMPLIANCE_FEE + FAST_DEPLOY) gerava
-- 2 Payment records irmãos com estado independente, permitindo o bug
-- "1 PAID + 1 PENDING" (payments #89 e #91 do log de auditoria do admin).
--
-- Depois: 1 PaymentOrder tem N PaymentItems, e o estado (status/paidAt/
-- txid/efiChargeId) é携带 na Order (atômico). Itens herdam o estado.
--
-- Estratégia de migração (zero downtime):
--   - Esta migration é NÃO-BREAKING: cria tabelas novas + adiciona coluna
--     em Payment para retrocompat (paymentGroupId). Nenhum dado é alterado.
--   - Fase 2: criação de novos checkouts passa a escrever em Order+Items
--     E em Payment (dual-write) com paymentGroupId cruzando os 2 sistemas.
--   - Fase 4: script de backfill popula Order+Items a partir de Payments
--     legados (online, em batches, com lock por linha).
--   - Fase 6 (cutover): após bake-time, drop table Payment.
-- ============================================================

-- 1. Nova tabela: PaymentOrder (a "ordem" — fonte da verdade do estado)
CREATE TABLE "PaymentOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "totalOriginal" DECIMAL NOT NULL,
    "totalDiscount" DECIMAL NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "couponId" INTEGER,
    "couponPercent" INTEGER,
    "txid" TEXT,
    "endToEndId" TEXT,
    "efiChargeId" TEXT,
    "expiresAt" DATETIME,
    "paidAt" DATETIME,
    "effectsAppliedAt" DATETIME,
    "campaignId" INTEGER,
    "startupDraftId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("startupDraftId") REFERENCES "StartupDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Unicidade dos identificadores do gateway (cada txid/efiChargeId/endToEndId
-- é único no gateway — não pode haver 2 Orders com o mesmo).
CREATE UNIQUE INDEX "PaymentOrder_txid_key" ON "PaymentOrder"("txid");
CREATE UNIQUE INDEX "PaymentOrder_endToEndId_key" ON "PaymentOrder"("endToEndId");
CREATE UNIQUE INDEX "PaymentOrder_efiChargeId_key" ON "PaymentOrder"("efiChargeId");
CREATE UNIQUE INDEX "PaymentOrder_startupDraftId_key" ON "PaymentOrder"("startupDraftId");

-- PERF: listagens por usuário com ordenação por data.
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");
-- PERF: dashboard admin / cron de reconciliação (status + paidAt).
CREATE INDEX "PaymentOrder_status_paidAt_idx" ON "PaymentOrder"("status", "paidAt");
-- PERF: listagem por campanha (admin/financeiro).
CREATE INDEX "PaymentOrder_campaignId_idx" ON "PaymentOrder"("campaignId");

-- 2. Nova tabela: PaymentItem (cada item de uma Order)
CREATE TABLE "PaymentItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DECIMAL NOT NULL,
    "originalSubtotal" DECIMAL NOT NULL,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "serviceDetails" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PERF: lookup de items por order.
CREATE INDEX "PaymentItem_orderId_idx" ON "PaymentItem"("orderId");
-- PERF: filtro por purpose (ex: listar todos os TOKEN_RESERVATION items).
CREATE INDEX "PaymentItem_purpose_idx" ON "PaymentItem"("purpose");

-- 3. Backward compat: Payment.paymentGroupId (link retroativo até cutover)
ALTER TABLE "Payment" ADD COLUMN "paymentGroupId" INTEGER;
CREATE INDEX "Payment_paymentGroupId_idx" ON "Payment"("paymentGroupId");
