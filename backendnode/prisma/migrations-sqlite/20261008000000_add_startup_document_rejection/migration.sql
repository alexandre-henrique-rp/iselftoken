-- Rejeições de documentos de startup (fluxo §2) — fonte de verdade do banner
-- vermelho no /founder/startups/:id/edit/documentos quando o admin reprova
-- um StartupDocument (o doc original é hard-deleted junto com o arquivo S3).
-- A row aqui vive até o founder subir um substituto (resolvedAt setado pelo
-- service de upload). Cascade delete da startup derruba as rejeições.
CREATE TABLE "StartupDocumentRejection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rejectedById" INTEGER NOT NULL,
    "rejectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "StartupDocumentRejection_startupId_categoria_resolvedAt_idx"
    ON "StartupDocumentRejection"("startupId", "categoria", "resolvedAt");

CREATE INDEX IF NOT EXISTS "StartupDocumentRejection_startupId_resolvedAt_idx"
    ON "StartupDocumentRejection"("startupId", "resolvedAt");