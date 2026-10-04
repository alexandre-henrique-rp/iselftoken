import type { BrowserContext, Page } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";

/**
 * Generates a unique email with timestamp + random suffix to avoid collision between runs.
 */
export function generateUniqueEmail(prefix = "e2eT020"): string {
  return `${prefix}+${Date.now()}+${Math.floor(Math.random() * 10000)}@example.com`;
}

/**
 * Returns a valid password for test users.
 * 11 chars, 1 uppercase, 1 lowercase, 1 number.
 */
export function generateValidPassword(): string {
  return "SenhaE2e1234!";
}

/**
 * Returns a valid Brazilian phone number (10 digits, no mask).
 */
export function generateValidPhone(): string {
  return "11987654321";
}

/**
 * Returns a valid CPF (mod 11 check passes).
 */
export function generateValidCpf(): string {
  return "52998224725";
}

/**
 * Captures the current 2FA code via the dev-only BFF endpoint.
 * The BFF proxies to backend GET /auth/dev/2fa-code which reads Redis.
 *
 * @param context - Playwright BrowserContext (contains cookies/session)
 * @returns 6-digit verification code string
 * @throws Error if request fails or code not found
 */
export async function captureTwoFactorCode(
  context: BrowserContext,
): Promise<string> {
  const res = await context.request.get(`${FRONTEND_URL}/api/auth/dev/2fa-code`);
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(
      `Falha ao capturar codigo 2FA: ${res.status()} ${text}`,
    );
  }
  const body = await res.json();
  if (body.error || !body.data?.code) {
    throw new Error(`Resposta invalida: ${JSON.stringify(body)}`);
  }
  return body.data.code as string;
}


const BACKEND_URL = "http://localhost:7077";

/**
 * Cria um usuário com assinatura FUNDADOR ACTIVE via API backend.
 * Retorna { sessionId, userId, subscriptionId, paymentId } para setup de testes.
 *
 * @param context - Playwright BrowserContext
 * @param email - Email único para o usuário
 * @param nome - Nome completo do usuário
 */
export async function createFounderUser(
  context: import("@playwright/test").BrowserContext,
  email: string,
  nome: string = "Joao Fundador",
): Promise<{
  sessionId: string;
  userId: number;
  subscriptionId: number;
  paymentId: number;
  cleanupIds: { subscriptionId: number; paymentId: number };
}> {
  const password = generateValidPassword();

  // 1. Registrar usuário
  const registerRes = await context.request.post(`${BACKEND_URL}/auth/register/user`, {
    data: {
      email,
      nome,
      senha: password,
      senhaConfirmacao: password,
      telefone: generateValidPhone(),
      termosAceitos: true,
      politicaAceita: true,
      codigo: "123456",
      urlRedirect: "http://localhost:5173/home",
    },
  });
  if (registerRes.status() !== 201) {
    throw new Error(`Falha ao registrar usuário: ${registerRes.status()}`);
  }
  const registerBody = await registerRes.json();
  const sessionId: string = registerBody.data?.sessionId;
  if (!sessionId) {
    throw new Error("sessionId não encontrado na resposta de registro");
  }

  // Adicionar cookie ao contexto
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

  const cookieHeader = `session_id=${sessionId}`;

  // 2. Buscar plano FUNDADOR
  const plansRes = await context.request.get(`${BACKEND_URL}/plans`, {
    headers: { cookie: cookieHeader },
  });
  if (plansRes.status() !== 200) {
    throw new Error(`Falha ao buscar planos: ${plansRes.status()}`);
  }
  const plans = await plansRes.json();
  const fundadorPlan = plans.data?.find(
    (p: any) => p.slug?.toLowerCase().includes("fundador"),
  );
  if (!fundadorPlan) {
    throw new Error("Plano FUNDADOR não encontrado");
  }
  const planId = fundadorPlan.id;
  const planPrice = Number(fundadorPlan.preco);

  // 3. Criar subscription PENDING
  const subRes = await context.request.post(`${BACKEND_URL}/subscriptions`, {
    headers: { cookie: cookieHeader },
    data: { planId, status: "PENDING" },
  });
  if (subRes.status() !== 201) {
    throw new Error(`Falha ao criar subscription: ${subRes.status()}`);
  }
  const subscriptionId: number = (await subRes.json()).data?.id;

  // 4. Criar payment SUBSCRIPTION
  const payRes = await context.request.post(`${BACKEND_URL}/payment`, {
    headers: { cookie: cookieHeader },
    data: {
      amount: planPrice,
      method: "PIX",
      purpose: "SUBSCRIPTION",
      subscriptionId,
    },
  });
  if (payRes.status() !== 201) {
    throw new Error(`Falha ao criar payment: ${payRes.status()}`);
  }
  const paymentId: number = (await payRes.json()).data?.id;

  // 5. Simular pagamento para ativar subscription
  const simRes = await context.request.post(
    `${BACKEND_URL}/payment/${paymentId}/dev/simulate-paid`,
    { headers: { cookie: cookieHeader } },
  );
  if (simRes.status() !== 201) {
    throw new Error(`Falha ao simular pagamento: ${simRes.status()}`);
  }

  // Capturar userId da sessão
  const meRes = await context.request.get(`${BACKEND_URL}/users/me`, {
    headers: { cookie: cookieHeader },
  });
  const userId: number = (await meRes.json())?.data?.id;

  return {
    sessionId,
    userId,
    subscriptionId,
    paymentId,
    cleanupIds: { subscriptionId, paymentId },
  };
}

