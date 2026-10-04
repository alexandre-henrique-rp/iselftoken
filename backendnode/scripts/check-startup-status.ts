import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.startup.findUnique({
    where: { id: 24 },
    select: { id: true, nome: true, status: true },
  });
  console.log(JSON.stringify(s, null, 2));

  // AuditLog timeline
  const audits = await prisma.auditLog.findMany({
    where: { entity: 'Startup', entityId: '24' },
    orderBy: { createdAt: 'asc' },
  });
  console.log('\n=== AUDIT LOG ===');
  for (const a of audits) {
    console.log(`${a.createdAt.toISOString()} [${a.action}] ${JSON.stringify(a.newValue)}`);
  }
}

main().finally(() => prisma.$disconnect());
