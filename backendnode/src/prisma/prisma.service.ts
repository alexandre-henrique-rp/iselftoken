import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

/** Cache singleton para o adapter SQLite. */
let adapterInstance: PrismaBetterSqlite3 | null = null;

function getSqliteAdapter(): PrismaBetterSqlite3 {
  if (adapterInstance) {
    return adapterInstance;
  }

  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  adapterInstance = new PrismaBetterSqlite3({ url: databaseUrl });
  return adapterInstance;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: getSqliteAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
