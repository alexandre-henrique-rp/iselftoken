-- "Não se aplica" estruturado por categoria (fluxo_startup §2), aditiva.
-- Substitui o marcador improvisado (PDF fake "não_se_aplica.pdf").
CREATE TABLE IF NOT EXISTS "startup_document_na" (
  "id"            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "startupId"     INTEGER NOT NULL,
  "categoria"     TEXT    NOT NULL,
  "justificativa" TEXT    NOT NULL,
  "reviewStatus"  TEXT    NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewNote"    TEXT,
  "reviewedAt"    DATETIME,
  "reviewedById"  INTEGER,
  "createdById"   INTEGER NOT NULL,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "startup_document_na_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE,
  CONSTRAINT "startup_document_na_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL,
  CONSTRAINT "startup_document_na_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "startup_document_na_startupId_categoria_key" ON "startup_document_na" ("startupId", "categoria");
CREATE INDEX IF NOT EXISTS "startup_document_na_startupId_idx" ON "startup_document_na" ("startupId");
