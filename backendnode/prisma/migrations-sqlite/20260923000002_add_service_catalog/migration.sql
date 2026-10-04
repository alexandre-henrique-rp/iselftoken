-- Adiciona tabela de catalogo de servicos gerenciados pelo admin.
-- Cada Service e um servico pago que o founder pode contratar para uma
-- de suas startups (TOKEN_RESERVATION, COMPLIANCE_FEE, VERIFICATION_SEAL,
-- TOKEN_RESERVATION_EXTENSION, EARLY_ACCESS, etc).
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDesc" TEXT,
    "description" TEXT NOT NULL,
    "benefits" TEXT,
    "category" TEXT NOT NULL,
    "paymentPurpose" TEXT NOT NULL,
    "price" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requiresCampaignStatus" TEXT,
    "endpoint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    UNIQUE("slug")
);

CREATE INDEX "services_available_order_idx" ON "services"("available", "order");
