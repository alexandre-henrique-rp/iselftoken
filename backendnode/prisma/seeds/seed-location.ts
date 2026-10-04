import 'dotenv/config';
import { constants as fsConstants } from 'fs';
import * as fs from 'fs/promises';
import { getSeedPrismaClient } from './seed-client-helper';

const prisma = getSeedPrismaClient();

const COUNTRIES_CSV_URL =
  'https://raw.githubusercontent.com/alexandre-henrique-rp/countries-states-cities-database/master/csv/countries.csv';
const COUNTRIES_CSV_PATH = './data/countries.csv';
const STATES_CSV_URL =
  'https://raw.githubusercontent.com/alexandre-henrique-rp/countries-states-cities-database/master/csv/states.csv';
const STATES_CSV_PATH = './data/states.csv';
const CITIES_CSV_URL =
  'https://raw.githubusercontent.com/alexandre-henrique-rp/countries-states-cities-database/master/csv/cities.csv';
const CITIES_CSV_PATH = './data/cities.csv';

/**
 * @name ensureCsvFile
 * @description Garante que um arquivo CSV exista localmente; se não existir, faz o download.
 *
 * @param csvUrl - URL do arquivo CSV
 * @param csvPath - Caminho local onde o arquivo deve ficar salvo
 *
 * @returns Void
 *
 * @throws {Error} Quando falhar o download do arquivo
 *
 * @example
 * // Exemplo de uso
 * await ensureCsvFile(url, './prisma/cities.csv');
 *
 * Fluxo de execução:
 * 1. Verifica se o arquivo existe localmente
 * 2. Se não existir, baixa da URL informada
 * 3. Salva o arquivo no caminho especificado
 */
async function ensureCsvFile(csvUrl: string, csvPath: string): Promise<void> {
  try {
    await fs.access(csvPath, fsConstants.F_OK);
    console.log(`📦 ${csvPath} já existe, pulando download`);
    return;
  } catch {
    console.log(`📥 Baixando ${csvPath}...`);
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(csvPath, Buffer.from(buffer));
  console.log('✅ Download concluído');
}

/**
 * @name parseCsvLine
 * @description Faz o parse de uma linha CSV respeitando campos com aspas.
 *
 * @param line - Linha completa do CSV
 * @returns Lista de colunas
 */
function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

/**
 * @name parseCsvToJson
 * @description Converte o conteúdo de um CSV em uma lista de objetos JSON.
 *
 * @param csvContent - Conteúdo completo do CSV
 * @returns Lista de registros com base no header do CSV
 */
function parseCsvToJson(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter(Boolean);

  if (lines.length <= 1) {
    throw new Error('Arquivo CSV vazio ou sem dados.');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = columns[index] ?? '';
      return acc;
    }, {});
  });
}

/**
 * @name parseJsonField
 * @description Faz parse seguro de campos JSON vindos do CSV.
 *
 * @param raw - Valor cru do CSV
 * @returns Objeto/array parseado ou null quando inválido
 */
