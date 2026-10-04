-- Migração de fundação do fluxo de startups (aditiva / não-destrutiva).
-- Ref.: scripts/startups/fluxo_startup.md (§1, §4, §4B, §5),
--       scripts/startups/PRD_RECEBIMENTO_CAPTACAO.md (§8, §9),
--       scripts/startups/SPEC_STARTUP_PUBLICA_PRIVADA.md (§16.2).
--
-- OBS SQLite/Prisma: enums são persistidos como TEXT (CHECK não é emitido pelo
-- adapter better-sqlite3). Por isso, adicionar novos VALORES de enum
-- (StartupStatus.AWAITING_COMPLIANCE_FEE, StartupStatus.PENDING_APPROVAL,
-- PaymentStatus.EXPIRED, PaymentPurpose.COMPLIANCE_FEE) NÃO exige DDL —
-- basta o schema.prisma + regeneração do client. Esta migration cobre apenas
-- os CAMPOS novos (ADD COLUMN), todos nullable/com default para preservar as
-- linhas existentes.

-- === Installment: comprovante + txid genérico da parcela ===
ALTER TABLE "installments" ADD COLUMN "comprovanteUrl" TEXT;
ALTER TABLE "installments" ADD COLUMN "txId" TEXT;

-- === InstallmentRequest: relatório do mês (obrigatório para solicitar) ===
ALTER TABLE "installment_requests" ADD COLUMN "usoRecurso" TEXT;
ALTER TABLE "installment_requests" ADD COLUMN "teveLucro" BOOLEAN;
ALTER TABLE "installment_requests" ADD COLUMN "marcoAlcancado" BOOLEAN;
ALTER TABLE "installment_requests" ADD COLUMN "marcoDescricao" TEXT;
ALTER TABLE "installment_requests" ADD COLUMN "mensagemInvestidores" TEXT;
ALTER TABLE "installment_requests" ADD COLUMN "publicadoTransparencia" BOOLEAN NOT NULL DEFAULT 0;
