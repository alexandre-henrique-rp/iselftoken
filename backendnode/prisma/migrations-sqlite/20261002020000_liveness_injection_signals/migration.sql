-- Fase 4: sinais anti-injeção (câmera virtual) na telemetria de liveness.
-- Não-destrutiva: colunas nullable/com default.
ALTER TABLE "LivenessTelemetry" ADD COLUMN "injectionSuspicious" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LivenessTelemetry" ADD COLUMN "injectionReasons" TEXT;
