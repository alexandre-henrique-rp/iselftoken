import { redirect } from "react-router";
import { serverFetch } from "~/lib/server-fetch";
import type { UserData } from "~/types/auth";

export const ADMIN_ROLES = ["ADMIN", "FINANCEIRO", "COMPLIANCE"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AuthSnapshot {
  user: UserData;
  isAuthenticated: true;
  isAuthorized: true;
}

const authSnapshots = new WeakMap<Request, Promise<AuthSnapshot>>();

export function requireAuthorizedUser(request: Request): Promise<AuthSnapshot> {
  const cached = authSnapshots.get(request);
  if (cached) return cached;

  const snapshot = authorizeRequest(request);
  authSnapshots.set(request, snapshot);
  return snapshot;
}

async function authorizeRequest(request: Request): Promise<AuthSnapshot> {
  const statusRes = await serverFetch(request, "/api/auth/status");
  if (!statusRes.ok) throw redirect("/login");

  const { isAuthenticated, isAuthorized } = (await statusRes.json()) as {
    isAuthenticated: boolean;
    isAuthorized: boolean;
  };

  if (!isAuthenticated) throw redirect("/login");
  if (!isAuthorized) throw redirect("/2fa");

  const userRes = await serverFetch(request, "/api/users/me");
  if (userRes.status === 401 || userRes.status === 403)
    throw redirect("/login");
  if (!userRes.ok) throw new Response("Failed to load user", { status: 502 });

  const { data: user } = (await userRes.json()) as { data: UserData };
  if (!user) throw redirect("/login");
  return { user, isAuthenticated: true, isAuthorized: true };
}

export function ensureActivePlan(
  user: UserData | undefined,
  pathname: string,
): void {
  if (!user) throw redirect("/login");
  if ((ADMIN_ROLES as readonly string[]).includes(user.role)) return;

  const paymentsEnabled = process.env.PAYMENTS_ENABLED !== "false";

  // Quando pagamentos estão desabilitados, bloquear acesso a pricing/checkout
  // e redirecionar usuários sem plano para manutenção
  if (!paymentsEnabled) {
    const hasActivePlan = (user.subscriptions ?? []).some(
      (sub) => sub.status === "ACTIVE" && sub.planId,
    );

    // Usuários com plano ativo passam normalmente
    if (hasActivePlan) return;

    // Bloquear pricing e checkout quando pagamentos desabilitados
    if (pathname === "/pricing" || pathname.startsWith("/checkout/")) {
      throw redirect("/manutencao");
    }

    // Usuários sem plano vão para manutenção (não para pricing)
    throw redirect("/manutencao");
  }

// Fluxo normal quando pagamentos estão habilitados
  // Exceções: rotas acessíveis SEM plano ativo.
  //   - /pricing     → escolher/comprar plano
  //   - /checkout/*  → concluir pagamento em curso
  //   - /profile e /profile/perfil → completar dados do perfil
  //     (KYC, endereço, dados pessoais) antes de assinar um plano. Sem
  //     isso o usuário ficaria preso em /pricing sem conseguir pagar
  //     (perfil incompleto bloqueia o checkout, ver card-payment-profile.ts).
  // O arquivo da rota continua sendo routes/private/perfil.tsx (legado).
  const isAllowedWithoutPlan =
    pathname === "/pricing" ||
    pathname === "/profile" ||
    pathname === "/profile" ||
    pathname.startsWith("/checkout/");
  if (isAllowedWithoutPlan) return;

  const hasActivePlan = (user.subscriptions ?? []).some(
    (sub) => sub.status === "ACTIVE" && sub.planId,
  );
  if (!hasActivePlan) throw redirect("/pricing");
}
