import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const STARTUP_ID = Number(process.argv[2] ?? 0);
const DRY_RUN = process.argv.includes('--dry-run');

if (!STARTUP_ID) {
  console.error('Uso: npx tsx scripts/fix-reapprove-startup.ts <startupId> [--dry-run]');
  process.exit(1);
}

async function main() {
  const before = await prisma.startup.findUnique({
    where: { id: STARTUP_ID },
    select: { id: true, nome: true, status: true },
  });
  if (!before) {
    console.error(`Startup ${STARTUP_ID} não encontrada.`);
    process.exit(1);
  }
  console.log(`\n=== ANTES ===`);
  console.log(`ID:     ${before.id}`);
  console.log(`Nome:   ${before.nome}`);
  console.log(`Status: ${before.status}`);

  if (before.status === 'APPROVED') {
    console.log('\n✓ Já está APPROVED. Nada a fazer.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n(dry-run — sem alterar)');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.startup.update({
      where: { id: STARTUP_ID },
      data: { status: 'APPROVED' },
    });
    await tx.auditLog.create({
      data: {
        userId: null,
        action: 'STARTUP_STATUS_FIXED_FROM_AWAITING_COMPLIANCE_FEE',
        entity: 'Startup',
        entityId: String(STARTUP_ID),
        oldValue: { status: before.status },
        newValue: { status: 'APPROVED' },
      },
    });
  });

  const after = await prisma.startup.findUnique({
    where: { id: STARTUP_ID },
    select: { status: true },
  });
  console.log(`\n=== DEPOIS ===`);
  console.log(`Status: ${after?.status}`);
  console.log(
    '\n→ Refresh /founder/dashboard — a logo da startup deve voltar a ter borda magenta e o pill "APROVADA".',
  );
}

main()
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
