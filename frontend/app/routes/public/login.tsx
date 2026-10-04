import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "react-router";
import { LoginContainer } from "~/components/login/login-container";
import { LoginForm } from "~/components/login/login-form";
import { LoginHero } from "~/components/login/login-hero";
import { getCookie } from "~/lib/cookies";
import { landingPathForRole } from "~/lib/post-auth-redirect";
import { authStatusQueryOptions } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - iSelfToken" },
    {
      name: "description",
      content:
        "iSelfToken Crowdfunding - Plataforma inovadora de tokenização de equity.",
    },
    { name: "theme-color", content: "#0a0a0a" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();

  const statusRes = await serverFetch(request, "/api/auth/status");
  let authStatus = statusRes.ok
    ? ((await statusRes.json()) as {
        isAuthenticated: boolean;
        isAuthorized: boolean;
      })
    : { isAuthenticated: false, isAuthorized: false };

  // A rota privada exige que o status e a identidade sejam válidos. Aplicar a
  // mesma regra aqui impede o ciclo `/login` → `/home` → `/login` quando uma
  // sessão desatualizada ainda aparece como autorizada em `/auth/status`.
  if (authStatus.isAuthenticated && authStatus.isAuthorized) {
    const userRes = await serverFetch(request, "/api/users/me");
    const userPayload = userRes.ok
      ? await userRes.json().catch(() => null)
      : null;

    if (userPayload?.data) {
      // Role-aware landing: ADMIN/FINANCEIRO/COMPLIANCE → /admin/dashboard;
      // USER → /home. Helper único garante consistência com o fluxo de 2FA
      // e o client-side do LoginForm (post-auth-redirect).
      return redirect(landingPathForRole(userPayload.data.role));
    }

    authStatus = { isAuthenticated: false, isAuthorized: false };
  }

  queryClient.setQueryData(authStatusQueryOptions.queryKey, authStatus);

  if (authStatus.isAuthenticated && !authStatus.isAuthorized) {
    return redirect("/2fa");
  }

  const rememberedEmail = getCookie(request, "remembered_email") ?? "";

  return {
    dehydratedState: dehydrate(queryClient),
    rememberedEmail,
  };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { dehydratedState, rememberedEmail } = loaderData;

  return (
    <HydrationBoundary state={dehydratedState}>
      <LoginContainer
        hero={<LoginHero />}
        form={<LoginForm rememberedEmail={rememberedEmail} />}
      />
    </HydrationBoundary>
  );
}
