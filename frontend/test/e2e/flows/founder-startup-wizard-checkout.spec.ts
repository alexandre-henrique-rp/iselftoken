import type { BrowserContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { generateUniqueEmail } from "./setup/test-helpers";

const BACKEND_URL = "http://localhost:7077";
const FRONTEND_URL = "http://localhost:5173";
const TEST_EMAIL = generateUniqueEmail("e2eStartupWizard");

/**
 * E2E do wizard atual de /founder/startups/new.
 *
 * O teste mantém o teste inline legado em founder-dashboard-integration.spec.ts
 * e cobre separadamente o fluxo vigente até o resumo do checkout.
 */
test.describe("E2E - Founder startup wizard até checkout", () => {
  let setupContext: BrowserContext;
  let sessionId: string;

  test.beforeAll(async ({ browser }) => {
    setupContext = await browser.newContext();
    const response = await setupContext.request.post(
      `${BACKEND_URL}/auth/dev/create-admin`,
      {
        data: {
          email: TEST_EMAIL,
          nome: "Founder Wizard E2E",
          senha: "SenhaE2e1234!",
          telefone: "11987654321",
        },
      },
    );

    expect(response.status()).toBe(201);
    const body = await response.json();
    sessionId = body.data?.sessionId;
    expect(sessionId).toBeTruthy();
  });

  test.afterAll(async () => {
    await setupContext?.close();
  });

  test("preenche o wizard real e identifica a startup no checkout", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "session_id",
        value: sessionId,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);

    await page.goto(`${FRONTEND_URL}/founder/startups/new`);
    await expect(
      page.getByRole("heading", { name: "Informações da startup" }),
    ).toBeVisible();

    await page.locator("#nomeFantasia").fill("Wizard Acme Saúde");
    await page
      .locator("#razaoSocial")
      .fill("Wizard Acme Saúde Tecnologia Ltda");
    await page.locator("#cnpj").fill("12.345.678/0001-95");
    await page.locator("#dataAbertura").fill("10/12/2022");
    await page.locator("#estagio").selectOption("mvp");
    await page
      .locator("#descricao")
      .fill("Plataforma fictícia para validar o fluxo de cadastro de startup.");

    const category = page.locator("#categoryId");
    await expect(category).toBeVisible();
    await category.selectOption({ index: 1 });
    const area = page.locator("#areaAtuacaoId");
    await expect(area).toBeEnabled();
    await area.selectOption({ index: 1 });

    await page.getByRole("button", { name: "Próximo passo" }).click();
    await expect(
      page.getByRole("heading", { name: "Dados bancários" }),
    ).toBeVisible();
    await page.locator("#titular").fill("Founder Wizard E2E");
    await page.locator("#banco").selectOption({ index: 1 });
    await page.locator("#agencia").fill("0001");
    await page.locator("#conta").fill("12345");
    await page.locator("#digito").fill("6");

    await page.getByRole("button", { name: "Próximo passo" }).click();
    await expect(
      page.getByRole("heading", { name: "Configure sua captação e valuation" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Pagar reserva de tokens" }).click();
    await page.waitForURL(/\/checkout\/payment\/\d+/, { timeout: 30_000 });

    await expect(
      page.getByText("Reserva de token — Wizard Acme Saúde"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText("Taxa para iniciar o cadastro e a análise da startup."),
    ).toBeVisible();
    await expect(page.getByText("Token Nexus AI")).toHaveCount(0);
    await expect(
      page.getByText("Acesso à inteligência de mercado"),
    ).toHaveCount(0);
  });
});
