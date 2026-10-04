-- Fase 5: template biométrico facial (embedding) cifrado.
-- LGPD Art. 11: dado sensível — nunca em texto plano. Não-destrutiva (nova tabela).
CREATE TABLE "FaceBiometric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "templateEnc" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "templateHash" TEXT NOT NULL,
    "consentVersion" TEXT,
    "kycProfileId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaceBiometric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FaceBiometric_publicId_key" ON "FaceBiometric"("publicId");
CREATE UNIQUE INDEX "FaceBiometric_userId_key" ON "FaceBiometric"("userId");
CREATE INDEX "FaceBiometric_userId_idx" ON "FaceBiometric"("userId");
