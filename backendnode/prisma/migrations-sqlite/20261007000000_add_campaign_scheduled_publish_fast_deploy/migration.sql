-- Publicação com delay de 24h pós-aprovação Fase 3 + serviço FAST_DEPLOY.
-- `scheduledPublishAt`: horário alvo da publicação (campanha fica DRAFT até lá).
-- `fastDeploy`: true quando o founder contratou "Publicação Rápida" (publicação imediata).
ALTER TABLE "Campaign" ADD COLUMN "scheduledPublishAt" DATETIME;
ALTER TABLE "Campaign" ADD COLUMN "fastDeploy" BOOLEAN NOT NULL DEFAULT false;
