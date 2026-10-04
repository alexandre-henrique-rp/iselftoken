/**
 * E2E — Cupons User (Playwright).
 * Escopo: S08-S10 (cupons UI para usuário).
 * runners: playwright test coupons-user.spec.ts
 */
import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import {
  createFounderUser,
  generateUniqueEmail,
} from './setup/test-helpers';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:7077';

test.describe('Cupons User — E2E (S08-S10)', () => {
  // ------------------------------------------------------------------
  // Cenário 1: USER aplica cupom no checkout → desconto aplicado
  // ------------------------------------------------------------------
  test('USER aplica cupom no checkout → desconto aplicado', async ({ page }) => {
    const email = generateUniqueEmail('userCoupon');
    const ctx = page.context() as BrowserContext;
    const { sessionId } = await createFounderUser(ctx, email);

    // Criar cupom de teste via API
    const code = `USERDESC${Date.now()}`.slice(-10);
    await ctx.request.post(`${BACKEND_URL}/coupons`, {
      data: {
        code,
        discountType: 'PERCENTAGE',
        discountValue: 25,
        active: true,
        maxUses: 50,
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        minPurchase: 0,
      },
      headers: { cookie: `session_id=${sessionId}` },
    });

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    // Aplicar cupom
    const couponInput = page.locator('[data-testid="coupon-input"]');
    await couponInput.fill(code);
    await page.locator('[data-testid="apply-coupon-btn"]').click();

    // Toast de sucesso
    await expect(page.getByText(/cupom aplicado|desconto/i)).toBeVisible({ timeout: 5000 });

    // Total com desconto visível
    await expect(page.locator('[data-testid="total-with-discount"]')).toBeVisible();
    await expect(page.getByText('25%')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Cenário 2: USER aplica cupom esgotado → toast error PT-BR
  // ------------------------------------------------------------------
  test('USER aplica cupom esgotado → toast error PT-BR', async ({ page }) => {
    const email = generateUniqueEmail('userExhausted');
    const ctx = page.context() as BrowserContext;
    const { sessionId } = await createFounderUser(ctx, email);

    // Criar cupom esgotado
    const code = `ESGOTADO${Date.now()}`.slice(-10);
    await ctx.request.post(`${BACKEND_URL}/coupons`, {
      data: {
        code,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        active: true,
        maxUses: 1,
        usedCount: 1, // esgotado
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      headers: { cookie: `session_id=${sessionId}` },
    });

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    await page.locator('[data-testid="coupon-input"]').fill(code);
    await page.locator('[data-testid="apply-coupon-btn"]').click();

    // Toast de erro em PT-BR
    await expect(
      page.getByText(/cupom esgotado|uso.*excedido|limite.*atingido/i),
    ).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // Cenário 3: USER vê histórico pessoal de cupons
  // ------------------------------------------------------------------
  test('USER vê histórico pessoal de cupons usados', async ({ page }) => {
    const email = generateUniqueEmail('userHistory');
    const ctx = page.context() as BrowserContext;
    const { sessionId } = await createFounderUser(ctx, email);

    // Criar cupom + usar (via API)
    const code = `HIST${Date.now()}`.slice(-10);
    await ctx.request.post(`${BACKEND_URL}/coupons`, {
      data: {
        code,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        active: true,
        maxUses: 10,
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      headers: { cookie: `session_id=${sessionId}` },
    });

    // Criar payment + aplicar cupom
    const payRes = await ctx.request.post(`${BACKEND_URL}/payment`, {
      data: {
        amount: 100000,
        method: 'PIX',
        purpose: 'TOKEN_RESERVATION',
      },
      headers: { cookie: `session_id=${sessionId}` },
    });
    const paymentId = (await payRes.json()).data?.id;

    await ctx.request.post(`${BACKEND_URL}/coupons/${code}/apply`, {
      data: { paymentId },
      headers: { cookie: `session_id=${sessionId}` },
    });

    // Marcar como pago
    await ctx.request.post(`${BACKEND_URL}/payment/${paymentId}/dev/simulate-paid`, {
      headers: { cookie: `session_id=${sessionId}` },
    });

    // Navegar para histórico
    await page.goto(`${FRONTEND_URL}/profile/coupons`);

    await expect(page.getByText('Histórico de Cupons')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByText('20%')).toBeVisible();
  });
});
