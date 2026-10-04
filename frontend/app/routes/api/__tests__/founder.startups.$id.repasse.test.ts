/**
 * Testes para founder.startups.$id.repasse.ts — BFF de Repasse de Fundos (B12).
 * Cobre validação de ID, propagação de cookie, métodos permitidos e proxies.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loader, action } from "~/routes/api/founder.startups.$id.repasse";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function makeOk(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function makeErr(status: number, body: object) {
  return {
    ok: false,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeGetReq(id: string, cookie = "session=abc") {
  return new Request(`http://localhost/api/founder/startups/${id}/repasse`, {
    headers: { cookie },
  });
}

function makePostReq(id: string, cookie = "session=abc") {
  return new Request(`http://localhost/api/founder/startups/${id}/repasse/initiate`, {
    method: "POST",
    headers: { cookie },
  });
}

describe("founder.startups.$id.repasse loader", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("retorna 400 quando ID ausente", async () => {
    const res = await loader({
      params: {},
      request: makeGetReq(""),
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(true);
  });

  it("proxia GET para o backend com cookie", async () => {
    fetchMock.mockResolvedValueOnce(makeOk({ data: { notafiscal: null, transfers: [], totalRaised: 0, transferStarted: false } }));
    await loader({
      params: { id: "42" },
      request: makeGetReq("42", "session=xyz"),
    } as any);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/founder/startups/42/repasse"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ cookie: "session=xyz" }),
      }),
    );
  });

  it("propaga body do backend com mesmo status", async () => {
    fetchMock.mockResolvedValueOnce(makeOk({ data: { foo: "bar" } }, 200));
    const res = await loader({
      params: { id: "42" },
      request: makeGetReq("42"),
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.foo).toBe("bar");
  });

  it("retorna erro amigável em 403/404", async () => {
    fetchMock.mockResolvedValueOnce(makeErr(403, { error: true, message: "forbidden" }));
    const res = await loader({
      params: { id: "99" },
      request: makeGetReq("99"),
    } as any);
    expect(res.status).toBe(403);
  });
});

describe("founder.startups.$id.repasse action", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("retorna 405 para método não permitido", async () => {
    const res = await action({
      params: { id: "42" },
      request: new Request("http://localhost", { method: "DELETE" }),
    } as any);
    expect(res.status).toBe(405);
  });

  it("retorna 400 quando ID ausente", async () => {
    const res = await action({
      params: {},
      request: makePostReq(""),
    } as any);
    expect(res.status).toBe(400);
  });

  it("proxia POST initiate para o backend com cookie", async () => {
    fetchMock.mockResolvedValueOnce(makeOk({ data: { notafiscal: { id: 1 }, transfers: [] } }, 201));
    await action({
      params: { id: "42" },
      request: makePostReq("42", "session=founder-1"),
    } as any);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/founder/startups/42/repasse/initiate"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ cookie: "session=founder-1" }),
      }),
    );
  });

  it("propaga status 201 quando NF criada", async () => {
    fetchMock.mockResolvedValueOnce(makeOk({ data: { ok: true } }, 201));
    const res = await action({
      params: { id: "42" },
      request: makePostReq("42"),
    } as any);
    expect(res.status).toBe(201);
  });
});