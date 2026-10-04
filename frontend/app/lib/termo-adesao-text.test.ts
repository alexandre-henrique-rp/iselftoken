import { describe, expect, it } from "vitest";
import { getTermoAdesaoText } from "~/lib/termo-adesao-text";

describe("getTermoAdesaoText", () => {
  it("escapa dados dinâmicos antes de interpolá-los no HTML", () => {
    const html = getTermoAdesaoText({
      founderName: '<img src=x onerror="alert(1)">',
      founderCpf: '" onmouseover="alert(1)',
      startupName: "Startup & Parceiros",
      startupCnpj: "<script>alert(1)</script>",
      data: "01/01/2026",
    });

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&quot; onmouseover=&quot;alert(1)");
    expect(html).toContain("Startup &amp; Parceiros");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("continua preenchendo placeholders legítimos", () => {
    const html = getTermoAdesaoText({
      founderName: "Maria Silva",
      startupName: "InovaTech",
    });

    expect(html).toContain("Maria Silva");
    expect(html).toContain("InovaTech");
  });
});
