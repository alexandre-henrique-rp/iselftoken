/**
 * Fix de emergência: recria a tabela Payment que foi dropada
 * acidentalmente em prod pela migration 20261010000000_drop_payment_legacy_table.
 *
 * Uso:
 *   npx tsx scripts/fix-recreate-payment-table.ts
 *
 * Idempotente — pode ser rodado múltiplas vezes.
 *
 * Faz 2 coisas:
 *   1. Recria a tabela Payment + índices (IF NOT EXISTS)
 *   2. Marca a migration como 'applied' no _prisma_migrations para que
 *      o Prisma não tente re-aplicar o DROP
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolve o path do arquivo SQLite do .env (DATABASE_URL=file:...).
 * Suporta SQLite local (./prisma/dev.db) e produção (/app/data/dev.db).
 */
function resolveSqlitePath(): string {
  const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const match = url.match(/^file:(.+)$/);
  if (!match) {
    throw new Error(
      `DATABASE_URL não é SQLite (esperado file:..., recebido: ${url})`,
    );
  }
  return resolve(process.cwd(), match[1]);
}

/**
 * Executa SQL via sqlite3 CLI (mais robusto que Prisma adapter).
 */
function sqliteExec(dbPath: string, sql: string): void {
  try {
    execSync(`sqlite3 "${dbPath}" <<'EOF'\n${sql}\nEOF`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (err: any) {
    throw new Error(
      `Falha ao executar SQL via sqlite3: ${err.message}\n` +
        `Dica: verifique se o binário 'sqlite3' está instalado no PATH`,
    );
  }
}

function tableExists(dbPath: string, tableName: string): boolean {
  try {
    const result = execSync(
      `sqlite3 "${dbPath}" "SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';"`,
      { encoding: 'utf-8' },
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const dbPath = resolveSqlitePath();
  console.log(`\n=== Fix: recriar tabela Payment ===`);
  console.log(`Database: ${dbPath}\n`);

  if (tableExists(dbPath, 'Payment')) {
    console.log('✓ Tabela Payment já existe — pulando CREATE TABLE');
  } else {
    console.log('→ Criando tabela Payment...');
    // Cria a tabela e índices diretamente (sem ler o arquivo SQL que
    // tem comentários grudados — usamos o mesmo schema aqui)
    const createTable = `CREATE TABLE IF NOT EXISTS "Payment" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER NOT NULL,
      "subscriptionId" INTEGER,
      "investmentId" INTEGER,
      "purpose" TEXT NOT NULL,
      "amount" DECIMAL NOT NULL,
      "method" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "txid" TEXT,
      "endToEndId" TEXT,
      "efiChargeId" TEXT,
      "efiLocation" TEXT,
      "qrCodeBase64" TEXT,
      "copyPastePix" TEXT,
      "paidAt" DATETIME,
      "effectsAppliedAt" DATETIME,
      "expiresAt" DATETIME,
      "campaignId" INTEGER,
      "serviceDetails" JSONB,
      "manualApprovedById" INTEGER,
      "manualApprovedAt" DATETIME,
      "manualJustification" TEXT,
      "manualComprovanteKey" TEXT,
      "refundedAt" DATETIME,
      "refundedById" INTEGER,
      "refundReason" TEXT,
      "refundTxid" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "originalAmount" TEXT,
      "discountAmount" TEXT,
      "paidAmount" TEXT,
      "paymentGroupId" INTEGER
    )`;
    sqliteExec(dbPath, createTable);
    sqliteExec(
      dbPath,
      'CREATE INDEX IF NOT EXISTS "Payment_paymentGroupId_idx" ON "Payment"("paymentGroupId")',
    );
    sqliteExec(
      dbPath,
      'CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt")',
    );
    sqliteExec(
      dbPath,
      'CREATE INDEX IF NOT EXISTS "Payment_campaignId_status_idx" ON "Payment"("campaignId", "status")',
    );
    sqliteExec(
      dbPath,
      'CREATE UNIQUE INDEX IF NOT EXISTS "Payment_investmentId_key" ON "Payment"("investmentId")',
    );
    console.log('✓ Tabela Payment recriada');
  }

  // 2. Marca a migration como aplicada (evita que Prisma tente re-aplicar
  // o DROP novamente, que causaria o mesmo erro P3009)
  const migrationMarkedSql = `INSERT OR IGNORE INTO "_prisma_migrations"
    ("id", "checksum", "finished_at", "migration_name", "logs",
     "rolled_back_at", "started_at", "applied_steps_count")
    VALUES ('manual_fix_2026_10_03', 'manual_fix_2026_10_03',
            strftime('%s', 'now') * 1000,
            '20261010000000_drop_payment_legacy_table',
            'Manual fix: recriou tabela Payment após drop prematuro',
            NULL, strftime('%s', 'now') * 1000, 1);`;
  try {
    sqliteExec(dbPath, migrationMarkedSql);
    console.log('✓ Migration marcada como aplicada');
  } catch (err: any) {
    console.warn(
      `⚠ Não foi possível marcar a migration: ${err.message}\n` +
        `  (pode ser que já esteja marcada — verifique manualmente)`,
    );
  }

  // 3. Verificação final
  try {
    const count = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM Payment;"`, {
      encoding: 'utf-8',
    }).trim();
    console.log(`\n✓ Tabela Payment tem ${count} registros`);
  } catch {
    console.log('\n✓ Tabela Payment existe');
  }

  console.log('\nFix concluído. Agora você pode:');
  console.log('  1. Reiniciar o container (docker compose up -d)');
  console.log('  2. Rodar a seed (pnpm run db:seed)');
  console.log('  3. Verificar que o container não crasha mais\n');
}

main().catch((err: Error) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
