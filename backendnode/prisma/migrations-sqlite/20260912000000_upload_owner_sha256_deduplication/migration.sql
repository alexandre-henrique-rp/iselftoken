-- Migracao aprovada: ownership individual e deduplicacao por SHA-256.
-- Preserva todos os registros e chaves fisicas; somente remove a unicidade
-- global do hash e permite uploads publicos sem proprietario.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Upload" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "startupId" INTEGER,
    "userId" INTEGER,
    "type" TEXT,
    "mime_type" TEXT,
    "originalName" TEXT,
    "size_bytes" INTEGER,
    "extension" TEXT,
    "bucket" TEXT,
    "key" TEXT,
    "sha256" TEXT,
    "variants" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT,
    "url" TEXT,
    "url_md" TEXT,
    "url_web" TEXT,
    "documentType" TEXT,
    "applicancy" TEXT NOT NULL DEFAULT 'APPLICABLE',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Upload_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Upload" (
    "id", "publicId", "startupId", "userId", "type", "mime_type",
    "originalName", "size_bytes", "extension", "bucket", "key", "sha256",
    "variants", "status", "fileKey", "url", "url_md", "url_web", "documentType", "applicancy",
    "rejectionReason", "createdAt", "updatedAt", "deletedAt"
)
SELECT
    "id", "publicId", "startupId", "userId", "type", "mime_type",
    "originalName", "size_bytes", "extension", "bucket", "key", "sha256",
    "variants", "status", "fileKey", "url", "url_md", "url_web", "documentType", "applicancy",
    "rejectionReason", "createdAt", "updatedAt", "deletedAt"
FROM "Upload";

DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";

CREATE UNIQUE INDEX "Upload_publicId_key" ON "Upload"("publicId");
CREATE UNIQUE INDEX "Upload_userId_sha256_key" ON "Upload"("userId", "sha256");
CREATE INDEX "Upload_startupId_idx" ON "Upload"("startupId");
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");
CREATE INDEX "Upload_sha256_idx" ON "Upload"("sha256");
CREATE INDEX "Upload_status_idx" ON "Upload"("status");
CREATE INDEX "Upload_deletedAt_idx" ON "Upload"("deletedAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
