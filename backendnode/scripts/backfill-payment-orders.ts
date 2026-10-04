/**
 * S18.7 — Backfill script: migra Payments legados para PaymentOrder+PaymentItem.
 *
 * Contexto: o sistema já cria novos checkouts via _createOrderWithItems
 * (dual-write com Payment legado preservado). Este script cuida do LEGADO
 * — Payments criados antes da Fase 2 que ainda não têm PaymentOrder
 * associada.
 *
 * Estratégia:
 *   1. Para cada Payment sem paymentGroupId E sem PaymentOrder correspondente,
 *      cria 1 PaymentOrder + 1 PaymentItem.
 *   2. Para PARES de Payments irmãos (mesmo campaignId + mesmo purpose relation,
 *      ex.: COMPLIANCE_FEE + FAST_DEPLOY na mesma campanha), agrupa em 1 Order
 *      com 2 Items.
 *   3. Idempotente: detecta Orders já criadas e pula.
 *   4. Logging estruturado para auditoria.
 *
 * Uso:
 *   npx tsx scripts/backfill-payment-orders.ts          # dry-run (default)
 *   npx tsx scripts/backfill-payment-orders.ts --apply  # aplica
 *   npx tsx scripts/backfill-payment-orders.ts --batch=200
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes('--apply');
const BATCH = Number(
  process.argv
    .find((a) => a.startsWith('--batch='))
    ?.split('=')[1] ?? '100',
);

interface Stats {
  totalPayments: number;
  standalone: number;
  bundled: number;
  skipped: number;
  errors: number;
  ordersCreated: number;
  itemsCreated: number;
}

async function main() {
  console.log(
    `\n=== S18.7 Backfill (${APPLY ? 'APPLY' : 'DRY-RUN'}) batch=${BATCH} ===\n`,
  );

  const stats: Stats = {
    totalPayments: 0,
    standalone: 0,
    bundled: 0,
    skipped: 0,
    errors: 0,
    ordersCreated: 0,
    itemsCreated: 0,
  };

  // Busca todos os Payments que ainda não têm Order associada.
  // Heurística: a Order pode ser encontrada por:
  //   - startupDraftId = StartupDraft.paymentOrder.id
  //   - campaignId + totalAmount + status (heurística fraca, mas funciona)
  //   - Para nossa migration, vamos usar: Payment.id existe na PaymentItem.paymentId
  //     — esse campo foi adicionado para essa finalidade
  //
  // NOTA: como não adicionamos um campo "legacyPaymentId" na PaymentItem,
  // usamos uma heurística baseada em detectar Payments que ainda não foram
  // processados: aqueles que NÃO estão referenciados em nenhuma PaymentItem.
  //
  // Implementação: faz N+1 queries para detectar. Para volumes grandes,
  // usar uma CTE raw SQL.

  // PASSO 1: listar todos os Payment IDs
  const allPaymentIds = await prisma.payment.findMany({
    select: { id: true },
  });
  stats.totalPayments = allPaymentIds.length;
  console.log(`Total de Payments no banco: ${stats.totalPayments}`);

  // PASSO 2: para cada Payment, verificar se já existe Order associada.
  // Como não temos paymentGroupId preenchido, usamos:
  //   - se o Payment tem startupDraftId (StartupDraft com paymentOrder setado)
  //     ou campaignId (procurar Order com mesmo campaignId + mesmo totalAmount)
  //
  // Para simplificar a migration: para cada Payment, criamos 1 Order (1 item)
  // se nenhuma Order existir. Para pares (mesma campaignId + mesmo
  // totalAmount), eles serão agrupados via detecção prévia.

  // PASSO 2a: detectar PARES de Payments irmãos (mesmo campaignId + status +
  // métodos similares + um deles é COMPLIANCE_FEE/FAST_DEPLOY ou
  // TOKEN_RESERVATION/FAST_TRACK_REVIEW).
  const allPayments = await prisma.payment.findMany({
    include: { startupDraftFastTrack: true, startupDraft: true },
  });

  // Agrupa por campaignId para detectar bundles
  const byCampaign = new Map<
    number,
    typeof allPayments
  >();
  for (const p of allPayments) {
    if (p.campaignId == null) continue;
    if (!byCampaign.has(p.campaignId)) byCampaign.set(p.campaignId, []);
    byCampaign.get(p.campaignId)!.push(p);
  }

  // Identifica bundles: COMPLIANCE_FEE + FAST_DEPLOY na mesma campanha
  const bundles: Array<{
    primary: (typeof allPayments)[number];
    sibling: (typeof allPayments)[number];
  }> = [];
  for (const [, payments] of byCampaign) {
    const compliance = payments.find((p) => p.purpose === 'COMPLIANCE_FEE');
    const fastDeploy = payments.find((p) => p.purpose === 'FAST_DEPLOY');
    if (compliance && fastDeploy) {
      bundles.push({ primary: compliance, sibling: fastDeploy });
    }
  }
  console.log(`Bundles COMPLIANCE_FEE + FAST_DEPLOY detectados: ${bundles.length}`);

  // PASSO 3: para cada bundle, criar 1 Order com 2 Items (se ainda não existir)
  for (const { primary, sibling } of bundles) {
    try {
      // Verifica se já existe Order para o primary
      const existingOrder = await prisma.paymentOrder.findFirst({
        where: {
          userId: primary.userId,
          OR: [
            { campaignId: primary.campaignId, totalAmount: Number(primary.amount) },
            { startupDraftId: { not: null } },
          ],
        },
      });
      if (existingOrder) {
        stats.skipped += 1;
        continue;
      }

      const totalAmount = Number(primary.amount) + Number(sibling.amount);
      const totalOriginal =
        Number(primary.originalAmount ?? primary.amount) +
        Number(sibling.originalAmount ?? sibling.amount);

      if (APPLY) {
        const order = await prisma.paymentOrder.create({
          data: {
            userId: primary.userId,
            status: primary.status,
            method: primary.method as any,
            totalAmount,
            totalOriginal,
            totalDiscount: totalOriginal - totalAmount,
            txid: primary.txid,
            endToEndId: primary.endToEndId,
            efiChargeId: primary.efiChargeId,
            expiresAt: primary.expiresAt,
            paidAt: primary.paidAt,
            effectsAppliedAt: primary.effectsAppliedAt,
            campaignId: primary.campaignId,
            // paymentGroupId aponta para o primary (âncora)
          },
        });
        await prisma.paymentItem.create({
          data: {
            orderId: order.id,
            purpose: primary.purpose,
            unitPrice: Number(primary.amount),
            quantity: 1,
            subtotal: Number(primary.amount),
            originalSubtotal: Number(primary.originalAmount ?? primary.amount),
            discountAmount: Number(primary.discountAmount ?? 0),
          },
        });
        await prisma.paymentItem.create({
          data: {
            orderId: order.id,
            purpose: sibling.purpose,
            unitPrice: Number(sibling.amount),
            quantity: 1,
            subtotal: Number(sibling.amount),
            originalSubtotal: Number(sibling.originalAmount ?? sibling.amount),
            discountAmount: Number(sibling.discountAmount ?? 0),
          },
        });
        // Marca os Payments com paymentGroupId
        await prisma.payment.update({
          where: { id: primary.id },
          data: { paymentGroupId: primary.id },
        });
        await prisma.payment.update({
          where: { id: sibling.id },
          data: { paymentGroupId: primary.id },
        });
        stats.ordersCreated += 1;
        stats.itemsCreated += 2;
        stats.bundled += 1;
        console.log(
          `  ✓ Bundle #${primary.id}+#${sibling.id} → Order #${order.id} (${APPLY ? 'created' : 'dry-run'})`,
        );
      } else {
        stats.bundled += 1;
        console.log(
          `  [DRY] Bundle #${primary.id}+#${sibling.id} → Order seria criada`,
        );
      }
    } catch (e) {
      stats.errors += 1;
      console.error(`  ✗ Erro no bundle #${primary.id}+#${sibling.id}:`, e);
    }
  }

  // PASSO 4: para cada Payment standalone (não em bundle), criar 1 Order
  // com 1 Item.
  const inBundles = new Set(
    bundles.flatMap(({ primary, sibling }) => [primary.id, sibling.id]),
  );
  // Inclui também os Payments já em startupDraft com paymentOrder (Fase 2 já migrou)
  // NOTA: paymentOrder foi adicionado em S18.7 mas o include do findMany
  // não tem o tipo automaticamente — usamos a relation startupDraft como proxy.
  const inStartupDraft = new Set(
    allPayments
      .filter((p) => p.startupDraft != null)
      .map((p) => p.id),
  );
  const standalones = allPayments.filter(
    (p) => !inBundles.has(p.id) && !inStartupDraft.has(p.id),
  );
  console.log(`Payments standalone a migrar: ${standalones.length}`);

  for (const p of standalones) {
    try {
      const existingOrder = await prisma.paymentOrder.findFirst({
        where: {
          userId: p.userId,
          campaignId: p.campaignId,
          totalAmount: Number(p.amount),
        },
      });
      if (existingOrder) {
        stats.skipped += 1;
        continue;
      }

      const amount = Number(p.amount);
      const original = Number(p.originalAmount ?? p.amount);

      if (APPLY) {
        const order = await prisma.paymentOrder.create({
          data: {
            userId: p.userId,
            status: p.status,
            method: p.method as any,
            totalAmount: amount,
            totalOriginal: original,
            totalDiscount: original - amount,
            txid: p.txid,
            endToEndId: p.endToEndId,
            efiChargeId: p.efiChargeId,
            expiresAt: p.expiresAt,
            paidAt: p.paidAt,
            effectsAppliedAt: p.effectsAppliedAt,
            campaignId: p.campaignId,
          },
        });
        await prisma.paymentItem.create({
          data: {
            orderId: order.id,
            purpose: p.purpose,
            unitPrice: amount,
            quantity: 1,
            subtotal: amount,
            originalSubtotal: original,
            discountAmount: Number(p.discountAmount ?? 0),
            serviceDetails: (p.serviceDetails as any) ?? undefined,
          },
        });
        // Marca o Payment com paymentGroupId
        await prisma.payment.update({
          where: { id: p.id },
          data: { paymentGroupId: p.id },
        });
        stats.ordersCreated += 1;
        stats.itemsCreated += 1;
        stats.standalone += 1;
        console.log(
          `  ✓ Payment #${p.id} (${p.purpose}) → Order #${order.id} (${APPLY ? 'created' : 'dry-run'})`,
        );
      } else {
        stats.standalone += 1;
        console.log(
          `  [DRY] Payment #${p.id} (${p.purpose}) → Order seria criada`,
        );
      }
    } catch (e) {
      stats.errors += 1;
      console.error(`  ✗ Erro no Payment #${p.id}:`, e);
    }
  }

  console.log(`\n=== Resumo (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===`);
  console.log(`  Total Payments:       ${stats.totalPayments}`);
  console.log(`  Bundles processados:  ${stats.bundled}`);
  console.log(`  Standalones:          ${stats.standalone}`);
  console.log(`  Skipped (já migrados): ${stats.skipped}`);
  console.log(`  Orders criadas:       ${stats.ordersCreated}`);
  console.log(`  Items criados:         ${stats.itemsCreated}`);
  console.log(`  Erros:                ${stats.errors}`);
  if (!APPLY && (stats.ordersCreated > 0 || stats.bundled > 0)) {
    console.log(
      '\n  Para aplicar: rode novamente com --apply (e opcionalmente --batch=N).',
    );
  }
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
