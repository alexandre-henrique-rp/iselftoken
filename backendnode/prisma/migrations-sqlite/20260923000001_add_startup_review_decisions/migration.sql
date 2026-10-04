-- Migration: Add startup_review_decisions table
--
-- Histórico de decisões de auditoria (aprovar/rejeitar) tomadas por
-- admin/compliance nas 3 fases do fluxo de founder. Quando REJECTED,
-- persiste `rejectedSnapshot` (JSON) com os campos da startup no
-- momento da rejeição — permite diff field-by-field no admin quando
-- o founder atualizar o cadastro depois.
--
-- Cf. /admin/startups/:id/1, /2, /3 — UI mostra "Aprovado por X em
-- DD/MM HH:mm" ou "Rejeitado por X — Motivo: ..." e destaca os campos
-- alterados desde a rejeição.

CREATE TABLE "startup_review_decisions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "startupId" INTEGER NOT NULL,
  "phase" INTEGER NOT NULL,
  "decision" TEXT NOT NULL,
  "justification" TEXT,
  "adminUserId" INTEGER,
  "adminName" TEXT,
  "adminEmail" TEXT,
  "rejectedSnapshot" TEXT,
  "ip" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "startup_review_decisions_startupId_phase_createdAt_idx"
  ON "startup_review_decisions"("startupId", "phase", "createdAt");
