import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

export function resolveProvider(): 'sqlite' {
  return 'sqlite';
}

export function getSeedPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter, log: ['warn', 'error'] });
}
