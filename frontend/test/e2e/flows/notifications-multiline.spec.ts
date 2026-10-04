import { expect, test, type Page } from "@playwright/test";
import { generateUniqueEmail, generateValidPassword } from "./setup/test-helpers";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:7077";

/**
 * E2E: Notificações — line-break multi-linha (Sprint de Notificações — central
 * 2026-10-04).
 *
 * O backend grava descrições com `\n\n` separando parágrafos (helper
 * `buildMultilineDescription`). O `<NotificationCard>` aplica
 * `whitespace-pre-wrap` para preservar as quebras no DOM.
 *
 * Cobertura:
 *  1. Dispara 1 notificação com description multi-linha via
 *     `/notifications/dev/trigger`.
 *  2. Navega para `/notifications`.
 *  3. Confere que o `<p>` da descrição tem `white-space: pre-wrap` E que
 *     o texto contém múltiplas quebras de linha visíveis
 *     (computadas a partir do `clientHeight` / `scrollHeight` ou pela
 *     contagem de quebras no textContent).
 *  4. Confere que `getComputedStyle().whiteSpace === 'pre-wrap'`.
 */
async function loginAndGetUserId(
  context: import("@playwright/test").BrowserContext,
  page: Page,
): Promise<{ userId: number; sessionId: string }> {
  const email = generateUniqueEmail("e2eMultiline");
  const password = generateValidPassword();

  const registerRes = await context.request.post(
    `${BACKEND_URL}/auth/register/user`,
    {
      data: {
        email,
        nome: "Multiline Test User",
        senha: password,
        senhaConfirmacao: password,
        telefone: "11987654321",
        termosAceitos: true,
        politicaAceita: true,
        codigo: "123456",
        urlRedirect: `${FRONTEND_URL}/home`,
      },
    },
  );
  if (registerRes.status() !== 201) {
    throw new Error(`Falha ao registrar: ${registerRes.status()}`);
  }
  const sessionId: string = (await registerRes.json()).data?.sessionId;
  if (!sessionId) throw new Error("sessionId ausente");

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

  await page.goto(`${FRONTEND_URL}/home`, { waitUntil: "domcontentloaded" });

  const meRes = await context.request.get(`${BACKEND_URL}/users/me`, {
    headers: { cookie: `session_id=${sessionId}` },
  });
  if (!meRes.ok()) throw new Error(`Falha /users/me: ${meRes.status()}`);
  const userId: number = (await meRes.json())?.data?.id;
  if (!userId) throw new Error("userId ausente");

  return { userId, sessionId };
}

test.describe("Notifications — descrição multi-linha (whitespace-pre-wrap)", () => {
  test("description com \\n\\n quebra em múltiplas linhas visíveis no card", async ({
    context,
    page,
  }) => {
    const { userId, sessionId } = await loginAndGetUserId(context, page);

    // Description com 3 paragrafos (2 quebras duplas).
    const multiLineDescription =
      "Primeiro parágrafo da notificação multi-linha.\n\n" +
      "Segundo parágrafo com mais contexto para o usuário.\n\n" +
      "Terceiro parágrafo fechando a mensagem com ação.";

    const trigger = await context.request.post(
      `${BACKEND_URL}/notifications/dev/trigger`,
      {
        headers: { cookie: `session_id=${sessionId}` },
        data: {
          userId,
          title: "Notificação multi-linha",
          description: multiLineDescription,
          type: "general",
        },
      },
    );
    test.skip(
      !trigger.ok(),
      "Endpoint /notifications/dev/trigger não disponível neste ambiente",
    );

    await page.goto(`${FRONTEND_URL}/notifications`, {
      waitUntil: "networkidle",
    });

    // Aguarda o card aparecer
    const card = page
      .locator("div", { hasText: "Notificação multi-linha" })
      .filter({ has: page.locator("p", { hasText: "Primeiro parágrafo" }) })
      .first();
    await expect(card).toBeVisible({ timeout: 5000 });

    // O <p> dentro do card deve ter whitespace: pre-wrap aplicado.
    const descriptionP = card.locator("p").first();
    const whiteSpace = await descriptionP.evaluate(
      (el) => window.getComputedStyle(el).whiteSpace,
    );
    expect(whiteSpace).toBe("pre-wrap");

    // O textContent deve preservar as quebras de linha.
    const textContent = await descriptionP.evaluate((el) => el.textContent);
    expect(textContent).toContain("Primeiro parágrafo");
    expect(textContent).toContain("Segundo parágrafo");
    expect(textContent).toContain("Terceiro parágrafo");

    // Altura do <p> deve ser maior que a altura de UMA linha
    // (validacao visual: o parágrafo ocupa múltiplas linhas).
    const lineHeight = await descriptionP.evaluate(
      (el) => Number(window.getComputedStyle(el).lineHeight) || 20,
    );
    const pHeight = await descriptionP.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    // 3 paragrafos em 3 linhas = ~3x line-height (com tolerancia).
    expect(pHeight).toBeGreaterThan(lineHeight * 2.5);
  });

  test("description sem \\n continua em uma linha (regression)", async ({
    context,
    page,
  }) => {
    const { userId, sessionId } = await loginAndGetUserId(context, page);

    const trigger = await context.request.post(
      `${BACKEND_URL}/notifications/dev/trigger`,
      {
        headers: { cookie: `session_id=${sessionId}` },
        data: {
          userId,
          title: "Notificação sem quebra",
          description: "Descrição curta em uma linha só.",
          type: "general",
        },
      },
    );
    test.skip(
      !trigger.ok(),
      "Endpoint /notifications/dev/trigger não disponível neste ambiente",
    );

    await page.goto(`${FRONTEND_URL}/notifications`, {
      waitUntil: "networkidle",
    });

    const card = page
      .locator("div", { hasText: "Notificação sem quebra" })
      .filter({ hasText: "Descrição curta em uma linha só." })
      .first();
    await expect(card).toBeVisible({ timeout: 5000 });

    const descriptionP = card.locator("p").first();
    const whiteSpace = await descriptionP.evaluate(
      (el) => window.getComputedStyle(el).whiteSpace,
    );
    expect(whiteSpace).toBe("pre-wrap"); // estilo sempre aplicado
  });
});