// =============================================================================
// Helpers para Cupons e EFI (S11)
// =============================================================================

/**
 * Cria um cupom de teste via API backend.
 *
 * @param context - BrowserContext com cookie de ADMIN
 * @param opts - Opções do cupom
 */
export async function createCoupon(
  context: import('@playwright/test').BrowserContext,
  opts: {
    code?: string;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    active?: boolean;
    maxUses?: number;
    validFrom?: Date;
    validUntil?: Date;
    minPurchase?: number;
    adminSessionId: string;
  },
): Promise<{ id: number; code: string }> {
  const code = opts.code || `TEST${Date.now()}`.slice(-10);
  const res = await context.request.post(`${BACKEND_URL}/coupons`, {
    data: {
      code,
      discountType: opts.discountType || 'PERCENTAGE',
      discountValue: opts.discountValue || 20,
      active: opts.active !== false,
      maxUses: opts.maxUses || 10,
      validFrom: (opts.validFrom || new Date(Date.now() - 3600000)).toISOString(),
      validUntil: (opts.validUntil || new Date(Date.now() + 86400000)).toISOString(),
      minPurchase: opts.minPurchase || 0,
    },
    headers: { cookie: `session_id=${opts.adminSessionId}` },
  });
  if (res.status() !== 201) {
    throw new Error(`Falha ao criar cupom: ${res.status()}`);
  }
  const body = await res.json();
  return { id: body.data?.id, code };
}

/**
 * Aplica um cupom a um payment.
 *
 * @param context - BrowserContext com cookie de sessão
 * @param code - Código do cupom
 * @param paymentId - ID do payment
 * @param sessionId - Session ID do usuário
 */
export async function applyCoupon(
  context: import('@playwright/test').BrowserContext,
  code: string,
  paymentId: number,
  sessionId: string,
): Promise<void> {
  const res = await context.request.post(`${BACKEND_URL}/coupons/${code}/apply`, {
    data: { paymentId },
    headers: { cookie: `session_id=${sessionId}` },
  });
  if (!res.ok()) {
    const body = await res.json();
    throw new Error(`Falha ao aplicar cupom ${code}: ${res.status()} — ${JSON.stringify(body)}`);
  }
}

/**
 * Dispara webhook EFI mockado para simular pagamento.
 * O backend deve estar em modo EFI_MOCK ou apontando para o mock server.
 *
 * @param txid - Transaction ID do PIX
 * @param eventType - Tipo do evento (pix.received, card.paid, card.failed)
 */
export async function mockEfiWebhook(
  txid: string,
  eventType: 'pix.received' | 'card.paid' | 'card.failed',
): Promise<void> {
  // O mock server EFI é iniciado via docker compose no CI
  // Em dev, pode-se chamar o endpoint de simulação do backend diretamente
  await fetch('http://localhost:7077/payment/efi/mock-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txid, eventType }),
  }).catch(() => {
    // Silencioso — endpoint pode não existir em todos os ambientes
  });
}
