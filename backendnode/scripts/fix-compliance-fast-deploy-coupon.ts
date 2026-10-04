/**
 * Script de migração: corrige o rateio do cupom em checkouts
 * COMPLIANCE_FEE + FAST_DEPLOY.
 *
 * Contexto (S18.6 + fix pós-deploy):
 *   Antes deste script, o CouponService.apply() só detectava o Payment
 *   irmão do checkout consolidado via relation `startupDraftFastTrack`
 *   (que cobre TOKEN_RESERVATION + FAST_TRACK_REVIEW do wizard
 *   `/founder/startups/new`). O segundo caso — COMPLIANCE_FEE +
 *   FAST_DEPLOY, que se vinculam via `campaignId` (não via relation
 *   dedicada) — não era detectado, então o rateio proporcional do
 *   desconto acontecia apenas entre o COMPLIANCE_FEE e "nada":
 *     - COMPLIANCE_FEE recebia 99% de desconto
 *     - FAST_DEPLOY ficava com valor cheio
 *
 *   O resultado era: subtotal = R$ 2.500,00, total = R$ 1.015,00
 *   (em vez de R$ 25,00 esperado com cupom de 99%).
 *
 *   O fix do código em `coupon.service.ts` cobre novos cupons. Este
 *   script repara o LEGADO: para cada par COMPLIANCE_FEE + FAST_DEPLOY
 *   já existente onde o FAST_DEPLOY ficou sem desconto, recalcula o
 *   rateio usando o mesmo math (HALF_EVEN 2 casas decimais) e atualiza
 *   o FAST_DEPLOY.
 *
 * Uso:
 *   # Inspeção de 1 pagamento específico
 *   npx tsx scripts/fix-compliance-fast-deploy-coupon.ts --payment-id 91
 *
 *   # Reparar 1 pagamento
 *   npx tsx scripts/fix-compliance-fast-deploy-coupon.ts --payment-id 91 --fix
 *
 *   # Reparar TODOS os pares quebrados
 *   npx tsx scripts/fix-compliance-fast-deploy-coupon.ts --all --fix
 *
 *   # Modo dry-run (padrão): só lista, não altera
 *   npx tsx scripts/fix-compliance-fast-deploy-coupon.ts --all
 *
 * Idempotência: a query de detecção filtra apenas pagamentos onde o
 * FAST_DEPLOY ainda tem discountAmount=0. Re-rodar o script é seguro.
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient, Prisma } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

// =====================================================================
// Math (espelha coupon.service.ts:totalDiscount / ratio / HALF_EVEN)
// =====================================================================

/**
 * Espelha `Prisma.Decimal.toDecimalPlaces(n, ROUND_HALF_EVEN)` —
 * necessário porque `Math.round` em JS usa banker's rounding diferente.
 * HALF_EVEN (banker's rounding) arredonda 0.5 para o par mais próximo;
 * 1.5 → 2, 2.5 → 2, 3.5 → 4, etc. Diferença do Math.round só importa
 * para valores com .5 exato no dígito de corte (centavos).
 */
function roundHalfEven(value: number, places: number): number {
  const factor = 10 ** places;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) < 1e-9) {
    // Exato meio: arredonda para o par
    const rounded = floor % 2 === 0 ? floor : floor + 1;
    return rounded / factor;
  }
  return Math.round(scaled) / factor;
}

function dec(v: Prisma.Decimal | string | number | null | undefined): number {
  if (v == null) return 0;
  return Number(v.toString());
}

interface RateioResult {
  primaryOriginal: number;
  siblingOriginal: number;
  totalOriginal: number;
  totalFinal: number;
  totalDiscount: number;
  primaryDiscount: number;
  siblingDiscount: number;
  primaryFinal: number;
  siblingFinal: number;
}

function computeRateio(
  primaryOriginal: number,
  siblingOriginal: number,
  percent: number,
): RateioResult {
  const totalOriginal = roundHalfEven(primaryOriginal + siblingOriginal, 2);
  const totalFinal = roundHalfEven(
    (totalOriginal * (100 - percent)) / 100,
    2,
  );
  const totalDiscount = roundHalfEven(totalOriginal - totalFinal, 2);
  // rateio proporcional; residual de 1 centavo fica no primary
  const siblingDiscount = roundHalfEven(
    totalDiscount * (siblingOriginal / totalOriginal),
    2,
  );
  const primaryDiscount = roundHalfEven(totalDiscount - siblingDiscount, 2);
  const primaryFinal = roundHalfEven(primaryOriginal - primaryDiscount, 2);
  const siblingFinal = roundHalfEven(siblingOriginal - siblingDiscount, 2);
  return {
    primaryOriginal,
    siblingOriginal,
    totalOriginal,
    totalFinal,
    totalDiscount,
    primaryDiscount,
    siblingDiscount,
    primaryFinal,
    siblingFinal,
  };
}

// =====================================================================
// Argumentos CLI
// =====================================================================

