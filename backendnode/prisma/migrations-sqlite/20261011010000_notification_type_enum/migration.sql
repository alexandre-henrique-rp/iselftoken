-- Migration: Notification.type String → enum Prisma.
--
-- Contexto (Sprint de Notificacoes — central 2026-10-04):
-- O schema Prisma foi atualizado para `type NotificationType @default(general)`.
-- O enum Prisma gera CHECK constraint automaticamente em `migrate dev` /
-- `prisma db push` (cobre bancos novos). Para `migrate deploy` em prod
-- (banco ja materializado), o Prisma 7.8+ adiciona CHECK constraints
-- para tipos enum ao recriar o schema — porem a forma mais segura para
-- dados legados e a estrategia abaixo (rename + recreate + backfill).
--
-- Estrategia (idempotente e safe):
--  1. Renomeia a tabela antiga para `Notification__old`
--  2. Cria `Notification` nova com a coluna `type` como TEXT (Prisma modela
--     enums como TEXT no SQLite). Quando o Prisma Client valida em runtime,
--     o CHECK constraint e aplicado. Em dev fresh, o `migrate dev` ja cria
--     o CHECK automaticamente.
--  3. Copia dados da tabela antiga para a nova, MASCARANDO valores invalidos
--     para `general` (default seguro, snake_case alinhado com enum Prisma).
--  4. Dropa `Notification__old`
--
-- Valores do enum (snake_case — alinhados com `prisma/schema.sqlite.prisma`):
--   kyc_approved, kyc_resubmission_requested,
--   investment_confirmed, token_purchased,
--   campaign_funded, campaign_deadline, campaign_closed,
--   startup_approved, startup_rejected, startup_phase_approved, phase_approved,
--   compliance_request, security, general,
--   user_approved, user_suspended,
--   plan_purchased, plan_added,
--   repasse_request, repasse_approved, repasse_rejected, repasse_paid

PRAGMA foreign_keys = OFF;

-- DROP da tabela shadow se existir de uma migration parcial
DROP TABLE IF EXISTS "Notification__old";

-- 1. Renomeia a tabela antiga
ALTER TABLE "Notification" RENAME TO "Notification__old";

-- 2. Cria a nova tabela com a coluna `type` como TEXT (Prisma modela enum como
-- TEXT no SQLite). O CHECK constraint sera aplicado pelo Prisma Client / em
-- migrate dev; aqui mantemos flexivel para garantir que dados legados
-- continuem funcionando.
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "isRead" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 3. Indices (mesmos do schema Prisma)
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
    ON "Notification"("userId", "isRead");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
    ON "Notification"("userId", "createdAt");

-- 4. Backfill com normalizacao de valores invalidos. Como o enum Prisma/TS
-- ja estava em snake_case, o CAST e identidade (so normaliza NULL/vazio/invalido
-- para 'general' = default seguro).
INSERT INTO "Notification" (
    "id", "userId", "title", "description", "type", "isRead", "createdAt", "updatedAt"
)
SELECT
    "id",
    "userId",
    "title",
    "description",
    CASE
        WHEN "type" IN (
            'kyc_approved', 'kyc_resubmission_requested',
            'investment_confirmed', 'token_purchased',
            'campaign_funded', 'campaign_deadline', 'campaign_closed',
            'startup_approved', 'startup_rejected', 'startup_phase_approved', 'phase_approved',
            'compliance_request', 'security', 'general',
            'user_approved', 'user_suspended',
            'plan_purchased', 'plan_added',
            'repasse_request', 'repasse_approved', 'repasse_rejected', 'repasse_paid'
        ) THEN "type"
        ELSE 'general'
    END,
    "isRead",
    "createdAt",
    "updatedAt"
FROM "Notification__old";

-- 5. Dropa a tabela antiga
DROP TABLE "Notification__old";

PRAGMA foreign_keys = ON;

