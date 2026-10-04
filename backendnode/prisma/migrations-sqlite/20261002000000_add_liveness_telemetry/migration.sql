-- Fase 2: telemetria de prova de vida (liveness).
-- Não-destrutiva: cria uma nova tabela; nenhuma coluna existente é alterada.
-- Convenções SQLite/Prisma: Boolean → INTEGER, DateTime/Json → TEXT, Float → REAL.
CREATE TABLE "LivenessTelemetry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "kycProfileId" INTEGER,
    "passed" INTEGER NOT NULL,
    "blinkCount" INTEGER NOT NULL DEFAULT 0,
    "hasGlasses" INTEGER,
    "maxYawDeg" REAL NOT NULL DEFAULT 0,
    "maxPitchDeg" REAL NOT NULL DEFAULT 0,
    "landmarkMovement" REAL NOT NULL DEFAULT 0,
    "avgRelativeMovement" REAL NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "instructions" TEXT,
    "rejectionReasons" TEXT,
    "userAgentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LivenessTelemetry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LivenessTelemetry_publicId_key" ON "LivenessTelemetry"("publicId");
CREATE INDEX "LivenessTelemetry_userId_idx" ON "LivenessTelemetry"("userId");
CREATE INDEX "LivenessTelemetry_kycProfileId_idx" ON "LivenessTelemetry"("kycProfileId");
CREATE INDEX "LivenessTelemetry_createdAt_idx" ON "LivenessTelemetry"("createdAt");
