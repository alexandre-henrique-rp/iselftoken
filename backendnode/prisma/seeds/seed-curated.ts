import { getSeedPrismaClient } from './seed-client-helper';
import 'dotenv/config';

interface PickSeed {
  quote: string;
  curatorName: string;
  curatorRole: string;
  curatorAvatar: string;
}

const PICKS: PickSeed[] = [
  {
    quote:
      'Time fundador com track record em fintech B2B e produto que já fatura. Risco de execução baixo, upside em escala.',
    curatorName: 'Maria Silva',
    curatorRole: 'Lead Analyst',
    curatorAvatar: '/avatars/curator-1.png',
  },
  {
    quote:
      'Tese de descarbonização logística com contratos âncora assinados. Crescimento de receita 18% MoM nos últimos 6 meses.',
    curatorName: 'Rafael Mendes',
    curatorRole: 'Senior Analyst',
    curatorAvatar: '/avatars/curator-2.png',
  },
  {
    quote:
      'AgTech com tecnologia proprietária validada em campo, pipeline comercial sólido e regulatório resolvido para 3 estados.',
    curatorName: 'Camila Rocha',
    curatorRole: 'Head of Research',
    curatorAvatar: '/avatars/curator-3.png',
  },
];

async function main() {
  const prisma = getSeedPrismaClient();
  try {
    const existing = await prisma.curatedPick.count({
      where: { active: true },
    });
    if (existing >= PICKS.length) {
      console.log(
        `✅ Já existem ${existing} curated picks ativos. Seed ignorado para manter idempotência.`,
      );
      return;
    }

    const startups = await prisma.startup.findMany({
      where: {
        status: 'APPROVED',
        campaigns: { some: { status: 'OPEN' } },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: PICKS.length,
      select: { id: true, nome: true },
    });

    if (startups.length < PICKS.length) {
      console.warn(
        `⚠️  Apenas ${startups.length} startups elegíveis encontradas, ${PICKS.length} esperadas. Seed parcial.`,
      );
    }

    const created: number[] = [];
    for (let i = 0; i < startups.length; i++) {
      const pick = PICKS[i];
      const startup = startups[i];
      const row = await prisma.curatedPick.create({
        data: {
          startupId: startup.id,
          quote: pick.quote,
          curatorName: pick.curatorName,
          curatorRole: pick.curatorRole,
          curatorAvatar: pick.curatorAvatar,
          active: true,
          publishedAt: new Date(),
        },
      });
      created.push(row.id);
      console.log(
        `  ✓ pick #${row.id} → startup "${startup.nome}" (${startup.id})`,
      );
    }

    console.log(`✅ ${created.length} curated picks inseridos.`);
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedCurated() {
  await main();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Erro ao executar seed-curated:', e);
    process.exit(1);
  });
}
