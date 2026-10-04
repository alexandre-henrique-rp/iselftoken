-- Migration: Persistir metadata normalizado da consulta client-side de IP no AccessLog
-- Os campos são nullable para preservar registros históricos e compatibilidade.

ALTER TABLE "AccessLog" ADD COLUMN "ipHostname" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipCity" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipRegion" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipCountry" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipLocation" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipOrganization" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipTimezone" TEXT;
ALTER TABLE "AccessLog" ADD COLUMN "ipCapturedAt" DATETIME;
