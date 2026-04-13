import { Separator } from "@radix-ui/react-separator";
import { Outlet, redirect } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import type { User } from "~/types/user";
import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ISelfToken" },
    { name: "description", content: "Em rumo ao proximo Unicórnio" },
  ];
}

/**
 * Protege rotas privadas verificando a sessão no backend.
 * Redireciona para /login quando não autenticado.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasSession = cookieHeader.includes("session_id");

  if (!hasSession) {
    throw redirect("/login");
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const response = await fetch(`${baseUrl}/api/user/me`, {
    headers: { Cookie: cookieHeader },
  });

  if (!response.ok) {
    throw redirect("/login");
  }

  const data = await response.json();

  if (data?.redirect) {
    throw redirect(data.redirect);
  }

  const user = data.data ?? data ?? null;

  if (!user) {
    throw redirect("/login");
  }

  return { user };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user: loaderUser } = loaderData as { user: User };
  const user = loaderUser;
  
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/home">
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Marketplace</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
