/**
 * baseline-prod-db.ts — One-shot para sincronizar `_prisma_migrations`
 * em uma prod DB criada via `prisma db push` (sem histórico de
 * migrations), antes de rodar `prisma migrate deploy` pela primeira vez.
 *
 * Contexto (S35):
 * - O deploy historicamente usava `prisma db push`, que sincroniza
 *   schema sem rastrear em `_prisma_migrations`.
 * - Prod DB hoje tem todas as tabelas materializadas, mas a tabela
 *   `_prisma_migrations` está vazia/inexistente (ou parcial).
 * - Trocar para `prisma migrate deploy` faz o Prisma tentar reaplicar
 *   TODAS as migrations → erro de "table already exists" (ex.:
 *   `startup_document_na`).
 * - Este script lê cada migration em `prisma/migrations-sqlite/`,
 *   checa via Prisma Client quais JÁ estão em `_prisma_migrations`,
 *   e insere as faltantes com o checksum correto (não roda o SQL).
 * - Após rodar, `prisma migrate deploy` é seguro: ele só aplica
 *   migrations realmente pendentes (caso você adicione uma nova).
 *
 * Uso (dentro do container `api` rodando na prod):
 *   docker compose -f docker-compose.prod.yml exec api \
 *     ts-node /app/scripts/baseline-prod-db.ts
 *
 * Após o baseline, rode o fluxo de update normalmente:
 *   ./scripts/deploy.sh update
 *
 * Idempotente: rodar 2x não causa erro — migrations já aplicadas são
 * puladas (verificação por `migration_name`).
 *
 * Seguro: só atua se a tabela `User` (sinal de DB materializada via
 * `db push`) existir e `_prisma_migrations` estiver vazia/ausente.
 * Caso contrário, sai sem fazer nada.
 */

// @ts-nocheck — script de migração one-shot, evita acoplamento com
// tsconfig do projeto (paths/@prisma/client custom output).
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const APP_DIR = resolve(__dirname, "..");
const MIGRATIONS_DIR = join(APP_DIR, "prisma", "migrations-sqlite");
const SCHEMA_FILE = join(APP_DIR, "prisma", "schema.sqlite.prisma");

const CYAN = "\x1b[0;36m";
const YELLOW = "\x1b[1;33m";
const GREEN = "\x1b[0;32m";
const RED = "\x1b[0;31m";
const BOLD = "\x1b[1m";
const NC = "\x1b[0m";

const log = (color: string, prefix: string, msg: string) =>
  console.log(`${color}${prefix}${NC} ${msg}`);

