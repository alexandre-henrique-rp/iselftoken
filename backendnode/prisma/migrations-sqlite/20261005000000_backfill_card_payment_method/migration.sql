-- ============================================================
-- Migration: backfill_card_payment_method
-- Data: 2026-10-05
-- Contexto: BUG-FIX — Payment.method congelado em 'PIX' após
--           liquidação via cartão de crédito.
--
-- Problema: PaymentService.generateCardCheckout (backendnode/src/api/
-- payment/payment.service.ts) NÃO atualizava o campo `method` no
-- `prisma.payment.updateMany`. Como o wizard de criação de startup e
-- o DTO CreateStartupCheckoutDto têm `method='PIX'` como default,
-- Payments PENDING eram criados com PIX e permaneciam com PIX no
-- banco mesmo após a EFI aprovar a cobrança via cartão. A UI em
-- /user/payments e /pending-payments-card lia esse campo estático
-- e exibia "PIX" para transações pagas com cartão.
--
-- Correção simultânea no código:
--   1. generateCardCheckout() agora inclui `method: 'CREDIT_CARD'`
--      no `data` do `updateMany` (token do lock de emissão).
--   2. Quando installments > 1, persiste também `serviceDetails.installments`.
--
-- Esta migration corrige o LEGADO: Payments que ficaram com
-- method='PIX' apesar de terem `efiChargeId` (evidência de cobrança
-- via cartão EFI) são atualizados para method='CREDIT_CARD'.
--
-- Idempotência: WHERE filtra apenas `method='PIX'`, então re-rodar
-- a migration não afeta linhas já corrigidas. Seguro para dev e prod.
--
-- Rollback (apenas se necessário):
--   UPDATE "Payment"
--   SET "method" = 'PIX'
--   WHERE "efiChargeId" IS NOT NULL AND "method" = 'CREDIT_CARD';
-- ============================================================

UPDATE "Payment"
SET "method" = 'CREDIT_CARD'
WHERE "efiChargeId" IS NOT NULL
  AND "method" = 'PIX';