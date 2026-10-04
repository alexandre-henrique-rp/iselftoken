const REMEMBERED_EMAIL_MAX_AGE_DAYS = 30;

/**
 * Lê um cookie não-HTTP-only a partir de um `Request` (uso em loaders SSR).
 * Retorna `null` quando ausente.
 *
 * IMPORTANTE: usar apenas para cookies não-sensíveis definidos pelo frontend
 * (ex.: preferências de UI). Para tokens de sessão, sempre confiar nos cookies
 * HTTP-only setados pelo backend.
 */
export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  const target = `${name}=`;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

/**
 * Grava um cookie não-HTTP-only via `document.cookie`. Apenas client-side.
 * SameSite=Lax permite envio em navegações top-level (ex.: login redirect).
 */
export function setClientCookie(
  name: string,
  value: string,
  maxAgeDays: number = REMEMBERED_EMAIL_MAX_AGE_DAYS,
): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(maxAgeDays * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearClientCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
