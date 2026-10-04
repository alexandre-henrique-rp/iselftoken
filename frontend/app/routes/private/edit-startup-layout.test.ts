import { describe, it, expect, vi } from "vitest";
import { loader } from "./edit-startup-layout";

/**
 * BUG-FT-010 — Defesa em profundidade do loader de `/founder/startups/:id/edit`.
 *
 * Sintoma original: ao navegar com `id` inválido (ex.: template literal
 * produzindo `undefined` em algum pai), a URL chegava como
 * `/founder/startups/undefined/edit/documentos` e a página renderizava
 * brevemente com `params.id === "undefined"` (string), porque o guard do
 * loader só bloqueava `!id` — e `"undefined"` é truthy.
 *
 * A página eventualmente cai no 404 + redirect da API, mas o flash de
 * render com id inválido é desnecessário e potencialmente expõe estado
 * intermediário (botões de ação, formulários).
 *
 * Fix mínimo: rejeitar `params.id === "undefined"` (string) e valores
 * vazios antes do fetch.
 */
describe("/founder/startups/:id/edit — loader (BUG-FT-010)", () => {
  function makeRequest(url: string): Request {
    return new Request(url);
  }

  function loaderFor(id: string | undefined) {
    return loader({
      // Calls: `*` evita o erro de tipo de `loader` ao receber params indefinido.
      params: { id } as any,
      request: makeRequest("http://localhost/founder/dashboard"),
    } as any);
  }

  // Faz com que `redirect()` retorne uma `Response` em vez de lançar,
  // permitindo asserir o destino via `.headers.get("Location")`.
  beforeEach(() => {
    if (!("__redirectInjected" in globalThis)) {
      // noop
    }
  });

  it("redirects para /founder/dashboard quando params.id é undefined", async () => {
    let capturedRedirect: Response | null = null;
    try {
      await loaderFor(undefined);
    } catch (e) {
      capturedRedirect = e as Response;
    }
    expect(capturedRedirect).not.toBeNull();
    expect((capturedRedirect as unknown as Response).headers.get("Location")).toBe(
      "/founder/dashboard",
    );
  });

  it("redirects quando params.id === 'undefined' (string)", async () => {
    // Cenário reproduzido: pai com template literal produziu `/.../${undefined}/...`
    // → React Router trata como string "undefined" → bypass do guard `!id`.
    let capturedRedirect: Response | null = null;
    try {
      await loaderFor("undefined");
    } catch (e) {
      capturedRedirect = e as Response;
    }
    expect(capturedRedirect).not.toBeNull();
    expect((capturedRedirect as unknown as Response).headers.get("Location")).toBe(
      "/founder/dashboard",
    );
  });

  it("redirects quando params.id === '' (vazio)", async () => {
    let capturedRedirect: Response | null = null;
    try {
      await loaderFor("");
    } catch (e) {
      capturedRedirect = e as Response;
    }
    expect(capturedRedirect).not.toBeNull();
  });
});