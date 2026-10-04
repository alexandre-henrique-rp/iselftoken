-- Migration: Add politicaLucros to Campaign
--
-- Campo de texto livre (10-2000 chars) para o founder descrever a política de
-- participação nos lucros quando `participacaoLucros=true`. Era o único
-- campo do form de captação sem persistência — o mapper descartava o valor
-- silenciosamente (ver AGENTS.md história "lucrosDescricao").
--
-- Nullable porque campanhas existentes (DRAFT/OPEN/PAUSED) podem ainda não
-- ter esse campo preenchido — sem DEFAULT NOT NULL para não forçar backfill.

ALTER TABLE "Campaign" ADD COLUMN "politicaLucros" TEXT;
