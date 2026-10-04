/**
 * E2E — Checkout PIX (Playwright).
 * Escopo: S08-S10 (checkout + cupons UI + toasts).
 * runners: playwright test checkout-pix.spec.ts
 */
import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import {
  createFounderUser,
  generateUniqueEmail,
  mockEfiWebhook,
} from './setup/test-helpers';

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Checkout PIX — E2E (S08-S10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/`);
  });

  // ------------------------------------------------------------------
  // Cenário 1: User compra tokens com PIX
  // ------------------------------------------------------------------
  test('User compra tokens com PIX e recebe confirmação', async ({ page }) => {
    const email = generateUniqueEmail('pixCheckout');
    const ctx = page.context() as BrowserContext;

    // Setup: criar usuario FUNDADOR via API
    const { sessionId } = await createFounderUser(ctx, email);

    // Ir para checkout
    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);
    await expect(page.getByText('Pagar com PIX')).toBeVisible({ timeout: 5000 });

    // QR Code visível
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="copy-paste"]')).toBeVisible();

    // Copiar chave PIX
    const copyBtn = page.locator('[data-testid="copy-pix-btn"]');
    await copyBtn.click();
    // Toast "Chave copiada" deve aparecer
    await expect(page.getByText(/copiad/)).toBeVisible({ timeout: 3000 });

    // Simular webhook PIX recebido
    await mockEfiWebhook('TESTTXID', 'pix.received');

    // Aguardar status mudar para PAID
    await expect(page.getByText('Pagamento confirmado')).toBeVisible({ timeout: 5000 });

    // Salvar session cookie para proximo teste
    await ctx.storageState({ path: `test-results/pix-session-${Date.now()}.json` });
  });

  // ------------------------------------------------------------------
  // Cenário 2: QR Code expira → toast de erro
  // ------------------------------------------------------------------
  test('QR Code expirado mostra toast de erro', async ({ page }) => {
    const email = generateUniqueEmail('pixExpired');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    // Setup: payment com expiresAt no passado
    await ctx.request.post('http://localhost:7077/payment/1/dev/simulate-expired');

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);
    await expect(page.getByText('QR Code expirado')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Gerar novo QR Code')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Cenário 3: Aplica cupom no checkout PIX
  // ------------------------------------------------------------------
  test('User aplica cupom no checkout PIX com desconto', async ({ page }) => {
    const email = generateUniqueEmail('pixCoupon');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    // Campo de cupom visível
    const couponInput = page.locator('[data-testid="coupon-input"]');
    await expect(couponInput).toBeVisible();

    // Digitar cupom
    await couponInput.fill('DESCONTO20');
    await page.locator('[data-testid="apply-coupon-btn"]').click();

    // Toast de sucesso
    await expect(page.getByText(/cupom aplicado/i)).toBeVisible({ timeout: 3000 });

    // Valor atualizado com desconto
    await expect(page.locator('[data-testid="total-with-discount"]')).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Cenário 4: Cupom inválido → toast error PT-BR
  // ------------------------------------------------------------------
  test('Cupom inválido mostra toast de erro em PT-BR', async ({ page }) => {
    const email = generateUniqueEmail('pixBadCoupon');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    await page.locator('[data-testid="coupon-input"]').fill('CUPOMINVALIDO');
    await page.locator('[data-testid="apply-coupon-btn"]').click();

    await expect(page.getByText(/cupom.*inválido|não.*encontrado/i)).toBeVisible({ timeout: 3000 });
  });
});
