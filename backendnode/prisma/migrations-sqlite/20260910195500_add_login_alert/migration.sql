CREATE TABLE "LoginAlert" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "publicId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "eventKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "trustedIp" TEXT,
  "ipClass" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "proxyChainTrusted" BOOLEAN NOT NULL DEFAULT false,
  "deviceLabel" TEXT,
  "deviceBrowser" TEXT,
  "deviceOperatingSystem" TEXT,
  "deviceType" TEXT,
  "deviceHash" TEXT,
  "locationSource" TEXT NOT NULL,
  "locationPrecision" TEXT NOT NULL,
  "locationCountry" TEXT,
  "locationCity" TEXT,
  "locationLatitudeRounded" REAL,
  "locationLongitudeRounded" REAL,
  "accuracyBucketMeters" INTEGER,
  "reason" TEXT NOT NULL,
  "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "deliveryMessageId" TEXT,
  "deliveryError" TEXT,
  "actionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "actionTokenJtiHash" TEXT,
  "actionExpiresAt" DATETIME,
  "confirmedAt" DATETIME,
  "dismissedAt" DATETIME,
  "sessionsDeleted" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LoginAlert_publicId_key" ON "LoginAlert"("publicId");
CREATE UNIQUE INDEX "LoginAlert_eventKey_key" ON "LoginAlert"("eventKey");
CREATE UNIQUE INDEX "LoginAlert_actionTokenJtiHash_key" ON "LoginAlert"("actionTokenJtiHash");
CREATE INDEX "LoginAlert_userId_createdAt_idx" ON "LoginAlert"("userId", "createdAt");
CREATE INDEX "LoginAlert_userId_actionStatus_idx" ON "LoginAlert"("userId", "actionStatus");
CREATE INDEX "LoginAlert_deliveryStatus_idx" ON "LoginAlert"("deliveryStatus");
