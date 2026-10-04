import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import type { SealCategory } from '@prisma/client';
import { getSeedPrismaClient } from './seeds/seed-client-helper';

/**
 * Seed dos 4 selos curatoriais (ação "Coroar" /admin/startups).
 *
 * Lista canônica (sincronizada com `prisma/seed.ts` e o frontend
 * `frontend/app/lib/premium-seal-catalog.ts`):
 *   1. alta_performance  (Alta Performance)  — ACHIEVEMENT
 *   2. aws               (AWS Partner)        — PARTNERSHIP
 *   3. founders_hunter   (Founders Hunter)    — PARTNERSHIP
 *   4. potencial_unicornio (Potencial Unicórnio) — ACHIEVEMENT
 *
 * Comportamento:
 *   - Idempotente: usa `prisma.seal.upsert` por slug (sem erro em re-run).
 *   - Tolerante a PNG ausente: se `backendnode/icons/<slug>.png` não existir
 *     no disco, pula o upsert e loga um WARN. O admin pode dropar o PNG e
 *     re-rodar `npm run seed:premium` para popular o selo faltante.
 *   - Standalone: não toca em outras tabelas (usuários, planos, startups).
 *     Útil para deploy incremental sem rodar o `seed.ts` completo.
 *
 * Uso:
 *   pnpm run seed:premium
 *
 * @see CASE.md §Curadoria Premium
 * @see backendnode/src/api/admin/admin.service.ts (incrementStartupScore)
 */
const ICONS_DIR = path.resolve(process.cwd(), 'icons');

const PREMIUM_SEALS: Array<{
  slug: string;
  name: string;
  description: string;
  category: SealCategory;
}> = [
  {
    slug: 'alta_performance',
    name: 'Alta Performance',
    description:
      'Startup com KPIs operacionais e financeiros acima da média do segmento, validado pela curadoria iSelfToken.',
    category: 'ACHIEVEMENT',
  },
  {
    slug: 'aws',
    name: 'AWS Partner',
    description:
      'Startup parceira do programa AWS for Startups, com créditos e suporte técnico ativo da Amazon Web Services.',
    category: 'PARTNERSHIP',
  },
  {
    slug: 'founders_hunter',
    name: 'Founders Hunter',
    description:
      'Destaque editorial na comunidade Founders Hunter — validação por founders referência do ecossistema.',
    category: 'PARTNERSHIP',
  },
  {
    slug: 'potencial_unicornio',
    name: 'Potencial Unicórnio',
    description:
      'Valuation ≥ US$ 1B validado pela curadoria iSelfToken, com rodada aberta para novos investidores.',
    category: 'ACHIEVEMENT',
  },
];

async function main() {
  const prisma: PrismaClient = getSeedPrismaClient();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const skippedSlugs: string[] = [];

  console.log('🌟 Seed dos 4 selos curatoriais (ação "Coroar")…');
  console.log(`📁 Ícones esperados em: ${ICONS_DIR}\n`);

  for (const seal of PREMIUM_SEALS) {
    const iconPath = path.join(ICONS_DIR, `${seal.slug}.png`);
    const iconExists = fs.existsSync(iconPath);

    if (!iconExists) {
      console.warn(
        `  ⚠️  [SKIP] ${seal.slug}: PNG ausente (${iconPath}). ` +
          'Drope o arquivo e re-rode o seed para popular este selo.',
      );
      skipped += 1;
      skippedSlugs.push(seal.slug);
      continue;
    }

    const before = await prisma.seal.findUnique({ where: { slug: seal.slug } });
    await prisma.seal.upsert({
      where: { slug: seal.slug },
      update: {
        name: seal.name,
        description: seal.description,
        imagePath: `/icons/${seal.slug}.png`,
        category: seal.category,
      },
      create: {
        slug: seal.slug,
        name: seal.name,
        description: seal.description,
        imagePath: `/icons/${seal.slug}.png`,
        category: seal.category,
      },
    });
    if (before) {
      console.log(`  ♻️  [UPDATE] ${seal.slug} — ${seal.name}`);
      updated += 1;
    } else {
      console.log(`  ✅ [CREATE] ${seal.slug} — ${seal.name}`);
      created += 1;
    }
  }

  console.log(
    `\n✨ Concluído: ${created} criado(s), ${updated} atualizado(s), ${skipped} pulado(s).`,
  );
  if (skippedSlugs.length > 0) {
    console.log(
      `\n⚠️  Selos sem PNG (${skippedSlugs.length}): ${skippedSlugs.join(', ')}`,
    );
    process.exitCode = 0; // não falha — o admin pode popular depois
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro no seed premium:', error);
    process.exit(1);
  });
}

export { main as seedPremiumSeals, PREMIUM_SEALS };