async function main() {
  console.log(
    `\n${YELLOW}${BOLD}=== baseline-prod-db ===${NC} (S35)\n`,
  );

  // Prisma 7 + SQLite requer adapter Better-SQLite3 (mesmo padrão
  // usado em src/prisma/prisma.service.ts). Lê DATABASE_URL do env
  // (mesma do container em prod = file:/app/db/iselftoken.db).
  const databaseUrl =
    process.env.DATABASE_URL || "file:/app/db/iselftoken.db";
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // ----- 1. Detectar estado da DB -----
    log(CYAN, "[1/4]", "detectando estado da DB...");

    const userTableExists = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='User';
    `;
    const hasUserTable = Number(userTableExists[0]?.c ?? 0) > 0;

    let migrationRows: Array<{ migration_name: string }> = [];
    try {
      migrationRows = await prisma.$queryRaw<
        Array<{ migration_name: string }>
      >`SELECT migration_name FROM _prisma_migrations;`;
    } catch (err) {
      // _prisma_migrations não existe — cenário típico de DB legada
      // de `prisma db push`. Tratamos como 0 e criamos a tabela abaixo
      // antes de inserir. (P3005 no migrate deploy vem daqui.)
      migrationRows = [];
    }
    const alreadyApplied = new Set(migrationRows.map((r) => r.migration_name));

    if (!hasUserTable) {
      log(
        YELLOW,
        "⚠",
        "DB não tem a tabela `User` (fresh DB). Saindo sem alterar — rode `prisma migrate deploy` para criar tudo.",
      );
      return;
    }
    if (alreadyApplied.size > 0) {
      log(
        GREEN,
        "✓",
        `_prisma_migrations já tem ${alreadyApplied.size} entradas. Nada a fazer (DB já migrada).`,
      );
      return;
    }
    log(
      YELLOW,
      "⚠",
      `DB materializada (User existe) mas _prisma_migrations vazia → DB legada de \`db push\`. Baseline necessário.`,
    );

    // ----- 2. Listar migrations no diretório -----
    log(CYAN, "[2/4]", `lendo migrations em ${MIGRATIONS_DIR}...`);
    const dirs = readdirSync(MIGRATIONS_DIR)
      .filter((name) => /^[0-9]{14}(_[a-z0-9_]+)?$/.test(name))
      .sort();
    if (dirs.length === 0) {
      log(RED, "✗", "nenhuma migration encontrada");
      process.exit(1);
    }
    log(GREEN, "✓", `${dirs.length} migrations no diretório`);

    // ----- 3. Calcular checksums (igual ao Prisma) -----
    // O checksum é SHA-256 do migration_name + migration.sql. Match exato
    // com o que `prisma migrate resolve --applied <name>` insere, então
    // o resultado é equivalente a chamar o CLI 34 vezes — porém em UMA
    // conexão Prisma (centenas de vezes mais rápido).
    log(CYAN, "[3/4]", "calculando checksums...");
    const rows = dirs.map((dirName) => {
      const sqlPath = join(MIGRATIONS_DIR, dirName, "migration.sql");
      let sqlContent = "";
      try {
        sqlContent = readFileSync(sqlPath, "utf-8");
      } catch {
        // migração sem migration.sql? improvável, mas tolerar.
      }
      const checksum = createHash("sha256")
        .update(`${dirName}${sqlContent}`)
        .digest("hex");
      return {
        migration_name: dirName,
        checksum,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        applied_steps_count: 1,
        logs: "",
      };
    });
    const missing = rows.filter(
      (r) => !alreadyApplied.has(r.migration_name),
    );
    log(
      GREEN,
      "✓",
      `${rows.length - missing.length} já aplicadas, ${missing.length} a inserir`,
    );

    if (missing.length === 0) {
      log(GREEN, "✓", "nada a inserir");
      return;
    }

    // ----- 4. Inserir em _prisma_migrations -----
    // Se a tabela não existe (cenário típico de DB legada de db push),
    // criamos com o schema EXATO que o Prisma CLI usa internamente.
    // Mesma definição do engine do Prisma 7 (`schema-engine`). Se a
    // versão do Prisma mudar e a tabela ganhar novas colunas, basta
    // rodar `npx prisma migrate deploy` uma vez manualmente para
    // deixar a CLI recriar/corrigir — daí em diante o baseline insere
    // as pendentes sem conflito.
    log(CYAN, "[4/4]", `inserindo ${missing.length} rows em _prisma_migrations...`);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
          "checksum"              VARCHAR(64) NOT NULL,
          "finished_at"           DATETIME,
          "migration_name"        VARCHAR(255) NOT NULL,
          "logs"                  TEXT,
          "rolled_back_at"        DATETIME,
          "started_at"            DATETIME NOT NULL,
          "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
        );
      `;
      for (const row of missing) {
        await tx.$executeRaw`
          INSERT INTO "_prisma_migrations" (
            "id", "checksum", "migration_name", "started_at",
            "finished_at", "applied_steps_count", "logs"
          ) VALUES (
            ${row.migration_name}, ${row.checksum}, ${row.migration_name},
            ${row.started_at}, ${row.finished_at}, ${row.applied_steps_count}, ${row.logs}
          )
        `;
      }
    });

    log(GREEN, "✓", `${missing.length} migrations marcadas como aplicadas`);
    console.log(
      `\n${GREEN}${BOLD}Baseline concluído.${NC} Próximo passo: \`./scripts/deploy.sh update\` (ou \`prisma migrate deploy\`).`,
    );
  } catch (err) {
    log(RED, "✗", `falha: ${(err as Error).message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();