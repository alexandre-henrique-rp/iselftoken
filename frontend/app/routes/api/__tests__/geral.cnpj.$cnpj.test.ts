/**
 * Testes para geral.cnpj.$cnpj.ts — BFF de lookup de CNPJ.
 * Cobre validação de comprimento, propagação de cookie e tratamento de erro fetch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loader } from "~/routes/api/geral.cnpj.$cnpj";

// Mock do fetch global.
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function makeOkResponse(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function makeErrResponse(status: number, body: object) {
  return {
    ok: false,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeRequest(cnpj: string, cookie = "session=abc123") {
  return loader({
    params: { cnpj },
    request: new Request(`http://localhost/api/geral.cnpj.${cnpj}`, {
      headers: { cookie },
    }),
  } as any);
}

describe("geral.cnpj.$cnpj loader", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("deve retornar 400 quando chars.length !== 14", async () => {
    const res = await makeRequest("1234567890");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cnpj");
  });

  it("deve retornar 400 para CNPJ vazio", async () => {
    const res = await makeRequest("");
    expect(res.status).toBe(400);
  });

  it("deve propagar letras para BACKEND_URL no path (CNPJ alfanumérico)", async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({ data: { cnpj: "AB12C3DE45F600", razaoSocial: "Teste" } }));
    await makeRequest("AB.12C.3DE/45F6-00");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/geral/cnpj/AB12C3DE45F600"),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });

  it("deve repassar Cookie do request original", async () => {
    fetchMock.mockResolvedValueOnce(makeOkResponse({ data: {} }));
    await makeRequest("12.345.678/0001-90", "session=meu-token-xyz");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "session=meu-token-xyz" }),
      }),
    );
  });

  it("deve retornar 502 em caso de fetch failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));
    const res = await makeRequest("12.345.678/0001-90");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("deve propagar data do body em caso de sucesso", async () => {
    const upstreamData = { cnpj: "12345678000190", razaoSocial: "Empresa Exemplo SA", nomeFantasia: "Exemplo" };
    fetchMock.mockResolvedValueOnce(makeOkResponse({ data: upstreamData }));
    const res = await makeRequest("12.345.678/0001-90");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(upstreamData);
  });
});
