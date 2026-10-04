import { describe, expect, it } from "vitest";
import { sanitizeHtmlPreview } from "~/lib/sanitize-html";

describe("sanitizeHtmlPreview", () => {
  it("remove scripts, event handlers e protocolos perigosos", () => {
    const sanitized = sanitizeHtmlPreview(
      '<p>Seguro</p><img src=x onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">link</a>',
    );

    expect(sanitized).toContain("<p>Seguro</p>");
    expect(sanitized).not.toMatch(/script|onerror|javascript:/i);
  });

  it("preserva markup de email seguro", () => {
    const sanitized = sanitizeHtmlPreview(
      '<p><strong>Olá</strong></p><a href="https://iselftoken.com">Acessar</a>',
    );

    expect(sanitized).toContain("<strong>Olá</strong>");
    expect(sanitized).toContain('href="https://iselftoken.com"');
  });
});
