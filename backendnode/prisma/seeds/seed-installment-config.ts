import { getSeedPrismaClient } from './seed-client-helper';
import 'dotenv/config';

/**
 * Seed da configuração de parcelamento de cartão de crédito (EFI).
 *
 * Garante que exista UMA config vigente (`effectiveUntil = null`) usada como
 * fonte de verdade pelo backend ao calcular/cobrar parcelas:
 *   - interestRate: taxa mensal de juros compostos (decimal, ex.: 0.0299 = 2.99%)
 *   - maxInstallments: máximo de parcelas (limite EFI = 18)
 *   - minInstallmentAmount: valor mínimo de cada parcela (R$ 100,00)
 *
 * Idempotente: se já houver uma config vigente, não cria outra (apenas
 * garante o valor mínimo da parcela quando divergente).
 */
const INSTALLMENT_DEFAULTS = {
  interestRate: 0.0299,
  monthlyInterestRate: 0.0299,
  maxInstallments: 18,
  minInstallmentAmount: 100.0,
  notes: 'Config inicial de parcelamento (seed).',
};

export async function seedInstallmentConfig() {
  const prisma = getSeedPrismaClient();

  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    if (!admin) {
      console.warn(
        '⚠️  InstallmentConfig: nenhum ADMIN encontrado; seed ignorado.',
      );
      return;
    }

    const vigente = await prisma.installmentConfig.findFirst({
      where: { effectiveUntil: null, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (vigente) {
      // Garante a parcela mínima de R$ 100 na config vigente existente.
      if (Number(vigente.minInstallmentAmount) !== INSTALLMENT_DEFAULTS.minInstallmentAmount) {
        await prisma.installmentConfig.update({
          where: { id: vigente.id },
          data: { minInstallmentAmount: INSTALLMENT_DEFAULTS.minInstallmentAmount },
        });
        console.log(
          `✅ InstallmentConfig: parcela mínima ajustada para R$ ${INSTALLMENT_DEFAULTS.minInstallmentAmount} (config #${vigente.id})`,
        );
      } else {
        console.log('✅ InstallmentConfig: config vigente já atende aos defaults.');
      }
      return;
    }

    const created = await prisma.installmentConfig.create({
      data: {
        interestRate: INSTALLMENT_DEFAULTS.interestRate,
        monthlyInterestRate: INSTALLMENT_DEFAULTS.monthlyInterestRate,
        maxInstallments: INSTALLMENT_DEFAULTS.maxInstallments,
        minInstallmentAmount: INSTALLMENT_DEFAULTS.minInstallmentAmount,
        effectiveFrom: new Date(),
        effectiveUntil: null,
        isActive: true,
        createdById: admin.id,
        notes: INSTALLMENT_DEFAULTS.notes,
      },
    });

    console.log(
      `✅ InstallmentConfig: config vigente criada (#${created.id}) — taxa ${INSTALLMENT_DEFAULTS.interestRate}, min R$ ${INSTALLMENT_DEFAULTS.minInstallmentAmount}, max ${INSTALLMENT_DEFAULTS.maxInstallments}x`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
