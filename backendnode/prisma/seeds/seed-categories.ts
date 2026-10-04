import { getSeedPrismaClient, resolveProvider } from './seed-client-helper';
import 'dotenv/config';

/**
 * Seed inicial de 12 categorias conforme ADR-007 §3.3.
 */
const CATEGORIES = [
  { slug: 'fintech',      nome: 'Fintech',               ordem: 1  },
  { slug: 'edtech',       nome: 'Edtech',                ordem: 2  },
  { slug: 'healthtech',   nome: 'Healthtech',            ordem: 3  },
  { slug: 'ai',           nome: 'Inteligência Artificial', ordem: 4 },
  { slug: 'saas',         nome: 'SaaS',                  ordem: 5  },
  { slug: 'biotech',      nome: 'Biotech',               ordem: 6  },
  { slug: 'agrotech',     nome: 'Agrotech',              ordem: 7  },
  { slug: 'proptech',     nome: 'Proptech',              ordem: 8  },
  { slug: 'logistics',    nome: 'Logtech',               ordem: 9  },
  { slug: 'cleantech',    nome: 'Cleantech',             ordem: 10 },
  { slug: 'retail_tech',  nome: 'Retail Tech',            ordem: 11 },
  { slug: 'other',        nome: 'Outra (fallback)',       ordem: 99 },
];

async function main() {
  const prisma = getSeedPrismaClient();
  const provider = resolveProvider();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let seeded = 0;
  let updated = 0;

  for (const cat of CATEGORIES) {
    if (provider === 'sqlite') {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { nome: cat.nome, ordem: cat.ordem },
        create: { slug: cat.slug, nome: cat.nome, ordem: cat.ordem },
      });
      seeded++;
    } else {
      const result = await prisma.$executeRaw`
        INSERT INTO categories (slug, nome, ordem, createdAt, updatedAt)
        VALUES (${cat.slug}, ${cat.nome}, ${cat.ordem}, ${now}, ${now})
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome),
          ordem = VALUES(ordem),
          updatedAt = VALUES(updatedAt)
      `;
      if (result === 1) seeded++;
      else if (result === 2) updated++;
    }
  }

  console.log(`✅ Categories seed: ${seeded} criado(s), ${updated} atualizado(s), ${CATEGORIES.length} total`);
  await prisma.$disconnect();
}

export async function seedCategories() {
  await main();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Erro ao executar seed-categories:', e);
    process.exit(1);
  });
}
