import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  Outlet,
  type ShouldRevalidateFunction,
  useLoaderData,
} from "react-router";
import { Sidebar } from "~/components/layout/sidebar";
import { TopNavbar } from "~/components/layout/top-navbar";
import { ensureActivePlan, requireAuthorizedUser } from "~/lib/auth-policy";
import { authStatusQueryOptions, meQueryOptions } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard | iSelfToken" }];
}

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) => {
  // O layout já hidratou user/auth no SSR. Em navegações GET internas, os
  // BFFs continuam protegendo cada request; repetir auth/status + users/me
  // antes de cada rota cria um waterfall perceptível (ex.: Perfil → Dashboard).
  // Mutations continuam revalidando o layout para atualizar a sessão.
  if (!formMethod) return false;

  return defaultShouldRevalidate;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user, isAuthenticated, isAuthorized } =
    await requireAuthorizedUser(request);
  ensureActivePlan(user, new URL(request.url).pathname);

  const queryClient = createQueryClient();
  queryClient.setQueryData(authStatusQueryOptions.queryKey, {
    isAuthenticated,
    isAuthorized,
  });
  queryClient.setQueryData(meQueryOptions.queryKey, user);

  return { user, dehydratedState: dehydrate(queryClient) };
}

export default function Layout() {
  const { user, dehydratedState } = useLoaderData<typeof loader>();
  if (!user) {
    return null;
  }

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="bg-surface text-on-surface antialiased min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <TopNavbar />

        <main className="lg:ml-72 pt-28 pb-12 px-6 lg:px-12 min-h-screen relative bg-surface overflow-x-clip">
          <div className="absolute -bottom-10 right-0 pointer-events-none select-none text-[12vw] font-black leading-none tracking-tighter text-primary opacity-[0.02]">
            iSelfToken
          </div>

          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </HydrationBoundary>
  );
}
