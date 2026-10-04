-- Migration: Add IP geo fields to LoginAlert
-- Campos de geolocalização IP (ip-api.com / ipinfo.io) para alertas de novo login.

ALTER TABLE "LoginAlert" ADD COLUMN "locationRegion" TEXT;
ALTER TABLE "LoginAlert" ADD COLUMN "locationTimezone" TEXT;
ALTER TABLE "LoginAlert" ADD COLUMN "locationOrg" TEXT;
ALTER TABLE "LoginAlert" ADD COLUMN "locationHostname" TEXT;
