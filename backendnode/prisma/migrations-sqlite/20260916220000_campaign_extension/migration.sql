-- Prorrogação da captação: reserva adicional (PRD_RECEBIMENTO §6.3), aditiva.
-- PaymentPurpose.TOKEN_RESERVATION_EXTENSION é TEXT em SQLite (sem DDL).
CREATE TABLE IF NOT EXISTS "campaign_extensions" (
  "id"               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "campaignId"       INTEGER NOT NULL,
  "additionalAmount" DECIMAL NOT NULL,
  "totalAmountShown" DECIMAL NOT NULL,
  "tokenReserve"     INTEGER NOT NULL,
  "periodDays"       INTEGER NOT NULL DEFAULT 30,
  "status"           TEXT    NOT NULL DEFAULT 'PENDING_RESERVATION_PAYMENT',
  "paymentId"        INTEGER,
  "createdById"      INTEGER NOT NULL,
  "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_extensions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE,
  CONSTRAINT "campaign_extensions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL,
  CONSTRAINT "campaign_extensions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_extensions_paymentId_key" ON "campaign_extensions" ("paymentId");
CREATE INDEX IF NOT EXISTS "campaign_extensions_campaignId_idx" ON "campaign_extensions" ("campaignId");
