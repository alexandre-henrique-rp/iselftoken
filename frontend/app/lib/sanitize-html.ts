import DOMPurify from "dompurify";

/**
 * Sanitiza HTML editável antes de renderizá-lo em previews administrativos.
 * O preview é client-only; no SSR não há HTML confiável para renderizar.
 */
export function sanitizeHtmlPreview(html: string): string {
  if (typeof window === "undefined") return "";

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["base", "embed", "form", "iframe", "object", "script"],
    FORBID_ATTR: ["action", "formaction", "onerror", "onload"],
  });
}
