import { describe, expect, it } from "vitest";
import { captacaoShouldRevalidate } from "./edit-startup-captacao-revalidate";

/**
 * BUG-FT-003 (captação): o shouldRevalidate precisa permitir revalidate
 * manual após save (via fetch direto + revalidator.revalidate()), senão
 * o CaptacaoProgressRail continua mostrando dados stale mesmo após salvar.
 */
describe("captacaoShouldRevalidate", () => {
  const baseArgs = {
    currentParams: { id: "3" },
    nextParams: { id: "3" },
  };

  it("revalida quando muda id da startup", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        nextParams: { id: "9" },
        currentUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        nextUrl: new URL("http://x/founder/startups/9/captacao/retornos"),
        formMethod: undefined,
      }),
    ).toBe(true);
  });

  it("revalida ao entrar na aba Recursos (mudança de URL)", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        nextUrl: new URL("http://x/founder/startups/3/captacao/recursos"),
        formMethod: undefined,
      }),
    ).toBe(true);
  });

  it("NÃO revalida ao trocar entre abas comuns (otimização preservada)", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        nextUrl: new URL("http://x/founder/startups/3/captacao/tese"),
        formMethod: undefined,
      }),
    ).toBe(false);
  });

  it("revalida em form action POST bem-sucedido", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        nextUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        formMethod: "POST",
        actionResult: { ok: true },
      }),
    ).toBe(true);
  });

  it("NÃO revalida em navegação GET via Link", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL("http://x/founder/startups/3/captacao/tese"),
        nextUrl: new URL("http://x/founder/startups/3/captacao/governanca"),
        formMethod: "GET",
      }),
    ).toBe(false);
  });

  it("BUG-FT-003: revalida em revalidate manual (mesma URL, sem formMethod)", () => {
    const sameUrl = new URL("http://x/founder/startups/3/captacao/retornos");
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: sameUrl,
        nextUrl: sameUrl,
        formMethod: undefined,
      }),
    ).toBe(true);
  });

  it("BUG-FT-003: revalida em revalidate manual preservando search params", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL(
          "http://x/founder/startups/3/captacao/retornos?x=1",
        ),
        nextUrl: new URL(
          "http://x/founder/startups/3/captacao/retornos?x=1",
        ),
        formMethod: undefined,
      }),
    ).toBe(true);
  });

  it("NÃO revalida em POST com erro (actionResult.error truthy)", () => {
    expect(
      captacaoShouldRevalidate({
        ...baseArgs,
        currentUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        nextUrl: new URL("http://x/founder/startups/3/captacao/retornos"),
        formMethod: "POST",
        actionResult: { error: true, message: "fail" },
      }),
    ).toBe(false);
  });
});
