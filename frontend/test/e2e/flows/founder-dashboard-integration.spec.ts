import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
} from "./setup/test-helpers";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:7077";

const TEST_EMAIL = generateUniqueEmail("e2eT023f");
const TEST_PASSWORD = generateValidPassword();

// Helpers de humanizacao
const HUMAN_DELAY_MIN = 80;
const HUMAN_DELAY_MAX = 250;
const HUMAN_DELAY_LONG = 400;
const TYPE_DELAY_MS = 60;

async function humanDelay(page: Page, ms = HUMAN_DELAY_MIN) {
  await page.waitForTimeout(
    ms + Math.random() * (HUMAN_DELAY_MAX - HUMAN_DELAY_MIN),
  );
}

async function humanType(page: Page, selector: string, value: string) {
  const el = page.locator(selector);
  await el.click();
  await page.waitForTimeout(HUMAN_DELAY_MIN + Math.random() * HUMAN_DELAY_MIN);
  await el.pressSequentially(value, { delay: TYPE_DELAY_MS });
  await humanDelay(page, HUMAN_DELAY_MIN);
}

async function humanClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.hover();
  await humanDelay(page, HUMAN_DELAY_MIN);
  await el.click();
  await humanDelay(page, HUMAN_DELAY_LONG);
}

/**
 * E2E: Founder Dashboard - Form Inline (T023)
 *
 * Fluxo:
 * 1. Setup: criar user ADMIN via endpoint dev (bypass de subscription)
 * 2. Login 2FA via UI
 * 3. Navegar para /founder/dashboard (ADMIN bypassa plano)
 * 4. Verificar que form inline "Cadastrar Nova Startup" esta visivel
 * 5. Preencher form com dados validos
 * 6. Submeter
 * 7. Verificar redirect para /checkout/payment/:id
 */
test.describe("E2E Real Flow - Founder Dashboard Inline Form (T023)", () => {
  let context: BrowserContext;
  let sessionCookieValue: string;
  let userId: number;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    // Criar user ADMIN via endpoint dev (bypass de subscription)
    const adminRes = await context.request.post(
      `${BACKEND_URL}/auth/dev/create-admin`,
      {
        data: {
          email: TEST_EMAIL,
          nome: "Joao Founder Test",
          senha: TEST_PASSWORD,
          telefone: generateValidPhone(),
        },
      },
    );
    console.log("[DEBUG create-admin] status:", adminRes.status());
    console.log("[DEBUG create-admin] body:", await adminRes.text());
    expect(adminRes.status()).toBe(201);
    const adminBody = await adminRes.json();
    const sessionId = adminBody.data?.sessionId;
    expect(sessionId).toBeDefined();
    sessionCookieValue = `session_id=${sessionId}`;
    userId = adminBody.data?.id;

    await context.addCookies([
      {
        name: "session_id",
        value: sessionId,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test("STEP 1: Form inline visivel no dashboard", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/founder/dashboard`);
    await page.waitForLoadState("networkidle");
    await humanDelay(page, HUMAN_DELAY_LONG);

    // Verificar que o titulo do form esta visivel
    const formToggle = page.getByText("Cadastrar Nova Startup");
    await expect(formToggle).toBeVisible({ timeout: 15_000 });
  });

  test("STEP 2: Abrir form, preencher e submeter", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/founder/dashboard`);
    await page.waitForLoadState("networkidle");
    await humanDelay(page, HUMAN_DELAY_LONG);

    // Clicar para abrir o form (collapse)
    await humanClick(page, 'button:has-text("Cadastrar Nova Startup")');
    await humanDelay(page, HUMAN_DELAY_LONG);

    // Preencher form (humanizado)
    await humanType(page, 'input[placeholder*="TechNova"]', "TechNova E2E");
    await humanType(page, 'input[placeholder*="00.000"]', "11.444.777/0001-61");

    // Selecionar area e estagio
    const areaSelect = page.locator("select").first();
    await areaSelect.selectOption("tecnologia_saas");
    const estagioSelect = page.locator("select").nth(1);
    await estagioSelect.selectOption("mvp");

    await humanType(
      page,
      "textarea",
      "Plataforma SaaS para automacao financeira de PMEs brasileiras.",
    );

    // Preencher dados bancarios
    await humanType(
      page,
      'input[placeholder*="TechNova"] >> nth=-1',
      "Joao Fundador",
    );
    // Submeter
    await humanClick(page, 'button:has-text("Cadastrar e Pagar Reserva")');

    // Esperar redirect para /checkout/payment/:id
    await page.waitForURL(/\/checkout\/payment\/\d+/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/checkout\/payment\/\d+/);

    // O resumo deve identificar a startup do draft, sem cair nos fallbacks
    // de assinatura que pertencem a outro propósito de pagamento.
    await expect(page.getByText("Reserva de token — TechNova E2E")).toBeVisible(
      {
        timeout: 15_000,
      },
    );
    await expect(
      page.getByText("Taxa para iniciar o cadastro e a análise da startup."),
    ).toBeVisible();
    await expect(page.getByText("Token Nexus AI")).toHaveCount(0);
    await expect(
      page.getByText("Acesso à inteligência de mercado"),
    ).toHaveCount(0);
  });
});
