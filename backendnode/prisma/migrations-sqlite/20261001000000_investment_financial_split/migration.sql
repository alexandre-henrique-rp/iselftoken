-- Split financeiro do investimento (checkout: subtotal de tokens + taxa da
-- plataforma; repasse a startup = qtd x preco base; receita plataforma =
-- spread de venda + taxa).
--
-- O split e calculado e gravado na criacao do pedido (o Payment.amount precisa
-- do total ja na criacao) e carimbado com `allocatedAt` na confirmacao do
-- pagamento (mesma transaction de confirmInvestment — idempotencia continua
-- ancorada em Payment.effectsAppliedAt).
--
-- Convencao do projeto (AGENTS.md): migrations SQLite sao SQL escrito a mao;
-- Decimal/DateTime/Json sao armazenados como TEXT em SQLite.

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN "tokenBasePrice" TEXT;
ALTER TABLE "Investment" ADD COLUMN "tokenSellPrice" TEXT;
ALTER TABLE "Investment" ADD COLUMN "tokenSubtotal" TEXT;
ALTER TABLE "Investment" ADD COLUMN "platformFeePct" TEXT;
ALTER TABLE "Investment" ADD COLUMN "platformFeeAmount" TEXT;
ALTER TABLE "Investment" ADD COLUMN "startupRepasseAmount" TEXT;
ALTER TABLE "Investment" ADD COLUMN "platformSpreadAmount" TEXT;
ALTER TABLE "Investment" ADD COLUMN "platformRevenueAmount" TEXT;
ALTER TABLE "Investment" ADD COLUMN "affiliateCommissionAmount" TEXT;
ALTER TABLE "Investment" ADD COLUMN "allocatedAt" TEXT;

-- Backfill de investimentos legados CONFIRMED: no modelo anterior o preco de
-- venda era igual ao preco base (campaign.tokenPrice), entao o repasse a
-- startup era o proprio amount e a receita da plataforma por investimento era
-- zero. `allocatedAt` usa o paidAt do Payment associado.
UPDATE "Investment" SET
  "tokenBasePrice" = (
    SELECT "Campaign"."tokenPrice" FROM "Campaign"
    WHERE "Campaign"."id" = "Investment"."campaignId"
  ),
  "tokenSellPrice" = (
    SELECT "Campaign"."tokenPrice" FROM "Campaign"
    WHERE "Campaign"."id" = "Investment"."campaignId"
  ),
  "tokenSubtotal" = "Investment"."amount",
  "startupRepasseAmount" = "Investment"."amount",
  "platformSpreadAmount" = '0',
  "platformFeeAmount" = '0',
  "platformRevenueAmount" = '0',
  "allocatedAt" = (
    SELECT "Payment"."paidAt" FROM "Payment"
    WHERE "Payment"."investmentId" = "Investment"."id"
  )
WHERE "Investment"."status" = 'CONFIRMED';
