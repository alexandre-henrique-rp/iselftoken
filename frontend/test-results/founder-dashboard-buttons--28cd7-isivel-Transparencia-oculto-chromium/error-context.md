# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: founder-dashboard-buttons-visibility.spec.ts >> E2E Painel do Fundador -- visibilidade de botoes por campaignStatus >> OPEN: Ver investidores visivel, Transparencia oculto
- Location: test/e2e/flows/founder-dashboard-buttons-visibility.spec.ts:250:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/kingdev/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     pnpm exec playwright install                           ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```

```
Error: Command failed: docker exec -i fintech_mysql mysql -udev -pchangeme fintech_db -N -B
Error response from daemon: No such container: fintech_mysql

```

# Test source

```ts
  1   | /**
  2   |  * E2E Playwright -- Visibilidade de botoes no card de startup do /founder/dashboard.
  3   |  *
  4   |  * Cobre a regra de negocio documentada em CASE.md na secao
  5   |  * `[Painel do Fundador]` -- pipeline: o `campaignStatus` retornado por
  6   |  * `GET /api/founder/dashboard` governa quais CTAs aparecem em cada card.
  7   |  *
  8   |  * Estrategia:
  9   |  * - Login via dev endpoint /auth/dev/create-admin (cobertura BFFs transparente).
  10  |  * - Manipulacao direta no MySQL via `docker exec` para forcar cada campaignStatus
  11  |  *   no seed TechInnovate (id=1). Cada `test()` muda status -> testa -> restaura em
  12  |  *   afterEach para garantir idempotencia entre runs.
  13  |  *
  14  |  * Statuses cobertos (transicoes criticas da CASE.md):
  15  |  *   - OPEN       -> Ver investidores visivel, Transparencia oculto
  16  |  *   - FUNDED     -> Transparencia oculta (sem repasse liberado), Nova Rodada visivel, Ver investidores oculto
  17  |  *   - PAID_OUT   -> Transparencia oculta (sem repasse liberado), Ver investidores oculto
  18  |  *   - CLOSED     -> ambos ocultos (regra critica CASE.md)
  19  |  *   - DRAFT      -> Editar Captacao visivel
  20  |  *   - PAUSED     -> Ver investidores oculto, Financeiro visivel
  21  |  *
  22  |  * NOTA: Transparencia e Solicitar Parcela dependem de `repasseConfigurado`
  23  |  * (Repasse CONFIGURED pelo Admin na gestão de repasse). Estes cenários apenas
  24  |  * mudam `Campaign.status` (sem configurar repasse), então ambos ficam ocultos.
  25  |  */
  26  | 
  27  | import { test, expect, type BrowserContext, type Page } from "@playwright/test";
  28  | import { execSync } from "node:child_process";
  29  | import {
  30  |   generateUniqueEmail,
  31  |   generateValidPassword,
  32  |   generateValidPhone,
  33  |   captureTwoFactorCode,
  34  | } from "./setup/test-helpers";
  35  | 
  36  | const FRONTEND_URL = "http://localhost:5173";
  37  | const BACKEND_URL = "http://localhost:7077";
  38  | const MYSQL_CONTAINER = "fintech_mysql";
  39  | const DB_USER = "dev";
  40  | const DB_PASS = "changeme";
  41  | const DB_NAME = "fintech_db";
  42  | const TECHINNOVATE_CAMPAIGN_ID = 1;
  43  | const ORIGINAL_OPEN_DEADLINE = "2026-12-31 23:59:59";
  44  | 
  45  | const TEST_EMAIL = generateUniqueEmail("e2ePAINEL");
  46  | const TEST_PASSWORD = generateValidPassword();
  47  | 
  48  | // Crases em volta de nomes de tabela sao problematicas em aspas duplas do bash
  49  | // (interpretadas como subshell command substitution). Estrategia: passa o SQL
  50  | // via stdin (sem -e), eliminando totalmente o problema de escape.
  51  | const CAMPAIGN_TABLE = "`Campaign`";
  52  | 
  53  | function mysqlExec(sql: string): string {
  54  |   const cmd = `docker exec -i ${MYSQL_CONTAINER} mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`;
> 55  |   const result = execSync(cmd, { encoding: "utf8", input: sql });
      |                  ^ Error: Command failed: docker exec -i fintech_mysql mysql -udev -pchangeme fintech_db -N -B
  56  |   return result.trim();
  57  | }
  58  | 
  59  | function setCampaignStatus(status: string): void {
  60  |   mysqlExec(
  61  |     `UPDATE ${CAMPAIGN_TABLE} SET status='${status}' WHERE id=${TECHINNOVATE_CAMPAIGN_ID};`,
  62  |   );
  63  | }
  64  | 
  65  | function restoreCampaign(): void {
  66  |   // Volta para OPEN com deadline futuro (estado pos-implementacao do seed).
  67  |   mysqlExec(
  68  |     `UPDATE ${CAMPAIGN_TABLE} SET status='OPEN', deadline='${ORIGINAL_OPEN_DEADLINE}' WHERE id=${TECHINNOVATE_CAMPAIGN_ID};`,
  69  |   );
  70  | }
  71  | 
  72  | async function humanDelay(page: Page, ms = 100) {
  73  |   await page.waitForTimeout(ms + Math.random() * 150);
  74  | }
  75  | 
  76  | test.describe("E2E Painel do Fundador -- visibilidade de botoes por campaignStatus", () => {
  77  |   let context: BrowserContext;
  78  |   let page: Page;
  79  | 
  80  |   test.beforeAll(async ({ browser }) => {
  81  |     context = await browser.newContext();
  82  | 
  83  |     // Registra user USER (cria sessionId + cookie) + completa 2FA.
  84  |     // O user ADMIN via dev/create-admin quebra o dashboard (faltam
  85  |     // subscriptions/plan -- ui tenta `.filter` em null). User USER com
  86  |     // subscription e' o caminho real usado por fundadores.
  87  |     const registerRes = await context.request.post(
  88  |       `${BACKEND_URL}/auth/register/user`,
  89  |       {
  90  |         data: {
  91  |           email: TEST_EMAIL,
  92  |           nome: "Painel Fundador Test",
  93  |           senha: TEST_PASSWORD,
  94  |           senhaConfirmacao: TEST_PASSWORD,
  95  |           telefone: generateValidPhone(),
  96  |           termosAceitos: true,
  97  |           politicaAceita: true,
  98  |           codigo: "123456",
  99  |           urlRedirect: "http://localhost:5173/home",
  100 |         },
  101 |       },
  102 |     );
  103 |     expect(registerRes.status(), `register deveria retornar 201: ${await registerRes.text()}`).toBe(201);
  104 |     const registerBody = await registerRes.json();
  105 |     const sessionId = registerBody?.data?.sessionId;
  106 |     expect(sessionId, "sessionId ausente").toBeTruthy();
  107 | 
  108 |     await context.addCookies([
  109 |       {
  110 |         name: "session_id",
  111 |         value: sessionId,
  112 |         domain: "localhost",
  113 |         path: "/",
  114 |         httpOnly: true,
  115 |         sameSite: "Strict",
  116 |       },
  117 |     ]);
  118 | 
  119 |     page = await context.newPage();
  120 | 
  121 |     // Fluxo 2FA completo: UI + capturador dev
  122 |     await page.goto(`${FRONTEND_URL}/2fa`);
  123 |     await page.waitForLoadState("networkidle");
  124 |     const code = await captureTwoFactorCode(context);
  125 |     expect(code).toMatch(/^\d{6}$/);
  126 |     const inputs = page.locator('input[inputmode="numeric"]');
  127 |     const count = await inputs.count();
  128 |     expect(count, `Esperava 6 inputs OTP, encontrou ${count}`).toBe(6);
  129 |     for (let i = 0; i < 6; i++) {
  130 |       await inputs.nth(i).fill(code[i]);
  131 |     }
  132 |     await page.getByRole("button", { name: /verificar/i }).click();
  133 |     await page.waitForURL((url) => !url.pathname.startsWith("/2fa"), {
  134 |       timeout: 15_000,
  135 |     });
  136 | 
  137 |     // O user recem-criado NAO tem subscription -- sem ela, layout loader
  138 |     // joga para /pricing via ensureActivePlan (auth-policy.ts:34-44).
  139 |     // Para o spec chegar ao /founder/dashboard, criamos uma subscription
  140 |     // direta no DB (status=ACTIVE, 6 anos) -- espelha o seed do founder.
  141 |     const newUser = registerBody?.data?.id;
  142 |     expect(newUser, "user id ausente").toBeTruthy();
  143 | 
  144 |     const planIdRow = execSync(
  145 |       `docker exec -i fintech_mysql mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} -N -B`,
  146 |       { encoding: "utf8", input: "SELECT id FROM plans WHERE slug LIKE 'plano-fundador' LIMIT 1;" },
  147 |     ).trim();
  148 |     const planId = Number(planIdRow);
  149 |     if (!planId) {
  150 |       throw new Error("Plano plano-fundador nao encontrado no DB");
  151 |     }
  152 |     const expiresAt = new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000)
  153 |       .toISOString()
  154 |       .slice(0, 19)
  155 |       .replace("T", " ");
```