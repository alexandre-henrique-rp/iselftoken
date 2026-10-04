-- Fase 3: tempo de resposta por desafio (DF-CAPTCHA) na telemetria de liveness.
-- Não-destrutiva: coluna nullable (JSON armazenado como TEXT no SQLite).
ALTER TABLE "LivenessTelemetry" ADD COLUMN "challengeResponseMs" TEXT;
