/**
 * E2E — Cupons Admin (Playwright).
 * Escopo: Central de Cupons administrativa.
 */
import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { createFounderUser, generateUniqueEmail } from "./setup/test-helpers";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:7077";

async function openAsAdmin(page: Page, prefix: string) {
  const email = generateUniqueEmail(prefix);
  const context = page.context() as BrowserContext;
  const { sessionId } = await createFounderUser(context, email);

  await context.request.post(`${BACKEND_URL}/admin/users/role`, {
    data: { email, role: "ADMIN" },
    headers: { cookie: `session_id=${sessionId}` },
  });

  await page.goto(`${FRONTEND_URL}/central-cupons`);
  await expect(
    page.getByRole("heading", { name: "Central de cupons" }),
  ).toBeVisible();
}

async function createCoupon(page: Page, code: string, percent: string) {
  const form = page.getByRole("form", { name: "Gerador de cupom" });
  await form.getByLabel("Código").fill(code);
  await form.getByLabel("Desconto").selectOption(percent);
  await form.getByLabel("Limite de usos").fill("5");
  await form.getByLabel("Válido de").fill("2026-01-01");
  await form.getByLabel("Válido até").fill("2026-12-31");
  await form
    .getByLabel("Descrição interna")
    .fill("Campanha administrativa de teste");
  await form.getByRole("button", { name: "Gerar cupom" }).click();
  await expect(
    page.getByText(new RegExp(`Cupom ${code} criado com sucesso`, "i")),
  ).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
}

test.describe("Cupons Admin — Central de Cupons", () => {
  test("ADMIN cria cupom 30% com sucesso", async ({ page }) => {
    await openAsAdmin(page, "adminCoupon");
    await createCoupon(page, `ADMIN30${Date.now()}`.slice(-16), "30");
  });

  test("ADMIN cria cupom 100% com sucesso", async ({ page }) => {
    await openAsAdmin(page, "adminCoupon100");
    await createCoupon(page, `CORTESIA${Date.now()}`.slice(-16), "100");
  });

  test("ADMIN lista cupons e aplica filtro de status", async ({ page }) => {
    await openAsAdmin(page, "adminList");
    await createCoupon(page, `LISTA${Date.now()}`.slice(-16), "50");

    const list = page.getByRole("region", { name: "Lista de cupons" });
    await expect(list).toBeVisible();
    await list.getByLabel("Filtrar por status").selectOption("active");
    await expect(list.getByLabel("Filtrar por status")).toHaveValue("active");
    await list.getByLabel("Filtrar por status").selectOption("all");
  });

  test("ADMIN desativa cupom e exibe status inativo", async ({ page }) => {
    await openAsAdmin(page, "adminDesativar");
    const code = `DESATIV${Date.now()}`.slice(-16);
    await createCoupon(page, code, "50");

    await page.getByRole("button", { name: `Desativar cupom ${code}` }).click();
    await expect(
      page.getByText(new RegExp(`Cupom ${code} desativado`, "i")),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Ativar cupom ${code}` }),
    ).toBeVisible();
  });
});
