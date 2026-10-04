/**
 * Backfill heuristico: startups.uso_recursos (JSON legado) ->
 * CampaignResourceAllocation (relacional, M7-S21).
 *
 * Uso:
 *   npx tsx backendnode/scripts/backfill-uso-recursos.ts [--dry-run]
 *
 * Variaveis de ambiente:
 *   DATABASE_URL - URL do banco MySQL (default: mysql://dev:changeme@localhost:3307/fintech_db)
 *
 * O script:
 * 1. Inventaria startups com uso_recursos nao vazio
 * 2. Para cada startup, lista suas campaigns
 * 3. Normaliza uso_recursos para [{ descricao, percentual }]
 * 4. Para cada item, tenta casar com heuristica de palavras-chave
 * 5. Cria/atualiza CampaignResourceAllocation (upsert, UNIQUE = idempotente)
 * 6. Itens sem match viram CUSTOMIZADO + descricaoCustomizada
 *
 * Heuristica (case-insensitive, includes):
 *   fundador/time/equipe/socio      -> FUNDADOR
 *   desenvolvimento/engenharia/dev  -> DESENVOLVIMENTO
 *   comercial/vendas/bdr            -> COMERCIAL
 *   marketing/midia/branding         -> MARKETING
 *   nuvem/cloud/infra/hosting       -> NUVEM
 *   juridico/advocacia/contabil     -> JURIDICO
 *   reserva/caixa/runway            -> RESERVA_CAIXA
 *   (sem match)                    -> CUSTOMIZADO
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

// ==========================================
// Configuracao
// ==========================================

const DRY_RUN = process.argv.includes('--dry-run');

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDatabaseUrl(url: string): DbConfig {
  const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) throw new Error(`DATABASE_URL invalida: ${url}`);
  const [, user, password, host, portRaw, database] = match;
  return { host, port: Number(portRaw), user, password, database };
}

const dbConfig: DbConfig = (() => {
  const url = process.env.DATABASE_URL ?? 'mysql://dev:changeme@localhost:3307/fintech_db';
  return parseDatabaseUrl(url);
})();

// ==========================================
// Heuristica: descricao -> ResourceCategory
// ==========================================

type Categoria = 'FUNDADOR' | 'DESENVOLVIMENTO' | 'COMERCIAL' | 'MARKETING' | 'NUVEM' | 'JURIDICO' | 'RESERVA_CAIXA';

const HEURISTIC_MAP: Array<{ keywords: string[]; categoria: Categoria }> = [
  { keywords: ['fundador', 'time', 'equipe', 's\u00f3cio', 'socio', 'ceo', 'coo', 'cfo', 'cto', 'founder', 'partner'], categoria: 'FUNDADOR' },
  { keywords: ['desenvolvimento', 'engenharia', 'produto', 'tecnologia', 'dev', 'r&d', 'pesquisa', 'tech', 'software', 'sistema'], categoria: 'DESENVOLVIMENTO' },
  { keywords: ['comercial', 'vendas', 'bdr', 'p\u00f3s-venda', 'pos-venda', 'pos venda', 'venda', 'business', 'account', 'cliente'], categoria: 'COMERCIAL' },
  { keywords: ['marketing', 'm\u00eddia', 'midia', 'comunica\u00e7\u00e3o', 'comunicacao', 'branding', 'publicidade', 'propaganda', 'digital'], categoria: 'MARKETING' },
  { keywords: ['nuvem', 'cloud', 'infra', 'infraestrutura', 'hosting', 'servidor', 'aws', 'gcp', 'azure', 'servidor', 'server'], categoria: 'NUVEM' },
  { keywords: ['jur\u00eddico', 'juridico', 'advocacia', 'contabil', 'cont\u00e1bil', 'legal', 'due diligence', 'advogado', 'compliance', 'regulatorio'], categoria: 'JURIDICO' },
  { keywords: ['reserva', 'caixa', 'runway', 'caixa geral', 'reserva financeira', 'reserva de caixa'], categoria: 'RESERVA_CAIXA' },
];

/**
 * Casa uma descricao legada com a heuristica.
 * Retorna a categoria casada ou 'CUSTOMIZADO' se nenhum match.
 */
