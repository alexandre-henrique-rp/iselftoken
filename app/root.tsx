import { ThemeProvider } from "next-themes";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { Toaster } from "~/components/ui/sonner";
import { AuthProvider, useAuth } from "~/context";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(() => {
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme ?? (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <Outlet />
      </AuthGate>
    </AuthProvider>
  );
}

/**
 * @name AuthGate
 * @description Renderiza um skeleton global enquanto o contexto de autenticação carrega.
 *
 * @param {object} props - Propriedades do componente
 * @param {React.ReactNode} props.children - conteúdo da aplicação
 *
 * @returns {JSX.Element} Componente com fallback de carregamento
 *
 * @example
 * // Uso interno do root
 * <AuthGate>
 *   <Outlet />
 * </AuthGate>
 *
 * Fluxo de execução:
 * 1. Le o estado de loading do contexto
 * 2. Exibe o skeleton global enquanto carrega
 * 3. Renderiza os filhos quando finalizado
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 flex-col gap-4 border-r p-4 md:flex">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-6 w-4/6" />
        <div className="mt-auto">
          <Skeleton className="h-10 w-full" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-3 md:hidden">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full md:col-span-2" />
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