const args = process.argv.slice(2);
const TARGET_ID = (() => {
  const idx = args.indexOf('--payment-id');
  return idx >= 0 ? Number(args[idx + 1] ?? 0) : 0;
})();
const ALL = args.includes('--all');
const FIX = args.includes('--fix');
const DRY_RUN = !FIX; // default é dry-run

if (!TARGET_ID && !ALL) {
  console.error(
    'Uso: npx tsx scripts/fix-compliance-fast-deploy-coupon.ts <--payment-id N | --all> [--fix]',
  );
  console.error(
    '  Sem --fix, roda em modo dry-run (apenas lista, não altera).',
  );
  process.exit(1);
}

// =====================================================================
// Lógica principal
// =====================================================================

interface BrokenPair {
  primaryId: number;
  primaryOriginal: number;
  primaryAmount: number;
  primaryDiscount: number;
  primaryStatus: string;
  primaryCouponCode: string;
  siblingId: number;
  siblingOriginal: number;
  siblingAmount: number;
  siblingDiscount: number;
  siblingStatus: string;
  campaignId: number;
  couponPercent: number;
  couponUsageId: number;
}

async function findBrokenPairByPrimary(
  primaryId: number,
): Promise<BrokenPair | null> {
  const primary = await prisma.payment.findUnique({
    where: { id: primaryId },
    select: {
      id: true,
      purpose: true,
      amount: true,
      originalAmount: true,
      discountAmount: true,
      paidAmount: true,
      status: true,
      campaignId: true,
      serviceDetails: true,
    },
  });
  if (!primary || primary.purpose !== 'COMPLIANCE_FEE' || !primary.campaignId) {
    return null;
  }
  return findBrokenPairForPrimary(primary);
}

async function findAllBrokenPairs(): Promise<BrokenPair[]> {
  const primaries = await prisma.payment.findMany({
    where: { purpose: 'COMPLIANCE_FEE', campaignId: { not: null } },
    select: {
      id: true,
      purpose: true,
      amount: true,
      originalAmount: true,
      discountAmount: true,
      paidAmount: true,
      status: true,
      campaignId: true,
      serviceDetails: true,
    },
  });
  const out: BrokenPair[] = [];
  for (const p of primaries) {
    const pair = await findBrokenPairForPrimary(p);
    if (pair) out.push(pair);
  }
  return out;
}

async function findBrokenPairForPrimary(primary: {
  id: number;
  amount: Prisma.Decimal;
  originalAmount: Prisma.Decimal | null;
  discountAmount: Prisma.Decimal | null;
  status: string;
  campaignId: number | null;
  serviceDetails: Prisma.JsonValue;
}): Promise<BrokenPair | null> {
  if (!primary.campaignId) return null;
  // Quebrado: COMPLIANCE_FEE tem desconto > 0 E FAST_DEPLOY irmão tem
  // desconto 0 (ou NULL) na mesma campanha.
  if (dec(primary.discountAmount) <= 0) return null;

  const sibling = await prisma.payment.findFirst({
    where: {
      campaignId: primary.campaignId,
      purpose: 'FAST_DEPLOY',
      status: { in: ['PENDING', 'PAID'] },
      id: { not: primary.id },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      originalAmount: true,
      discountAmount: true,
      status: true,
      serviceDetails: true,
    },
  });
  if (!sibling) return null;
  if (dec(sibling.discountAmount) > 0) return null; // já corrigido

  // Recupera o cupom aplicado no primary (via CouponUsage + Coupon).
  const usage = await prisma.couponUsage.findFirst({
    where: { paymentId: primary.id },
    orderBy: { appliedAt: 'desc' },
    select: { id: true, couponId: true },
  });
  if (!usage) return null;
  const coupon = await prisma.coupon.findUnique({
    where: { id: usage.couponId },
    select: { code: true, percent: true },
  });
  if (!coupon) return null;

  // serviceDetails do primary tem o couponCode (defesa: se por algum
  // motivo estiver ausente, ainda assim rateamos).
  const svc = (primary.serviceDetails ?? {}) as Record<string, unknown>;

  return {
    primaryId: primary.id,
    primaryOriginal: dec(primary.originalAmount) || dec(primary.amount),
    primaryAmount: dec(primary.amount),
    primaryDiscount: dec(primary.discountAmount),
    primaryStatus: primary.status,
    primaryCouponCode: String(svc.couponCode ?? coupon.code),
    siblingId: sibling.id,
    siblingOriginal: dec(sibling.originalAmount) || dec(sibling.amount),
    siblingAmount: dec(sibling.amount),
    siblingDiscount: dec(sibling.discountAmount),
    siblingStatus: sibling.status,
    campaignId: primary.campaignId,
    couponPercent: coupon.percent,
    couponUsageId: usage.id,
  };
}

