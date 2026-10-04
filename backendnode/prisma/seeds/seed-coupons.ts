import { getSeedPrismaClient } from './seed-client-helper';

const prisma = getSeedPrismaClient();

export async function seedCoupons(): Promise<void> {
  console.log('\n🎟️  Seed de cupons...');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@iselftoken.com' },
    select: { id: true },
  });

  if (!admin) {
    console.log('⚠️  Usuário admin não encontrado — pulando seed de cupons');
    return;
  }

  const coupons = [
    {
      code: 'MACOS50',
      percent: 50,
      maxUses: 10,
      description: 'Cupom de 50% de desconto — 10 usos disponíveis',
      createdById: admin.id,
    },
    {
      code: 'MARCOS99',
      percent: 99,
      maxUses: 10,
      description: 'Cupom de 99% de desconto — 10 usos disponíveis',
      createdById: admin.id,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        percent: coupon.percent,
        maxUses: coupon.maxUses,
        description: coupon.description,
        active: true,
        status: 'ACTIVE',
      },
      create: {
        code: coupon.code,
        percent: coupon.percent,
        maxUses: coupon.maxUses,
        description: coupon.description,
        active: true,
        status: 'ACTIVE',
        createdById: coupon.createdById,
      },
    });
    console.log(
      `   ✅ Cupom ${coupon.code} (${coupon.percent}% — max ${coupon.maxUses} usos)`,
    );
  }

  console.log(`   Total: ${coupons.length} cupom(ns) garantido(s)`);
}
