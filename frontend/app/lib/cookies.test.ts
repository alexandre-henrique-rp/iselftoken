import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCookie, setClientCookie, clearClientCookie } from "./cookies";

function makeRequest(cookieHeader: string | null): Request {
  const headers = new Headers();
  if (cookieHeader !== null) headers.set("cookie", cookieHeader);
  return new Request("http://localhost/", { headers });
}

describe("getCookie", () => {
  it("retorna null quando não há header cookie", () => {
    expect(getCookie(makeRequest(null), "remembered_email")).toBeNull();
  });

  it("retorna null quando o nome não está presente", () => {
    expect(getCookie(makeRequest("other=value"), "remembered_email")).toBeNull();
  });

  it("retorna o valor quando o cookie está presente", () => {
    expect(getCookie(makeRequest("remembered_email=foo@bar.com"), "remembered_email")).toBe(
      "foo@bar.com",
    );
  });

  it("decodifica valores URL-encoded", () => {
    expect(
      getCookie(makeRequest("remembered_email=foo%40bar.com"), "remembered_email"),
    ).toBe("foo@bar.com");
  });

  it("suporta múltiplos cookies na mesma header", () => {
    const header = "session=abc; remembered_email=user@empresa.com; theme=dark";
    expect(getCookie(makeRequest(header), "remembered_email")).toBe("user@empresa.com");
    expect(getCookie(makeRequest(header), "session")).toBe("abc");
    expect(getCookie(makeRequest(header), "theme")).toBe("dark");
  });

  it("não confunde prefixos similares", () => {
    expect(
      getCookie(makeRequest("remembered_email_v2=x; remembered_email=y"), "remembered_email"),
    ).toBe("y");
  });

  it("retorna string vazia quando o cookie existe sem valor", () => {
    expect(getCookie(makeRequest("remembered_email="), "remembered_email")).toBe("");
  });
});

describe("setClientCookie", () => {
  beforeEach(() => {
    document.cookie = "remembered_email=; Path=/; Max-Age=0; SameSite=Lax";
  });

  afterEach(() => {
    document.cookie = "remembered_email=; Path=/; Max-Age=0; SameSite=Lax";
  });

  it("grava cookie com Path, Max-Age=30 dias e SameSite=Lax por padrão", () => {
    const writeSpy = vi.spyOn(document, "cookie", "set");
    setClientCookie("remembered_email", "user@empresa.com");

    expect(writeSpy).toHaveBeenCalledWith(
      "remembered_email=user%40empresa.com; Path=/; Max-Age=2592000; SameSite=Lax",
    );
    writeSpy.mockRestore();
  });

  it("aceita maxAgeDays customizado", () => {
    const writeSpy = vi.spyOn(document, "cookie", "set");
    setClientCookie("remembered_email", "user@empresa.com", 7);

    expect(writeSpy).toHaveBeenCalledWith(
      "remembered_email=user%40empresa.com; Path=/; Max-Age=604800; SameSite=Lax",
    );
    writeSpy.mockRestore();
  });

  it("não faz nada em ambiente SSR (document undefined)", () => {
    const originalDocument = globalThis.document;
    delete (globalThis as { document?: Document }).document;

    expect(() => setClientCookie("remembered_email", "x")).not.toThrow();

    (globalThis as { document: Document }).document = originalDocument;
  });
});

describe("clearClientCookie", () => {
  it("remove cookie via Max-Age=0", () => {
    const writeSpy = vi.spyOn(document, "cookie", "set");
    clearClientCookie("remembered_email");

    expect(writeSpy).toHaveBeenCalledWith(
      "remembered_email=; Path=/; Max-Age=0; SameSite=Lax",
    );
    writeSpy.mockRestore();
  });

  it("não faz nada em ambiente SSR (document undefined)", () => {
    const originalDocument = globalThis.document;
    delete (globalThis as { document?: Document }).document;

    expect(() => clearClientCookie("remembered_email")).not.toThrow();

    (globalThis as { document: Document }).document = originalDocument;
  });
});
