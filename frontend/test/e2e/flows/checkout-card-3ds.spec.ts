/**
 * E2E — Checkout Cartão + 3DS (Playwright).
 * Escopo: S08-S10 (checkout transparente + UI cupons + toasts).
 * runners: playwright test checkout-card-3ds.spec.ts
 */
import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import {
  createFounderUser,
  generateUniqueEmail,
} from './setup/test-helpers';

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Checkout Cartão + 3DS — E2E (S08-S10)', () => {
  // ------------------------------------------------------------------
  // Cenário 1: Cartão à vista (1x) → PENDING → PAID
  // ------------------------------------------------------------------
  test('Cartão à vista (1x) → PENDING → PAID', async ({ page }) => {
    const email = generateUniqueEmail('cardVista');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    // Selecionar método cartão
    await page.locator('[data-testid="payment-method-card"]').click();
    await expect(page.getByText('Cartão de Crédito')).toBeVisible();

    // Preencher dados do cartão
    await page.locator('[data-testid="card-number"]').fill('4111111111111111');
    await page.locator('[data-testid="card-expiry"]').fill('12/28');
    await page.locator('[data-testid="card-cvv"]').fill('123');
    await page.locator('[data-testid="card-holder"]').fill('João Comprador');

    // Parcelamento: 1x
    await page.locator('[data-testid="installment-option"]').first().click();

    // Confirmar
    await page.locator('[data-testid="confirm-card-btn"]').click();

    // Status: PENDING_3DS ou já PAID (取决于 simulação)
    const statusLocator = page.locator('[data-testid="payment-status"]');
    await expect(statusLocator).toBeVisible({ timeout: 5000 });
    const status = await statusLocator.textContent();
    expect(['PENDING', 'PAID', 'PENDING_3DS']).toContain(status);

    // Se 3DS: completar autenticação simulada
    if (status === 'PENDING_3DS') {
      await page.locator('[data-testid="3ds-challenge-frame"]').fill('challenge_ok');
      await page.locator('[data-testid="3ds-submit-btn"]').click();
      await expect(page.getByText('Pagamento confirmado')).toBeVisible({ timeout: 5000 });
    }
  });

  // ------------------------------------------------------------------
  // Cenário 2: Cartão parcelado (6x) → mostra juros → PENDING_3DS → PAID
  // ------------------------------------------------------------------
  test('Cartão parcelado (6x) → mostra juros → autenticação 3DS → PAID', async ({ page }) => {
    const email = generateUniqueEmail('cardParc');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    await page.locator('[data-testid="payment-method-card"]').click();

    // Preencher cartão
    await page.locator('[data-testid="card-number"]').fill('5555555555554444');
    await page.locator('[data-testid="card-expiry"]').fill('06/27');
    await page.locator('[data-testid="card-cvv"]').fill('789');
    await page.locator('[data-testid="card-holder"]').fill('Maria Parc');

    // Selecionar 6x
    const installmentOptions = page.locator('[data-testid="installment-option"]');
    await installmentOptions.nth(5).click(); // índice 5 = 6x

    // Juros visíveis
    await expect(page.getByText(/juros|taeg/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('total-with-interest')).toBeVisible();

    // Confirmar
    await page.locator('[data-testid="confirm-card-btn"]').click();

    // Aguardar 3DS
    const statusLocator = page.locator('[data-testid="payment-status"]');
    await expect(statusLocator).toBeVisible({ timeout: 5000 });

    // Completar 3DS
    await page.locator('[data-testid="3ds-challenge-frame"]').fill('challenge_ok');
    await page.locator('[data-testid="3ds-submit-btn"]').click();
    await expect(page.getByText('Pagamento confirmado')).toBeVisible({ timeout: 8000 });
  });

  // ------------------------------------------------------------------
  // Cenário 3: Cartão recusado → toast error
  // ------------------------------------------------------------------
  test('Cartão recusado → PENDING → CANCELED + toast error PT-BR', async ({ page }) => {
    const email = generateUniqueEmail('cardDeclined');
    const ctx = page.context() as BrowserContext;
    await createFounderUser(ctx, email);

    await page.goto(`${FRONTEND_URL}/checkout/payment/1`);

    await page.locator('[data-testid="payment-method-card"]').click();

    // Cartão que dispara recusa (número específico de teste)
    await page.locator('[data-testid="card-number"]').fill('4000000000000002');
    await page.locator('[data-testid="card-expiry"]').fill('12/25');
    await page.locator('[data-testid="card-cvv"]').fill('000');
    await page.locator('[data-testid="card-holder"]').fill('Recusado Teste');

    await page.locator('[data-testid="confirm-card-btn"]').click();

    // Toast de erro em PT-BR
    await expect(
      page.getByText(/cartão recusado|transação negada|pagamento não autorizado/i),
    ).toBeVisible({ timeout: 5000 });

    // Status final
    await expect(page.getByText('Pagamento recusado')).toBeVisible({ timeout: 5000 });
  });
});
