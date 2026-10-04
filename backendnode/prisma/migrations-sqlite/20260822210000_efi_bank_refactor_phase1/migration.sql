-- Migration: efi_bank_refactor_phase1
-- Description: EFI Bank migration phase 1 - new models, extended Payment, extended Coupon
-- Created: 2026-08-22
-- Provider: SQLite

-- ============================================
-- 1. Remove BOLETO from PaymentMethod enum
-- Note: SQLite uses TEXT for enums, no schema change needed for enum removal
-- The application validates enum values
-- ============================================

-- ============================================
-- 2. Add EFI Bank fields to Payment
-- ============================================

ALTER TABLE "Payment" ADD COLUMN "efiChargeId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "efiLocation" TEXT;
ALTER TABLE "Payment" ADD COLUMN "expiresAt" TEXT;

-- ============================================
-- 3. Add refund fields to Payment
-- ============================================

ALTER TABLE "Payment" ADD COLUMN "refundedAt" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundedById" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "refundReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundTxid" TEXT;

-- ============================================
-- 4. Rename coupon table and create CouponUsage
-- ============================================

ALTER TABLE "coupon" RENAME TO "coupons";

ALTER TABLE "coupons" ADD COLUMN "validFrom" TEXT;
ALTER TABLE "coupons" ADD COLUMN "description" TEXT;
ALTER TABLE "coupons" ADD COLUMN "createdById" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "coupons" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
-- updatedAt already exists

CREATE TABLE IF NOT EXISTS "CouponUsage" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "couponId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "paymentId" INTEGER,
  "discountApplied" REAL NOT NULL,
  "originalAmount" REAL NOT NULL,
  "finalAmount" REAL NOT NULL,
  "appliedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("couponId", "paymentId")
);

CREATE INDEX IF NOT EXISTS "CouponUsage_userId_idx" ON "CouponUsage"("userId");
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- ============================================
-- 5. Create InstallmentConfig model
-- ============================================

CREATE TABLE IF NOT EXISTS "installment_configs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "maxInstallments" INTEGER NOT NULL,
  "monthlyInterestRate" REAL NOT NULL,
  "minInstallmentAmount" REAL NOT NULL,
  "effectiveFrom" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TEXT,
  "createdById" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "installment_configs_effective_idx" ON "installment_configs"("effectiveFrom", "effectiveUntil");

-- ============================================
-- 6. Create SplitConfig model
-- ============================================

CREATE TABLE IF NOT EXISTS "split_configs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "efiSplitId" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "splits" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "createdById" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TEXT,
  "cancelledById" INTEGER
);

CREATE INDEX IF NOT EXISTS "split_configs_active_idx" ON "split_configs"("active");

-- ============================================
-- 7. Create EfiAccountOpening model
-- ============================================

CREATE TABLE IF NOT EXISTS "efi_account_openings" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" INTEGER NOT NULL UNIQUE,
  "efiRegistrationId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "statusUpdatedAt" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. Replace WebhookLog (EFI era)
-- ============================================

DROP TABLE IF EXISTS "webhook_logs";

CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT,
  "txid" TEXT,
  "efiChargeId" TEXT,
  "payload" TEXT NOT NULL,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TEXT,
  "status" TEXT,
  "errorLog" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "ipAddress" TEXT,
  "receivedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_logs_provider_txid_eventType_key" ON "webhook_logs"("provider", "txid", "eventType");
CREATE INDEX IF NOT EXISTS "webhook_logs_processed_receivedAt_idx" ON "webhook_logs"("processed", "receivedAt");
