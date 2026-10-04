/**
 * Catch-all para `/.well-known/*` (Chrome DevTools, app manifests, etc.).
 *
 * O Chrome DevTools faz request automática para
 * `/.well-known/appspecific/com.chrome.devtools.json` quando inspeciona a
 * página. Sem este catch-all o React Router loga um 404 e dispara o
 * ErrorBoundary a cada navegação.
 *
 * Retornamos um JSON vazio (200) que é o payload esperado pelo Chrome.
 */
export async function loader() {
  return Response.json(
    {},
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}