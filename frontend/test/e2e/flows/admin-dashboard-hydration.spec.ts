import { expect, test, type Page } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const ADMIN_EMAIL = "admin@iselftoken.com";
const ADMIN_PASSWORD = "@Lexandre230188";

async function loginAsAdmin(page: Page) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page
    .locator('input[name="email"], input[type="email"]')
    .fill(ADMIN_EMAIL);
  await page
    .locator(
      'input[name="senha"], input[name="password"], input[type="password"]',
    )
    .fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/2fa|\/home|\/admin/, { timeout: 15_000 });
  if (page.url().includes("/2fa")) {
    const code = await fetchCode();
    await page
      .locator('input[name="code"], input[type="text"]')
      .first()
      .fill(code);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home|\/admin|\/pricing/, { timeout: 15_000 });
  }
}

async function fetchCode(): Promise<string> {
  const res = await fetch("http://localhost:7077/api/auth/dev/2fa-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL }),
  });
  const json = await res.json().catch(() => ({}));
  return json?.data?.code ?? "000000";
}

test.describe("Admin Dashboard — SSR Hydration", () => {
  test("dashboard carrega com dados reais e sem request duplicado no cliente", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    let clientDashboardRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/admin/dashboard")) {
        clientDashboardRequests += 1;
      }
    });

    await page.goto(`${FRONTEND_URL}/admin/dashboard`, {
      waitUntil: "networkidle",
    });

    await expect(
      page.getByRole("heading", { name: /Financial.*Health/i }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("GMV", { exact: true })).toBeVisible();
    await expect(page.getByText("Usuários", { exact: true })).toBeVisible();
    await expect(page.getByText("Startups", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Campanhas abertas", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Tokens vendidos", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Saques pendentes", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Campanhas ativas", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("KYC em fila", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Tendência de gmv/i }),
    ).toBeVisible();

    expect(clientDashboardRequests).toBe(0);
  });

  test("redireciona para /login se nao autenticado", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
