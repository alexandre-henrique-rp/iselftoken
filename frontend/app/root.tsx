import { useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteError,
  Link,
} from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import type { Route } from "./+types/root";
import { GlobalLoading } from "~/components/ui/global-loading";
import { ToastContainer } from "~/components/ui/toast";
import { ToastProvider } from "~/context/ToastContext";
import { createQueryClient } from "~/lib/query-client";
import "./app.css";

export const links: Route.LinksFunction = () => [];

const ERROR_ROUTES = ["/401", "/404", "/500"];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isErrorPage = ERROR_ROUTES.includes(pathname);
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {!isErrorPage && <GlobalLoading />}
        <ToastContainer />
        <Toaster richColors position="top-right" theme="dark" />
        <Outlet />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // Log error for debugging
  console.error("ErrorBoundary caught:", error);

  // Check if this is a redirect (status 302/301) by looking at the error type
  const isRedirect = isRouteErrorResponse(error) && (error.status === 302 || error.status === 301);

  // For redirects, just navigate to the location
  if (isRedirect && error.data instanceof URL) {
    const redirectUrl = error.data.toString();
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Redirecionando...</p>
          <a href={redirectUrl} className="text-primary hover:underline">Clique aqui se não for redirecionado</a>
        </div>
      </div>
    );
  }

  // Handle route error responses
  if (isRouteErrorResponse(error)) {
    const status = error.status;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-black text-primary mb-4">{status}</h1>
          <p className="text-muted-foreground mb-6">{error.statusText || "Erro"}</p>
          <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  // For other errors
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-black text-primary mb-4">Erro</h1>
        <p className="text-muted-foreground mb-6">Algo deu errado</p>
        <p className="text-xs text-muted-foreground mb-4">{String(error)}</p>
        <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
      </div>
    </div>
  );
}
