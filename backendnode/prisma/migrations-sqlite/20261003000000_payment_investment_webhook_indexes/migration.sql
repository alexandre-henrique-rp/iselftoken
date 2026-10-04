-- ============================================================
-- Migration: payment_investment_webhook_indexes
-- Data: 2026-10-03
-- Contexto: Otimização de performance da página /admin/dashboard
--           (endpoint GET /admin/dashboard/summary :: AdminDashboardSummaryService)
--           + queries comuns por userId/data nos módulos payment e investment.
--
-- Problema: queries com WHERE userId + ORDER BY createdAt DESC nas tabelas
--           Payment e Investment não possuem índice composto, forçando full
--           table scan a cada request do dashboard admin (29 agregados em
--           Promise.all) e em listagens filtradas por userId.
--
-- Mudanças (apenas CREATE INDEX — ADITIVA, sem risco de perda de dados):
--   1. Payment(userId, createdAt)     — listagens por usuário (admin/financeiro)
--   2. Investment(userId, createdAt)  — my-startups + dashboard agregado
--
-- NOTA: WebhookLog[eventType, receivedAt] já existe no schema desde a
-- migration 20260908000000_add_notification_table, então não é recriado aqui.
--
-- Rollback:
--   DROP INDEX IF EXISTS "Payment_userId_createdAt_idx";
--   DROP INDEX IF EXISTS "Investment_userId_createdAt_idx";
-- ============================================================

CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx"
  ON "Payment" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Investment_userId_createdAt_idx"
  ON "Investment" ("userId", "createdAt");