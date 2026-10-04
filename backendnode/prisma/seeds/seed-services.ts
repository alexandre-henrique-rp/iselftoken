import { getSeedPrismaClient } from './seed-client-helper';
import 'dotenv/config';

/**
 * Seed do catálogo de serviços (`services`) que o founder pode contratar.
 *
 * Idempotente: upsert por `slug`. O admin pode editar depois via
 * `/admin/services` (preço, disponibilidade, textos). Os valores aqui são
 * apenas os defaults de bootstrap.
 *
 * FAST_DEPLOY ("Publicação Rápida"): produto adicional oferecido no checkout
 * da Taxa de Compliance. Torna a publicação da startup imediata na aprovação
 * da Fase 3, em vez do delay padrão de 24h.
 */
interface ServiceSeed {
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  benefits: string[];
  category: string;
  paymentPurpose: string;
  price: number;
  highlight: boolean;
  available: boolean;
  order: number;
  endpoint?: string;
}

const SERVICE_DEFAULTS: ServiceSeed[] = [
  {
    slug: 'fast-deploy',
    name: 'Publicação Rápida',
    shortDesc: 'Publique sua startup imediatamente após a aprovação.',
    description:
      'Por padrão, após a aprovação do Compliance (Fase 3) o sistema leva até ' +
      '24h para publicar sua startup e liberar a página pública no marketplace. ' +
      'Com a Publicação Rápida, a publicação é imediata assim que o Compliance ' +
      'aprovar — sem espera.',
    benefits: [
      'Publicação imediata na aprovação (sem espera de 24h)',
      'Página pública liberada na hora',
      'Antecipe o início da captação',
    ],
    category: 'OTHER',
    paymentPurpose: 'FAST_DEPLOY',
    price: 1000,
    highlight: true,
    available: true,
    order: 10,
    endpoint: '/api/founder/compliance-fee',
  },
];

export async function seedServices() {
  const prisma = getSeedPrismaClient();

  try {
    let inserted = 0;
    let updated = 0;
    for (const item of SERVICE_DEFAULTS) {
      const data = {
        name: item.name,
        shortDesc: item.shortDesc,
        description: item.description,
        benefits: JSON.stringify(item.benefits),
        category: item.category,
        paymentPurpose: item.paymentPurpose,
        price: item.price,
        currency: 'BRL',
        highlight: item.highlight,
        available: item.available,
        order: item.order,
        endpoint: item.endpoint ?? null,
      };
      const existing = await prisma.service.findUnique({
        where: { slug: item.slug },
      });
      if (existing) {
        await prisma.service.update({ where: { slug: item.slug }, data });
        updated++;
      } else {
        await prisma.service.create({ data: { slug: item.slug, ...data } });
        inserted++;
      }
    }
    console.log(
      `✅ Services: ${inserted} inserido(s), ${updated} atualizado(s), ${SERVICE_DEFAULTS.length} total`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Permite executar diretamente: `ts-node prisma/seeds/seed-services.ts`
if (require.main === module) {
  seedServices().catch((error) => {
    console.error('❌ Falha ao popular Services:', error);
    process.exit(1);
  });
}
