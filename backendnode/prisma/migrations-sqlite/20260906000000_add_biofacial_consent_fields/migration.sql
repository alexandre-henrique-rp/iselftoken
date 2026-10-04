-- Add optional biometric consent fields declared by the active SQLite schema.
-- Non-destructive: nullable columns only; existing User rows are preserved.
ALTER TABLE "User" ADD COLUMN "biofacialConsentAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "biofacialConsentVersion" TEXT;
