/*
  Warnings:

  - You are about to drop the `CouponUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `effectsAppliedAt` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `refundedAt` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `validFrom` on the `coupons` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `createdAt` on the `efi_account_openings` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `statusUpdatedAt` on the `efi_account_openings` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `efi_account_openings` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `createdAt` on the `installment_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `effectiveFrom` on the `installment_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `effectiveUntil` on the `installment_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `minInstallmentAmount` on the `installment_configs` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `monthlyInterestRate` on the `installment_configs` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `active` on the `split_configs` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `cancelledAt` on the `split_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `createdAt` on the `split_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `splits` on the `split_configs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `processed` on the `webhook_logs` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `processedAt` on the `webhook_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `receivedAt` on the `webhook_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - Made the column `status` on table `webhook_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX IF EXISTS "CouponUsage_couponId_idx";

-- DropIndex
DROP INDEX IF EXISTS "CouponUsage_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CouponUsage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WebhookLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "discountApplied" DECIMAL NOT NULL,
    "originalAmount" DECIMAL NOT NULL,
    "finalAmount" DECIMAL NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coupon_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coupon_usages_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
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
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_manualApprovedById_fkey" FOREIGN KEY ("manualApprovedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "campaignId", "copyPastePix", "createdAt", "effectsAppliedAt", "efiChargeId", "efiLocation", "endToEndId", "expiresAt", "id", "investmentId", "manualApprovedAt", "manualApprovedById", "manualComprovanteKey", "manualJustification", "method", "paidAt", "purpose", "qrCodeBase64", "refundReason", "refundTxid", "refundedAt", "refundedById", "serviceDetails", "status", "subscriptionId", "txid", "updatedAt", "userId") SELECT "amount", "campaignId", "copyPastePix", "createdAt", "effectsAppliedAt", "efiChargeId", "efiLocation", "endToEndId", "expiresAt", "id", "investmentId", "manualApprovedAt", "manualApprovedById", "manualComprovanteKey", "manualJustification", "method", "paidAt", "purpose", "qrCodeBase64", "refundReason", "refundTxid", "refundedAt", "refundedById", "serviceDetails", "status", "subscriptionId", "txid", "updatedAt", "userId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_investmentId_key" ON "Payment"("investmentId");
CREATE UNIQUE INDEX "Payment_txid_key" ON "Payment"("txid");
CREATE UNIQUE INDEX "Payment_endToEndId_key" ON "Payment"("endToEndId");
CREATE UNIQUE INDEX "Payment_efiChargeId_key" ON "Payment"("efiChargeId");
CREATE TABLE "new_coupons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_coupons" ("active", "code", "createdAt", "createdById", "description", "id", "maxUses", "percent", "status", "updatedAt", "usedCount", "validFrom", "validUntil") SELECT "active", "code", "createdAt", "createdById", "description", "id", "maxUses", "percent", "status", "updatedAt", "usedCount", "validFrom", "validUntil" FROM "coupons";
DROP TABLE "coupons";
ALTER TABLE "new_coupons" RENAME TO "coupons";
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_active_idx" ON "coupons"("active");
CREATE INDEX "coupons_validUntil_idx" ON "coupons"("validUntil");
CREATE INDEX "coupons_percent_idx" ON "coupons"("percent");
CREATE TABLE "new_efi_account_openings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "efiRegistrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusUpdatedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_efi_account_openings" ("createdAt", "efiRegistrationId", "id", "rejectionReason", "status", "statusUpdatedAt", "updatedAt", "userId") SELECT "createdAt", "efiRegistrationId", "id", "rejectionReason", "status", "statusUpdatedAt", "updatedAt", "userId" FROM "efi_account_openings";
DROP TABLE "efi_account_openings";
ALTER TABLE "new_efi_account_openings" RENAME TO "efi_account_openings";
CREATE UNIQUE INDEX "efi_account_openings_userId_key" ON "efi_account_openings"("userId");
CREATE UNIQUE INDEX "efi_account_openings_efiRegistrationId_key" ON "efi_account_openings"("efiRegistrationId");
CREATE TABLE "new_installment_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interestRate" DECIMAL NOT NULL DEFAULT 0.0299,
    "monthlyInterestRate" DECIMAL NOT NULL DEFAULT 0.0299,
    "maxInstallments" INTEGER NOT NULL DEFAULT 18,
    "minInstallmentAmount" DECIMAL NOT NULL DEFAULT 50.0,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT
);
INSERT INTO "new_installment_configs" ("createdAt", "createdById", "effectiveFrom", "effectiveUntil", "id", "maxInstallments", "minInstallmentAmount", "monthlyInterestRate", "notes") SELECT "createdAt", "createdById", "effectiveFrom", "effectiveUntil", "id", "maxInstallments", "minInstallmentAmount", "monthlyInterestRate", "notes" FROM "installment_configs";
DROP TABLE "installment_configs";
ALTER TABLE "new_installment_configs" RENAME TO "installment_configs";
CREATE INDEX "installment_configs_effectiveFrom_effectiveUntil_idx" ON "installment_configs"("effectiveFrom", "effectiveUntil");
CREATE INDEX "installment_configs_isActive_idx" ON "installment_configs"("isActive");
CREATE TABLE "new_split_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "efiSplitId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "splits" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME,
    "cancelledById" INTEGER
);
INSERT INTO "new_split_configs" ("active", "cancelledAt", "cancelledById", "createdAt", "createdById", "description", "efiSplitId", "id", "name", "splits") SELECT "active", "cancelledAt", "cancelledById", "createdAt", "createdById", "description", "efiSplitId", "id", "name", "splits" FROM "split_configs";
DROP TABLE "split_configs";
ALTER TABLE "new_split_configs" RENAME TO "split_configs";
CREATE UNIQUE INDEX "split_configs_efiSplitId_key" ON "split_configs"("efiSplitId");
CREATE INDEX "split_configs_active_idx" ON "split_configs"("active");
CREATE TABLE "new_webhook_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'EFI_BANK',
    "eventType" TEXT,
    "txid" TEXT,
    "endToEndId" TEXT,
    "efiChargeId" TEXT,
    "cpfHash" TEXT,
    "cnpjHash" TEXT,
    "amount" DECIMAL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorLog" TEXT,
    "payload" TEXT,
    "payloadS3Key" TEXT,
    "payloadS3Bucket" TEXT,
    "payloadExpiresAt" DATETIME,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "idempotencyKey" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_webhook_logs" ("efiChargeId", "errorLog", "eventType", "id", "ipAddress", "payload", "processed", "processedAt", "provider", "receivedAt", "retryCount", "status", "txid") SELECT "efiChargeId", "errorLog", "eventType", "id", "ipAddress", "payload", "processed", "processedAt", "provider", "receivedAt", "retryCount", "status", "txid" FROM "webhook_logs";
DROP TABLE "webhook_logs";
ALTER TABLE "new_webhook_logs" RENAME TO "webhook_logs";
CREATE UNIQUE INDEX "webhook_logs_idempotencyKey_key" ON "webhook_logs"("idempotencyKey");
CREATE INDEX "webhook_logs_txid_idx" ON "webhook_logs"("txid");
CREATE INDEX "webhook_logs_cpfHash_idx" ON "webhook_logs"("cpfHash");
CREATE INDEX "webhook_logs_eventType_receivedAt_idx" ON "webhook_logs"("eventType", "receivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "coupon_usages_userId_idx" ON "coupon_usages"("userId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_couponId_paymentId_key" ON "coupon_usages"("couponId", "paymentId");