function printPair(pair: BrokenPair, r: RateioResult, action: 'dry' | 'fix') {
  const tag = action === 'fix' ? '✅ FIX' : '🔍 DRY';
  console.log(`\n${tag} campaign=${pair.campaignId} primary=${pair.primaryId} sibling=${pair.siblingId}`);
  console.log(`  cupom=${pair.primaryCouponCode} (${pair.couponPercent}% off)`);
  console.log(
    `  primary (COMPLIANCE_FEE) original=R$ ${pair.primaryOriginal.toFixed(2)}  atual=R$ ${pair.primaryAmount.toFixed(2)}  desconto=R$ ${pair.primaryDiscount.toFixed(2)}  status=${pair.primaryStatus}`,
  );
  console.log(
    `  sibling (FAST_DEPLOY)   original=R$ ${pair.siblingOriginal.toFixed(2)}  atual=R$ ${pair.siblingAmount.toFixed(2)}  desconto=R$ ${pair.siblingDiscount.toFixed(2)}  status=${pair.siblingStatus}`,
  );
  console.log(
    `  >>> sibling novo: amount=R$ ${r.siblingFinal.toFixed(2)}  discountAmount=R$ ${r.siblingDiscount.toFixed(2)}  paidAmount=R$ ${r.siblingFinal.toFixed(2)}`,
  );
  console.log(
    `  totalOriginal=R$ ${r.totalOriginal.toFixed(2)}  totalFinal=R$ ${r.totalFinal.toFixed(2)}  totalDiscount=R$ ${r.totalDiscount.toFixed(2)}`,
  );
}

async function fixOne(pair: BrokenPair) {
  const r = computeRateio(
    pair.primaryOriginal,
    pair.siblingOriginal,
    pair.couponPercent,
  );
  // Sanity check: a soma dos 2 finais deve ser igual ao total final
  // registrado no CouponUsage (que já está no primary). Se o total
  // final do coupon já foi rateado errado, este script não o corrige
  // (CouponUsage é o registro do TOTAL consolidado do checkout).
  const newSiblingAmount = roundHalfEven(r.siblingFinal, 2);
  const newSiblingDiscount = roundHalfEven(r.siblingDiscount, 2);
  const newSiblingPaid = roundHalfEven(r.siblingFinal, 2);

  const updatedSibling = await prisma.payment.update({
    where: { id: pair.siblingId },
    data: {
      amount: new Prisma.Decimal(newSiblingAmount.toFixed(2)),
      discountAmount: new Prisma.Decimal(newSiblingDiscount.toFixed(2)),
      paidAmount: new Prisma.Decimal(newSiblingPaid.toFixed(2)),
      serviceDetails: {
        ...((await prisma.payment.findUnique({
          where: { id: pair.siblingId },
          select: { serviceDetails: true },
        }))?.serviceDetails as Record<string, unknown> | null),
        couponCode: pair.primaryCouponCode,
        couponId: (
          await prisma.coupon.findUnique({
            where: { code: pair.primaryCouponCode },
            select: { id: true },
          })
        )?.id,
        percent: pair.couponPercent,
        discountApplied: newSiblingDiscount,
      } as Prisma.InputJsonValue,
    },
  });

  // Audit log: repara o legado com rastreabilidade
  await prisma.auditLog.create({
    data: {
      userId: null, // ação de sistema (cf. BUG-FT-001)
      action: 'FAST_DEPLOY_COUPON_RATEIO_REPAIRED',
      entity: 'Payment',
      entityId: String(updatedSibling.id),
      oldValue: {
        amount: pair.siblingAmount,
        discountAmount: pair.siblingDiscount,
        paidAmount: pair.siblingAmount,
      } as Prisma.InputJsonValue,
      newValue: {
        amount: newSiblingAmount,
        discountAmount: newSiblingDiscount,
        paidAmount: newSiblingPaid,
        couponCode: pair.primaryCouponCode,
        couponPercent: pair.couponPercent,
        reason:
          'S18.6 — re-rateio do cupom entre COMPLIANCE_FEE + FAST_DEPLOY (legado)',
      } as Prisma.InputJsonValue,
    },
  });

  return { r, updatedSibling };
}

async function main() {
  const mode = DRY_RUN ? 'DRY-RUN' : 'FIX';
  console.log(`\n=== fix-compliance-fast-deploy-coupon (${mode}) ===\n`);

  const pairs = TARGET_ID
    ? ([await findBrokenPairByPrimary(TARGET_ID)].filter(
        Boolean,
      ) as BrokenPair[])
    : await findAllBrokenPairs();

  if (pairs.length === 0) {
    console.log('Nenhum par quebrado encontrado. ✅');
    return;
  }

  let fixed = 0;
  for (const pair of pairs) {
    const r = computeRateio(
      pair.primaryOriginal,
      pair.siblingOriginal,
      pair.couponPercent,
    );
    if (DRY_RUN) {
      printPair(pair, r, 'dry');
    } else {
      printPair(pair, r, 'fix');
      await fixOne(pair);
      fixed += 1;
    }
  }

  console.log(
    `\n${DRY_RUN ? 'Listados' : 'Reparados'}: ${pairs.length} par(es)${
      !DRY_RUN ? ` (${fixed} atualizados)` : ''
    }`,
  );
  if (DRY_RUN && pairs.length > 0) {
    console.log(
      '\nPara aplicar a correção, rode novamente com --fix (ou --payment-id N --fix).',
    );
  }
}

main()
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
