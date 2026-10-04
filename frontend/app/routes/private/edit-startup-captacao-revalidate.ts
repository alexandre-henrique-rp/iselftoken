export interface CaptacaoShouldRevalidateArgs {
  currentParams: Record<string, string | undefined>;
  nextParams: Record<string, string | undefined>;
  currentUrl: URL;
  nextUrl: URL;
  formMethod?: string;
  actionResult?: unknown;
}

/**
 * shouldRevalidate do layout `/founder/startups/:id/captacao`.
 *
 * Regras (ordem de avaliação):
 *  1. Muda `id` da startup → revalidar (outra startup = outro Campaign)
 *  2. Entra na aba Recursos (mudança de URL) → revalidar (precisa buscar
 *     os percentuais persistidos após save anterior)
 *  3. Revalidação manual (mesma URL + sem formMethod) → revalidar (BUG-FT-003)
 *  4. Form action POST bem-sucedido → revalidar (mutação refletida)
 *  5. Senão → não revalidar (otimização: troca de aba sem mutação = instantâneo)
 *
 * Extraído para arquivo separado para permitir teste unitário puro sem
 * carregar o módulo do layout (que importa Sidebar, ActionBar, etc).
 */
export function captacaoShouldRevalidate(
  args: CaptacaoShouldRevalidateArgs,
): boolean {
  const {
    currentParams,
    nextParams,
    currentUrl,
    nextUrl,
    formMethod,
    actionResult,
  } = args;

  // 1. Outra startup = outro Campaign
  if (currentParams.id !== nextParams.id) return true;

  // 2. Entrar em Recursos (precisa de percentuais frescos)
  if (
    nextUrl.pathname.endsWith("/captacao/recursos") &&
    currentUrl.pathname !== nextUrl.pathname
  ) {
    return true;
  }

  // 3. Revalidação manual (revalidator.revalidate() após save via fetch direto)
  const isManualRevalidation =
    !formMethod &&
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search === nextUrl.search;
  if (isManualRevalidation) return true;

  // 4. Form action POST: revalidar quando a action indicar sucesso
  //    (sem actionResult = assumir sucesso — fallback conservador).
  if (formMethod && formMethod !== "GET") {
    if (actionResult) {
      return !(actionResult as { error?: unknown }).error;
    }
    return true;
  }

  // 5. Default: não revalidar (otimização)
  return false;
}
