/**
 * E2E Playwright -- Visibilidade de botoes no card de startup do /founder/dashboard.
 *
 * Cobre a regra de negocio documentada em CASE.md na secao
 * `[Painel do Fundador]` -- pipeline: o `campaignStatus` retornado por
 * `GET /api/founder/dashboard` governa quais CTAs aparecem em cada card.
 *
 * Estrategia:
 * - Login via dev endpoint /auth/dev/create-admin (cobertura BFFs transparente).
 * - Manipulacao direta no MySQL via `docker exec` para forcar cada campaignStatus
 *   no seed TechInnovate (id=1). Cada `test()` muda status -> testa -> restaura em
 *   afterEach para garantir idempotencia entre runs.
 *
 * Statuses cobertos (transicoes criticas da CASE.md):
 *   - OPEN       -> Ver investidores visivel, Transparencia oculto
 *   - FUNDED     -> Transparencia oculta (sem repasse liberado), Nova Rodada visivel, Ver investidores oculto
 *   - PAID_OUT   -> Transparencia oculta (sem repasse liberado), Ver investidores oculto
 *   - CLOSED     -> ambos ocultos (regra critica CASE.md)
 *   - DRAFT      -> Editar Captacao visivel
 *   - PAUSED     -> Ver investidores oculto, Financeiro visivel
 *
 * NOTA: Transparencia e Solicitar Parcela dependem de `repasseConfigurado`
 * (Repasse CONFIGURED pelo Admin na gestão de repasse). Estes cenários apenas
 * mudam `Campaign.status` (sem configurar repasse), então ambos ficam ocultos.
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  captureTwoFactorCode,
} from "./setup/test-helpers";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:7077";
const MYSQL_CONTAINER = "fintech_mysql";
const DB_USER = "dev";
const DB_PASS = "changeme";
const DB_NAME = "fintech_db";
const TECHINNOVATE_CAMPAIGN_ID = 1;
const ORIGINAL_OPEN_DEADLINE = "2026-12-31 23:59:59";

const TEST_EMAIL = generateUniqueEmail("e2ePAINEL");
const TEST_PASSWORD = generateValidPassword();

// Crases em volta de nomes de tabela sao problematicas em aspas duplas do bash
// (interpretadas como subshell command substitution). Estrategia: passa o SQL
// via stdin (sem -e), eliminando totalmente o problema de escape.
const CAMPAIGN_TABLE = "`Campaign`";

function mysqlExec(sql: string): string {
  const cmd = `docker exec -i ${MYSQL_CONTAINER} mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`;
  const result = execSync(cmd, { encoding: "utf8", input: sql });
  return result.trim();
}

function setCampaignStatus(status: string): void {
  mysqlExec(
    `UPDATE ${CAMPAIGN_TABLE} SET status='${status}' WHERE id=${TECHINNOVATE_CAMPAIGN_ID};`,
  );
}

function restoreCampaign(): void {
  // Volta para OPEN com deadline futuro (estado pos-implementacao do seed).
  mysqlExec(
    `UPDATE ${CAMPAIGN_TABLE} SET status='OPEN', deadline='${ORIGINAL_OPEN_DEADLINE}' WHERE id=${TECHINNOVATE_CAMPAIGN_ID};`,
  );
}

async function humanDelay(page: Page, ms = 100) {
  await page.waitForTimeout(ms + Math.random() * 150);
}

test.describe("E2E Painel do Fundador -- visibilidade de botoes por campaignStatus", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();

    // Registra user USER (cria sessionId + cookie) + completa 2FA.
    // O user ADMIN via dev/create-admin quebra o dashboard (faltam
    // subscriptions/plan -- ui tenta `.filter` em null). User USER com
    // subscription e' o caminho real usado por fundadores.
    const registerRes = await context.request.post(
      `${BACKEND_URL}/auth/register/user`,
      {
        data: {
          email: TEST_EMAIL,
          nome: "Painel Fundador Test",
          senha: TEST_PASSWORD,
          senhaConfirmacao: TEST_PASSWORD,
          telefone: generateValidPhone(),
          termosAceitos: true,
          politicaAceita: true,
          codigo: "123456",
          urlRedirect: "http://localhost:5173/home",
        },
      },
    );
    expect(registerRes.status(), `register deveria retornar 201: ${await registerRes.text()}`).toBe(201);
    const registerBody = await registerRes.json();
    const sessionId = registerBody?.data?.sessionId;
    expect(sessionId, "sessionId ausente").toBeTruthy();

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

    page = await context.newPage();

    // Fluxo 2FA completo: UI + capturador dev
    await page.goto(`${FRONTEND_URL}/2fa`);
    await page.waitForLoadState("networkidle");
    const code = await captureTwoFactorCode(context);
    expect(code).toMatch(/^\d{6}$/);
    const inputs = page.locator('input[inputmode="numeric"]');
    const count = await inputs.count();
    expect(count, `Esperava 6 inputs OTP, encontrou ${count}`).toBe(6);
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(code[i]);
    }
    await page.getByRole("button", { name: /verificar/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/2fa"), {
      timeout: 15_000,
    });

    // O user recem-criado NAO tem subscription -- sem ela, layout loader
    // joga para /pricing via ensureActivePlan (auth-policy.ts:34-44).
    // Para o spec chegar ao /founder/dashboard, criamos uma subscription
    // direta no DB (status=ACTIVE, 6 anos) -- espelha o seed do founder.
    const newUser = registerBody?.data?.id;
    expect(newUser, "user id ausente").toBeTruthy();

    const planIdRow = execSync(
      `docker exec -i fintech_mysql mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`,
      { encoding: "utf8", input: "SELECT id FROM plans WHERE slug LIKE 'plano-fundador' LIMIT 1;" },
    ).trim();
    const planId = Number(planIdRow);
    if (!planId) {
      throw new Error("Plano plano-fundador nao encontrado no DB");
    }
    const expiresAt = new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    execSync(
      `docker exec -i fintech_mysql mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`,
      {
        encoding: "utf8",
        input: `INSERT INTO Subscription (userId, planId, status, startedAt, expiresAt, createdAt, updatedAt) VALUES (${newUser}, ${planId}, 'ACTIVE', NOW(), '${expiresAt}', NOW(), NOW());`,
      },
    );

    // Atribui a TechInnovate (id=1) como startup do user -- assim o
    // dashboard mostra a campanha com todos os 6 status para validar.
    execSync(
      `docker exec -i fintech_mysql mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`,
      {
        encoding: "utf8",
        input: `UPDATE startups SET founderId=${newUser} WHERE id=1;`,
      },
    );

    // A sessao Redis foi cacheada ANTES da subscription ser inserida.
    // Invalida para forcar refetch do DB (cache sessionService.getByUserId
    // -> user.subscriptions -- sem invalidacao, o frontend ve `[]`).
    // Chave Redis = session:<userId> (repare: o parametro `userId` em
    // SessionService.createSession e' enganosamente nomeado, mas a key
    // usa o sessionId UUID passado -- entao deletamos TODAS as chaves
    // session:* deste user). Como delete por valor exigiria scan completo,
    // pedimos via backend: chamada explicita ao endpoint de logout->login
    // forcaria refresh. Forma mais simples: deletar com base no publicId
    // recente -- mas nao temos o sessionId aqui. Solucao: invalida TODAS
    // as sessoes via chamada ao endpoint interno (nao ha). Alternativa
    // segura para spec dev: trocar o cookie de sessao re-logando o user.
    const loginRes = await context.request.post(`${BACKEND_URL}/auth`, {
      data: {
        email: TEST_EMAIL,
        senha: TEST_PASSWORD,
      },
    });
    expect(loginRes.status(), `re-login deveria 200: ${await loginRes.text()}`).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody?.data?.requiresVerification,
      "esperava requiresVerification=true para gerar codigo 2FA").toBe(true);
    const newSessionId = loginBody?.data?.sessionId;
    expect(newSessionId).toBeTruthy();

    await context.addCookies([
      {
        name: "session_id",
        value: newSessionId,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);

    // Completa 2FA com novo sessionId
    const code2 = await captureTwoFactorCode(context);
    expect(code2).toMatch(/^\d{6}$/);
    await page.goto(`${FRONTEND_URL}/2fa`);
    await page.waitForLoadState("networkidle");
    const inputs2 = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await inputs2.nth(i).fill(code2[i]);
    }
    await page.getByRole("button", { name: /verificar/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/2fa"), {
      timeout: 15_000,
    });
  });

  test.afterAll(async () => {
    restoreCampaign();
    await context?.close();
  });

  test.afterEach(async () => {
    // Garante estado limpo entre cenarios mesmo se o test falhar mid-flight.
    restoreCampaign();
  });

  async function assertCardPresent(): Promise<void> {
    await page.goto(`${FRONTEND_URL}/founder/dashboard`);
    await page.waitForLoadState("networkidle");
    await humanDelay(page, 400);
    await expect(page.getByText("TechInnovate").first()).toBeVisible({
      timeout: 15_000,
    });
  }

  // Cenarios de visibilidade por status. Cada teste:
  //   1. Ajusta status via SQL direto.
  //   2. Recarrega /founder/dashboard.
  //   3. Valida presenca/ausencia dos botoes esperados para o status.
  //   4. afterEach restaura OPEN.

  test("OPEN: Ver investidores visivel, Transparencia oculto", async () => {
    setCampaignStatus("OPEN");
    await assertCardPresent();

    // Ver investidores (aria-label="Ver investidores") -- REGRA CASE.md
    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toBeVisible();

    // Transparencia (aria-label="Transparencia") -- ainda nao houve captacao concluida
    await expect(
      page.getByRole("link", { name: "Transparencia" }),
    ).toHaveCount(0);

    // Editar sempre presente
    await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  });

  test("FUNDED (sem repasse liberado): Transparencia oculta, Nova Rodada visivel, Ver investidores oculto", async () => {
    setCampaignStatus("FUNDED");
    await assertCardPresent();

    // REGRA CASE.md [Painel do Fundador]: Transparencia só aparece quando o
    // Admin LIBERA as parcelas na gestão de repasse (Repasse CONFIGURED).
    // Este cenário apenas muda o status da campanha (sem repasse configurado),
    // então a Transparencia permanece OCULTA.
    await expect(
      page.getByRole("link", { name: "Transparencia" }),
    ).toHaveCount(0);

    // REGRA CASE.md: Nova Rodada so aparece em FUNDED (regra B05).
    await expect(page.getByRole("link", { name: "Nova Rodada" })).toBeVisible();

    // Ver investidores NAO aparece (captacao encerrada, nao recebendo aportes).
    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toHaveCount(0);

    // Tooltip descreve a restricao da Regra B05.
    await expect(
      page.getByRole("link", { name: "Nova Rodada" }),
    ).toHaveAttribute(
      "title",
      "Iniciar nova rodada (apos carencia de 3 meses)",
    );
  });

  test("PAID_OUT (sem repasse liberado): Transparencia oculta, Nova Rodada oculto", async () => {
    // PAID_OUT e o estado terminal de repasse. Sem Repasse CONFIGURED a
    // Transparencia permanece oculta (nova regra CASE.md). Nova Rodada é
    // exclusiva de FUNDED.
    setCampaignStatus("PAID_OUT");
    await assertCardPresent();

    await expect(
      page.getByRole("link", { name: "Transparencia" }),
    ).toHaveCount(0);

    // PAID_OUT NAO dispara Nova Rodada (regra: so FUNDED -> new round).
    await expect(
      page.getByRole("link", { name: "Nova Rodada" }),
    ).toHaveCount(0);

    // Ver investidores continua oculto.
    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toHaveCount(0);
  });

  test("CLOSED (captacao encerrada sem bater meta): ambos ocultos -- regra critica CASE.md", async () => {
    // REGRA CASE.md: CLOSED = sem repasse/dividendos/motivo para relato formal.
    setCampaignStatus("CLOSED");
    await assertCardPresent();

    await expect(
      page.getByRole("link", { name: "Transparencia" }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toHaveCount(0);

    // Financeiro aparece (gestao pos-captacao).
    await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();
  });

  test("DRAFT: Editar Captacao visivel, Ver investidores + Transparencia ocultos", async () => {
    setCampaignStatus("DRAFT");
    await assertCardPresent();

    // REGRA CASE.md: Editar Captacao apenas em DRAFT.
    await expect(
      page.getByRole("link", { name: "Editar Captação" }),
    ).toBeVisible();

    // Nao ha investidores ainda -> Ver investidores oculto.
    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toHaveCount(0);

    // Sem captacao concluida -> Transparencia oculto.
    await expect(
      page.getByRole("link", { name: "Transparencia" }),
    ).toHaveCount(0);
  });

  test("PAUSED: Ver investidores oculto, Financeiro visivel", async () => {
    // Campanha pausada: nao esta recebendo novos aportes, mas nao foi encerrada.
    // Verifica que o gating principal (Ver investidores = OPEN) se mantem.
    setCampaignStatus("PAUSED");
    await assertCardPresent();

    await expect(
      page.getByRole("link", { name: "Ver investidores" }),
    ).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();

    // Status "Pausada" deve aparecer no pill do card.
    await expect(page.getByText("Pausada").first()).toBeVisible();
  });

  test("invariante: Edit (cadastral) sempre visivel em qualquer status", async () => {
    for (const status of ["OPEN", "FUNDED", "CLOSED", "DRAFT", "PAID_OUT"]) {
      setCampaignStatus(status);
      await assertCardPresent();
      await expect(
        page.getByRole("link", { name: "Editar" }),
        `Editar deveria estar visivel para status=${status}`,
      ).toBeVisible();
    }
  });
});
