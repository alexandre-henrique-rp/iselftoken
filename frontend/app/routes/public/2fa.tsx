import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { redirect, useLoaderData } from "react-router";
import { AuthHero } from "~/components/auth/auth-hero";
import { TwoFactorForm } from "~/components/auth/two-factor-form";
import { LoginContainer } from "~/components/login/login-container";
import { landingPathForRole } from "~/lib/post-auth-redirect";
import { authStatusQueryOptions } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/2fa";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verificação de Segurança - iSelfToken" },
    {
      name: "description",
      content: "Segurança em duas etapas para sua conta iSelfToken.",
    },
  ];
}

// Validate session against the backend instead of trusting cookie names.
// Stale/invalid cookies could otherwise create redirect loops with the
// layout loader and /login.
export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();

  const statusRes = await serverFetch(request, "/api/auth/status");
  const authStatus = statusRes.ok
    ? ((await statusRes.json()) as {
        isAuthenticated: boolean;
        isAuthorized: boolean;
      })
    : { isAuthenticated: false, isAuthorized: false };

  queryClient.setQueryData(authStatusQueryOptions.queryKey, authStatus);

  if (!authStatus.isAuthenticated) return redirect("/login");
  if (authStatus.isAuthorized) {
    // Já passou pelo 2FA — aterrissa de acordo com o role.
    // ADMIN/FINANCEIRO/COMPLIANCE → /admin/dashboard; USER → /home.
    const userRes = await serverFetch(request, "/api/users/me");
    const userPayload = userRes.ok
      ? await userRes.json().catch(() => null)
      : null;
    const role = userPayload?.data?.role;
    if (role) return redirect(landingPathForRole(role));
    return redirect("/home");
  }

  // Authenticated but 2FA pending → render the 2FA form.
  return { showForm: true, dehydratedState: dehydrate(queryClient) };
}

// Auth redirect is handled by the layout route loader
// If user is not authenticated → redirect to /login
// If user needs 2FA → stay here, show form
// If user is already verified → layout redirects to /home
export default function TwoFactor() {
  const { dehydratedState } = useLoaderData<typeof loader>();



  return (
    <HydrationBoundary state={dehydratedState}>
      <LoginContainer
        hero={
          <AuthHero
            badgeText="Security Verification"
            title={
              <>
                Validação <br />
                <span className="text-primary drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">
                  em duas etapas.
                </span>
              </>
            }
            subtitle="Criptografia de Ponta"
            icon={ShieldCheck}
            footerText="Protocol Protocols Tier 1 Active"
          />
        }
        form={<TwoFactorForm />}
      />
    </HydrationBoundary>
  );
}
