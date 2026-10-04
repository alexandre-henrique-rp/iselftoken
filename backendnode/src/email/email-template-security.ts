/** Escapes values before inserting them into HTML content or attributes. */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SAFE_PROTOCOLS = new Set(['https:', 'http:']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Validates URLs used in email links before they are escaped for HTML.
 * HTTP is accepted only for local development; production links must use HTTPS.
 */
export function validateSafeUrl(value: unknown, fieldName = 'URL'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} inválida`);
  }

  const normalized = value.trim();
  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${fieldName} inválida`);
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`${fieldName} deve usar HTTPS`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${fieldName} não pode conter credenciais`);
  }

  if (parsed.protocol === 'http:' && !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(`${fieldName} HTTP só é permitido em ambiente local`);
  }

  return normalized;
}

/** Escapes a validated URL for safe insertion into an HTML attribute. */
export function escapeSafeUrl(value: unknown, fieldName = 'URL'): string {
  return escapeHtml(validateSafeUrl(value, fieldName));
}
