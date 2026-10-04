-- BUG-FT-005: registra a última rejeição admin de KYC (REJECTED ou
-- NEEDS_RESUBMISSION) para o frontend /profile exibir "Faça upload novamente"
-- mesmo quando o KYCProfile já foi deletado pelo cleanup. Limpo quando o
-- user re-envia com sucesso (decisão APPROVED).
ALTER TABLE "User" ADD COLUMN "lastKycRejectionAt" TEXT;
ALTER TABLE "User" ADD COLUMN "lastKycRejectionReason" TEXT;
ALTER TABLE "User" ADD COLUMN "lastKycRejectionSlot" TEXT;