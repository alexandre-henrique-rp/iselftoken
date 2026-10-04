-- Description: Adiciona Payment.effectsAppliedAt — marco de aplicação dos
--              efeitos de domínio de um pagamento confirmado (ativar plano/
--              investimento/reserva). A idempotência e a reconciliação passam
--              a se ancorar neste campo (não em status===PAID), permitindo
--              recuperar Payments PAID cujos efeitos nunca foram aplicados
--              (evita pago-sem-plano).
-- Created: 2026-09-05
-- Provider: SQLite
-- Note: em SQLite, DateTime é armazenado como TEXT (nullable).

ALTER TABLE "Payment" ADD COLUMN "effectsAppliedAt" TEXT;
