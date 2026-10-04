/**
 * bench-founder-dashboard.ts
 *
 * Baseline de performance do GET /startup (StartupQueryService.findAll),
 * que alimenta a página /founder/dashboard via SSR.
 *
 * Mede, para um founderId alvo:
 *  - nº total de queries SQL disparadas (via event 'query' do Prisma)
 *  - breakdown por tabela
 *  - tempo de parede (wall time) de N execuções
 *
 * NÃO altera dados. Read-only. Standalone (não sobe o AppModule inteiro
 * para evitar dependências de Redis/RabbitMQ).
 *
 * Uso:
 *   pnpm exec ts-node scripts/bench-founder-dashboard.ts [founderId] [runs]
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { DashboardSummaryService } from '../src/api/startup/service/dashboard-summary.service';
import { EnrichmentService } from '../src/api/startup/service/enrichment.service';
import { NextActionService } from '../src/api/startup/service/next-action.service';
import { StartupQueryService } from '../src/api/startup/service/startup-query.service';

const FOUNDER_ID = Number(process.argv[2] ?? 2);
const RUNS = Number(process.argv[3] ?? 5);

async function main() {
  const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({
    adapter,
    log: [{ emit: 'event', level: 'query' }],
  });

  // Contadores de query
  let queryCount = 0;
  const perTable: Record<string, number> = {};
  (prisma as any).$on('query', (e: { query: string }) => {
    queryCount++;
    // Classifica por operação SQL + heurística de tabela (SQLite params usam ?)
    const q = e.query.replace(/\s+/g, ' ').trim();
    const verb = q.split(' ')[0].toUpperCase();
    const m = q.match(/(?:FROM|INTO|UPDATE|JOIN)\s+[`"]?(\w+)[`"]?/i);
    const table = m ? m[1] : verb;
    const key = `${verb} ${table}`;
    perTable[key] = (perTable[key] ?? 0) + 1;
  });

  // Monta os services manualmente (mesma composição do módulo NestJS)
  const enrichment = new EnrichmentService(prisma as any);
  const nextAction = new NextActionService(prisma as any);
  const summary = new DashboardSummaryService(prisma as any);
  const queryService = new StartupQueryService(
    prisma as any,
    summary,
    enrichment,
    nextAction,
  );

  const user = { id: FOUNDER_ID } as any;

  // Warm-up (1 run, não contabilizado nos tempos)
  await queryService.findAll(user);

  // Reset contadores após warm-up
  queryCount = 0;
  for (const k of Object.keys(perTable)) delete perTable[k];

  const times: number[] = [];
  let lastResult: any;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    lastResult = await queryService.findAll(user);
    times.push(performance.now() - t0);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const queriesPerRun = queryCount / RUNS;
  const payloadBytes = Buffer.byteLength(JSON.stringify(lastResult), 'utf8');
  const nStartups = Array.isArray(lastResult?.data)
    ? lastResult.data.length
    : 0;

  console.log('\n════════════════════════════════════════════');
  console.log('  BASELINE — StartupQueryService.findAll');
  console.log('════════════════════════════════════════════');
  console.log(`founderId............: ${FOUNDER_ID}`);
  console.log(`runs.................: ${RUNS}`);
  console.log(`startups retornadas..: ${nStartups}`);
  console.log(`payload size.........: ${(payloadBytes / 1024).toFixed(1)} KB`);
  console.log(
    `tempo (avg)..........: ${avgTime.toFixed(2)} ms  [min ${Math.min(...times).toFixed(2)} / max ${Math.max(...times).toFixed(2)}]`,
  );
  console.log(`queries TOTAL (${RUNS} runs): ${queryCount}`);
  console.log(`queries por run......: ${queriesPerRun.toFixed(1)}`);
  console.log('breakdown por tabela (total):');
  Object.entries(perTable)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => {
      console.log(`  ${t.padEnd(22)} ${c}  (${(c / RUNS).toFixed(1)}/run)`);
    });
  console.log('════════════════════════════════════════════\n');

  // Diagnóstico: tamanho por campo de TODAS as startups (achar payload gigante)
  if (nStartups > 0) {
    lastResult.data.forEach((s0: any, idx: number) => {
      const total = Buffer.byteLength(JSON.stringify(s0), 'utf8');
      console.log(
        `  startup[${idx}] "${s0.nome}" total=${(total / 1024).toFixed(1)} KB`,
      );
      for (const [k, v] of Object.entries(s0)) {
        const bytes = Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8');
        if (bytes > 500) {
          console.log(`      ${k.padEnd(18)} ${(bytes / 1024).toFixed(1)} KB`);
        }
      }
    });
    console.log(
      `  summary size........: ${(Buffer.byteLength(JSON.stringify(lastResult.summary), 'utf8') / 1024).toFixed(1)} KB`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