function parseJsonField(raw: string): any | null {
  if (!raw || raw.trim().length === 0) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * @name buildCountryPayload
 * @description Normaliza o payload do país para create/update.
 *
 * @param row - Registro do CSV de países
 * @returns Payload normalizado
 */
function buildCountryPayload(row: Record<string, string>) {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  const phoneCode = Number(row.phonecode);

  return {
    name: row.name?.trim(),
    iso3: row.iso3?.trim(),
    iso2: row.iso2?.trim(),
    numeric_code: row.numeric_code?.trim() || null,
    phonecode: Number.isFinite(phoneCode) ? phoneCode : null,
    capital: row.capital?.trim() || null,
    currency: row.currency?.trim() || null,
    currency_name: row.currency_name?.trim() || null,
    currency_symbol: row.currency_symbol?.trim() || null,
    tld: row.tld?.trim() || null,
    native: row.native?.trim() || null,
    region: row.region?.trim() || null,
    region_id: row.region_id ? Number(row.region_id) : null,
    subregion: row.subregion?.trim() || null,
    subregion_id: row.subregion_id ? Number(row.subregion_id) : null,
    nationality: row.nationality?.trim() || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    emoji: row.emoji?.trim() || null,
    emojiU: row.emojiU?.trim() || null,
    timezones: parseJsonField(row.timezones),
  };
}

/**
 * @name buildStatePayload
 * @description Normaliza o payload do estado para create/update.
 *
 * @param row - Registro do CSV de estados
 * @param countryId - ID do país relacionado
 * @returns Payload normalizado
 */
function buildStatePayload(row: Record<string, string>, countryId: number) {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  const fipsCode = Number(row.fips_code);
  const level = Number(row.level);
  const parentId = Number(row.parent_id);

  return {
    name: row.name?.trim(),
    country_id: countryId,
    country_code: row.country_code?.trim(),
    country_name: row.country_name?.trim() || '',
    iso2: (row.iso2?.trim() || '').slice(0, 2),
    iso3166_2: row.iso3166_2?.trim() || '',
    fips_code: Number.isFinite(fipsCode) ? fipsCode : null,
    type: row.type?.trim() || null,
    level: Number.isFinite(level) ? level : null,
    parent_id: Number.isFinite(parentId) ? parentId : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    timezone: row.timezone?.trim() || null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdateMode = args.includes('--update') || args.includes('-u');

  console.log(
    isUpdateMode
      ? '🔄 Modo ATUALIZAÇÃO - Atualizando registros existentes...'
      : '🌍 Iniciando seed de localização...',
  );

  // O seed de localização é estritamente não destrutivo: duplicados existentes
  // são preservados e não há DELETE/UPDATE de registros fora do fluxo de seed.
  console.log(
    '⏭️  Preservando registros existentes; nenhuma limpeza destrutiva será executada.',
  );

  // ==========================================
  // 1. SEED/UPDATE COUNTRIES (CSV)
  // ==========================================
  console.log(
    isUpdateMode ? '🏳️ Atualizando países...' : '🏳️ Baixando CSV de países...',
  );
  await ensureCsvFile(COUNTRIES_CSV_URL, COUNTRIES_CSV_PATH);

  console.log('📊 Convertendo CSV de países para JSON...');
  const countriesCsvContent = await fs.readFile(COUNTRIES_CSV_PATH, 'utf-8');
  const countryRows = parseCsvToJson(countriesCsvContent);

  console.log(`📝 Processando ${countryRows.length} países...`);
  const countryCount = await prisma.country.count();

  if (countryCount === 0 && !isUpdateMode) {
    const countryData = countryRows
      .map((row) => {
        const iso3 = row.iso3?.trim();
        if (!iso3) {
          return null;
        }

        return buildCountryPayload({ ...row, iso3 });
      })
      .filter(Boolean);

    await prisma.country.createMany({
      data: countryData as any[],
    });
  } else {
    for (const row of countryRows) {
      const iso3 = row.iso3?.trim();
      if (!iso3) {
        continue;
      }

      const countryPayload = buildCountryPayload({ ...row, iso3 });
      const existingCountry = await prisma.country.findUnique({
        where: { iso3 },
        select: { id: true },
      });

      if (!existingCountry) {
        await prisma.country.create({ data: countryPayload });
        continue;
      }

      await prisma.country.update({
        where: { iso3 },
        data: countryPayload,
      });
    }
  }

  // Map de países (ISO2) para lookup
  const countryMap = new Map(
    (await prisma.country.findMany()).map((c) => [c.iso2, c.id]),
  );
  console.log(`✅ ${countryMap.size} países processados`);

  // ==========================================
  // 2. SEED/UPDATE STATES (CSV)
  // ==========================================
  console.log(
    isUpdateMode
      ? '🏛️ Atualizando estados...'
      : '🏛️ Baixando CSV de estados...',
  );
  await ensureCsvFile(STATES_CSV_URL, STATES_CSV_PATH);

  console.log('📊 Convertendo CSV de estados para JSON...');
  const statesCsvContent = await fs.readFile(STATES_CSV_PATH, 'utf-8');
  const stateRows = parseCsvToJson(statesCsvContent);

  const stateCount = await prisma.state.count();

  if (stateCount === 0 && !isUpdateMode) {
    const stateData = stateRows
      .map((row) => {
        const countryId = countryMap.get(row.country_code?.trim() || '');
        if (!countryId) {
          return null;
        }

        return buildStatePayload(row, countryId);
      })
      .filter(Boolean);

    const batchSize = 1000;
    for (let i = 0; i < stateData.length; i += batchSize) {
      const batch = stateData.slice(i, i + batchSize);
      await prisma.state.createMany({
        data: batch as any[],
      });
    }
  } else {
    for (const row of stateRows) {
      const countryId = countryMap.get(row.country_code?.trim() || '');
      if (!countryId) {
        continue;
      }

      const statePayload = buildStatePayload(row, countryId);

      const existingState = await prisma.state.findFirst({
        where: {
          name: statePayload.name || undefined,
          country_id: countryId,
        } as any,
        select: { id: true },
      });

      if (existingState) {
        await prisma.state.update({
          where: { id: existingState.id },
          data: statePayload as any,
        });
        continue;
      }

      await prisma.state.create({
        data: statePayload as any,
      });
    }
  }

  const stateMap = new Map<string, number>();
  const stateNameMap = new Map<string, number>();
  (await prisma.state.findMany()).forEach((state) => {
    const stateCountryId = (state as any).country_id as number | undefined;
    if (state.iso2 && stateCountryId) {
      stateMap.set(`${state.iso2}-${stateCountryId}`, state.id);
    }
    if (stateCountryId) {
      stateNameMap.set(`${state.name}-${stateCountryId}`, state.id);
    }
  });
  console.log(`✅ ${stateMap.size} estados processados`);

  // ==========================================
  // 3. SEED/UPDATE CITIES (CSV)
  // ==========================================
  console.log(
    isUpdateMode
      ? '🏙️ Atualizando cidades...'
      : '🏙️ Baixando CSV de cidades...',
  );
  await ensureCsvFile(CITIES_CSV_URL, CITIES_CSV_PATH);

  console.log('📊 Convertendo CSV de cidades para JSON...');
  const citiesCsvContent = await fs.readFile(CITIES_CSV_PATH, 'utf-8');
  const cityRows = parseCsvToJson(citiesCsvContent);

  const cityCount = await prisma.city.count();

  if (cityCount === 0 && !isUpdateMode) {
    const batchSize = 1000;
    for (let i = 0; i < cityRows.length; i += batchSize) {
      const batch = cityRows.slice(i, i + batchSize);
      const data = batch
        .map((row) => {
          const countryId = countryMap.get(row.country_code?.trim() || '');
          if (!countryId) {
            return null;
          }

          const stateKey = `${row.state_code?.trim() || ''}-${countryId}`;
          const stateNameKey = `${row.state_name?.trim() || ''}-${countryId}`;
          const stateId =
            stateMap.get(stateKey) || stateNameMap.get(stateNameKey) || null;

          if (!stateId) {
            return null;
          }

          const latitude = Number(row.latitude);
          const longitude = Number(row.longitude);
          const countryCode = Number(row.country_code);

          return {
            name: row.name?.trim(),
            state_id: stateId,
            state_code: row.state_code?.trim() || '',
            state_name: row.state_name?.trim() || '',
            country_id: countryId,
            country_code: Number.isFinite(countryCode)
              ? countryCode
              : countryId,
            country_name: row.country_name?.trim() || '',
            latitude: Number.isFinite(latitude) ? latitude : null,
            longitude: Number.isFinite(longitude) ? longitude : null,
            timezone: row.timezone?.trim() || null,
            wikiDataId: row.wikiDataId?.trim() || null,
          };
        })
        .filter(Boolean);

      if (data.length === 0) {
        continue;
      }

      await prisma.city.createMany({
        data: data as any[],
      });
      console.log(
        `  📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cityRows.length / batchSize)} inserido (${data.length} registros)`,
      );
    }
  } else {
    for (const row of cityRows) {
      const countryId = countryMap.get(row.country_code?.trim() || '');
      if (!countryId) {
        continue;
      }

      const stateKey = `${row.state_code?.trim() || ''}-${countryId}`;
      const stateNameKey = `${row.state_name?.trim() || ''}-${countryId}`;
      const stateId =
        stateMap.get(stateKey) || stateNameMap.get(stateNameKey) || null;

      if (!stateId) {
        continue;
      }

      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      const countryCode = Number(row.country_code);
      const cityPayload = {
        name: row.name?.trim(),
        state_id: stateId,
        state_code: row.state_code?.trim() || '',
        state_name: row.state_name?.trim() || '',
        country_id: countryId,
        country_code: Number.isFinite(countryCode) ? countryCode : countryId,
        country_name: row.country_name?.trim() || '',
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        timezone: row.timezone?.trim() || null,
        wikiDataId: row.wikiDataId?.trim() || null,
      };

      const existingCity = await prisma.city.findFirst({
        where: {
          name: cityPayload.name,
          state_id: cityPayload.state_id,
        } as any,
        select: { id: true },
      });

      if (existingCity) {
        await prisma.city.update({
          where: { id: existingCity.id },
          data: cityPayload as any,
        });
        continue;
      }

      await prisma.city.create({
        data: cityPayload as any,
      });
    }
  }

  // ==========================================
  // 6. RESUMO FINAL
  // ==========================================
  console.log('\n🎉 Seed de localização concluído com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO:');
  console.log(`   - ${await prisma.country.count()} países`);
  console.log(`   - ${await prisma.state.count()} estados`);
  console.log(`   - ${await prisma.city.count()} cidades`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('\n🎉 Seed de localização concluído com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO:');
  console.log(`   - ${await prisma.country.count()} países`);
  console.log(`   - ${await prisma.state.count()} estados`);
  console.log(`   - ${await prisma.city.count()} cidades`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

export async function seedLocation() {
  await main();
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed de localização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