function matchCategoria(descricao: string): { categoria: string; descricaoCustomizada: string | null } {
  const lower = descricao.toLowerCase().trim();
  for (const entry of HEURISTIC_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { categoria: entry.categoria, descricaoCustomizada: null };
      }
    }
  }
  return { categoria: 'CUSTOMIZADO', descricaoCustomizada: descricao };
}

// ==========================================
// Normalizacao de uso_recursos
// ==========================================

interface NormalizedItem {
  descricao: string;
  percentual: number;
}

/**
 * Normaliza o campo uso_recursos (variant: array, object, string, null).
 * Retorna array de itens validos ou array vazio em caso de erro.
 */
function normalizeUsoRecursos(raw: unknown): NormalizedItem[] {
  if (!raw) return [];

  // String JSON
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // Objeto unico (nao array) - tenta extrair
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ('descricao' in obj || 'percentual' in obj) {
      const descricao = String(obj.descricao ?? '');
      const percentual = Number(obj.percentual);
      if (descricao && !isNaN(percentual)) {
        return [{ descricao, percentual }];
      }
    }
    return [];
  }

  // Array
  if (!Array.isArray(raw)) return [];

  const items: NormalizedItem[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const descricao = String(obj.descricao ?? '').trim();
    const percentual = Number(obj.percentual);
    if (descricao && !isNaN(percentual) && percentual > 0 && percentual <= 100) {
      items.push({ descricao, percentual });
    }
  }
  return items;
}

// ==========================================
// Main
// ==========================================

async function main(): Promise<void> {
  console.log('[backfill-uso-recursos] ==========================================');
  console.log(`[backfill-uso-recursos] Modo: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`[backfill-uso-recursos] DATABASE: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // PASSO 1: Inventariar startups com uso_recursos nao vazio
    const [startupRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, nome, uso_recursos FROM startups WHERE uso_recursos IS NOT NULL`,
    );

    // Filtra apenas as que tem uso_recursos realmente populado
    const startupsWithData = startupRows.filter((row) => {
      const raw = row.uso_recursos;
      const normalized = normalizeUsoRecursos(raw);
      return normalized.length > 0;
    });

    console.log(`[backfill-uso-recursos] Startups com uso_recursos valido: ${startupsWithData.length} / ${startupRows.length}`);

    let totalProcessed = 0;
    let totalAllocationsCreated = 0;
    let totalCustomizado = 0;
    const needsManualReview: string[] = [];

    for (const row of startupsWithData) {
      const id = row.id as number;
      const nome = row.nome as string;
      const rawUsoRecursos = row.uso_recursos;
      const allocations = normalizeUsoRecursos(rawUsoRecursos);

      if (allocations.length === 0) continue;

      // PASSO 2: buscar campaigns da startup
      const [campaignRows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT id FROM campaigns WHERE startupId = ?`,
        [id],
      );

      if (campaignRows.length === 0) {
        needsManualReview.push(`Startup ${id} (${nome}) sem campaign`);
        continue;
      }

      for (const campaignRow of campaignRows) {
        const campaignId = campaignRow.id as number;

        for (const item of allocations) {
          totalProcessed++;

          const { categoria, descricaoCustomizada } = matchCategoria(item.descricao);

          if (DRY_RUN) {
            console.log(`[DRY-RUN] upsert campaign=${campaignId} categoria=${categoria} percentual=${item.percentual} descricaoCustomizada=${descricaoCustomizada ?? 'null'}`);
          } else {
            // upsert: INSERT ... ON DUPLICATE KEY UPDATE
            // UNIQUE(campaignId, categoria) garante idempotencia
            await connection.query(
              `INSERT INTO campaign_resource_allocations (campaignId, categoria, percentual, descricaoCustomizada, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE percentual = VALUES(percentual), descricaoCustomizada = VALUES(descricaoCustomizada), updatedAt = NOW()`,
              [campaignId, categoria, item.percentual, descricaoCustomizada],
            );
          }

          if (categoria === 'CUSTOMIZADO') {
            totalCustomizado++;
          } else {
            totalAllocationsCreated++;
          }
        }
      }
    }

    // PASSO 3: Log final
    const result = {
      totalStartupsProcessed: startupsWithData.length,
      totalAllocationsProcessed: totalProcessed,
      totalAllocationsCreated,
      totalCustomizado,
      needsManualReview,
      dryRun: DRY_RUN,
    };

    console.log('[backfill-uso-recursos] RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));

  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('[backfill-uso-recursos] ERRO:', err);
  process.exit(1);
});
