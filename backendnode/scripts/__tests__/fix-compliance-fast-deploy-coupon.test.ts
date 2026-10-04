/**
 * Testes unitários do math de rateio do script
 * fix-compliance-fast-deploy-coupon.ts.
 *
 * Rodar: npx tsx scripts/__tests__/fix-compliance-fast-deploy-coupon.test.ts
 */
import assert from 'node:assert/strict';

// Replica inline da função para evitar bootstrap do Prisma
function roundHalfEven(value: number, places: number): number {
  const factor = 10 ** places;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) < 1e-9) {
    const rounded = floor % 2 === 0 ? floor : floor + 1;
    return rounded / factor;
  }
  return Math.round(scaled) / factor;
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

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error('    ', (err as Error).message);
    failed += 1;
  }
}

console.log('\n=== fix-compliance-fast-deploy-coupon (math) ===\n');

// Cenário 1: payment 91 do user — COMPLIANCE_FEE R$1500 + FAST_DEPLOY R$1000 + 99%
test('payment 91: 99% off rateia R$1485 (primary) + R$990 (sibling)', () => {
  const r = computeRateio(1500, 1000, 99);
  assert.equal(r.totalOriginal, 2500);
  assert.equal(r.totalFinal, 25);
  assert.equal(r.totalDiscount, 2475);
  assert.equal(r.primaryDiscount, 1485);
  assert.equal(r.siblingDiscount, 990);
  assert.equal(r.primaryFinal, 15);
  assert.equal(r.siblingFinal, 10);
  // Invariante: a soma dos finais = total final
  assert.equal(roundHalfEven(r.primaryFinal + r.siblingFinal, 2), r.totalFinal);
  // Invariante: a soma dos descontos = total desconto
  assert.equal(
    roundHalfEven(r.primaryDiscount + r.siblingDiscount, 2),
    r.totalDiscount,
  );
});

// Cenário 2: cupom 50% — 1000 + 500 = 1500 → 750 final (250 + 150 = 400 desconto)
test('50% off: rateio 50/50', () => {
  const r = computeRateio(1000, 500, 50);
  assert.equal(r.totalOriginal, 1500);
  assert.equal(r.totalFinal, 750);
  assert.equal(r.totalDiscount, 750);
  // primary 1000/1500 = 0.6666 → 750 * 0.6666 = 500 (rounded)
  assert.equal(r.primaryDiscount, 500);
  assert.equal(r.siblingDiscount, 250);
  assert.equal(r.primaryFinal, 500);
  assert.equal(r.siblingFinal, 250);
});

// Cenário 3: cupom integral (100%) — ambos devem ficar 0
test('100% off: ambos com final 0', () => {
  const r = computeRateio(1500, 1000, 100);
  assert.equal(r.totalFinal, 0);
  assert.equal(r.totalDiscount, 2500);
  assert.equal(r.primaryFinal, 0);
  assert.equal(r.siblingFinal, 0);
});

// Cenário 4: sem cupom (0%) — full price
test('0% off: desconto 0', () => {
  const r = computeRateio(1500, 1000, 0);
  assert.equal(r.totalDiscount, 0);
  assert.equal(r.primaryFinal, 1500);
  assert.equal(r.siblingFinal, 1000);
});

// Cenário 5: payment legado sem FAST_DEPLOY — rateio degenerado
test('sem sibling (valor 0): tudo no primary', () => {
  const r = computeRateio(1500, 0, 99);
  assert.equal(r.totalOriginal, 1500);
  assert.equal(r.totalFinal, 15);
  assert.equal(r.primaryDiscount, 1485);
  assert.equal(r.siblingDiscount, 0);
  assert.equal(r.siblingFinal, 0);
});

// Cenário 6: HALF_EVEN rounding em caso .5 — não-Math.round
test('HALF_EVEN: 0.5 → par mais próximo (banker rounding)', () => {
  // 2.5 deve arredondar para 2 (par), não 3
  assert.equal(roundHalfEven(2.5, 0), 2);
  // 3.5 deve arredondar para 4 (par)
  assert.equal(roundHalfEven(3.5, 0), 4);
  // 1.5 → 2
  assert.equal(roundHalfEven(1.5, 0), 2);
});

console.log(`\nResultados: ${passed} passou, ${failed} falhou\n`);
if (failed > 0) process.exit(1);
