-- Fase A (H2 — audit): adiciona coluna requirePasswordReset ao User.
-- Setada por dismiss-session quando user reporta login desconhecido.
-- Limpa apos troca de senha com sucesso.
-- Nao-destrutivo: nullable default false, nao afeta dados existentes.
ALTER TABLE "User" ADD COLUMN "requirePasswordReset" BOOLEAN NOT NULL DEFAULT 0;