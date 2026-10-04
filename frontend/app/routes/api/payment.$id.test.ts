import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./payment.$id";

function loaderArgs(cookie = "session_id=owner-session") {
  return {
    request: new Request("http://localhost/api/payment/1", {
      headers: cookie ? { cookie } : undefined,
    }),
    params: { id: "1" },
  } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BFF GET /api/payment/:id", () => {
  it("preserva cookie, status/envelope e normaliza aliases do plano e contexto completo", async () => {
    const upstream = {
      error: false,
      message: "Pagamento encontrado",
      codigo: 200,
      data: {
        id: 1,
        purpose: "TOKEN_RESERVATION",
        subscription: {
          plan: {
            nome: "Fundador",
            descricao: "Plano anual",
            slug: "fundador",
          },
        },
        reservationContext: {
          kind: "STARTUP_RESERVATION",
          displayName: "  Acme Saúde  ",
          nameSource: "PERSISTED_STARTUP",
          startup: {
            slug: " acme-saude ",
            displayName: " Acme Saúde ",
          },
          campaign: { title: " Rodada Seed " },
        },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(upstream), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      error: false,
      message: "Pagamento encontrado",
      codigo: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/payment/1"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          cookie: "session_id=owner-session",
        }),
      }),
    );
    expect(body.data.subscription.plan).toMatchObject({
      name: "Fundador",
      description: "Plano anual",
      slug: "fundador",
    });
    expect(body.data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: "Acme Saúde",
      nameSource: "PERSISTED_STARTUP",
      startup: { slug: "acme-saude", displayName: "Acme Saúde" },
      campaign: { title: "Rodada Seed" },
    });
  });

  it("não mistura startup persistida com nome de draft durante a normalização", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "Nome do draft",
              nameSource: "DRAFT_PAYLOAD",
              startup: {
                slug: "startup-persistida",
                displayName: "Nome do draft",
              },
              campaign: null,
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: "Nome do draft",
      nameSource: "DRAFT_PAYLOAD",
      startup: null,
      campaign: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("zera nome e startup quando a fonte é NONE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "Nome não autorizado",
              nameSource: "LEGACY_UNKNOWN",
              startup: {
                slug: "startup-nao-autorizada",
                displayName: "Nome não autorizado",
              },
              campaign: { title: "Rodada Seed" },
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: null,
      nameSource: "NONE",
      startup: null,
      campaign: { title: "Rodada Seed" },
    });
  });

  it("usa a identidade da startup persistida quando o displayName recebido diverge", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "Nome do draft",
              nameSource: "PERSISTED_STARTUP",
              startup: {
                slug: "acme-saude",
                displayName: "Acme Saúde",
              },
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: "Acme Saúde",
      nameSource: "PERSISTED_STARTUP",
      startup: { slug: "acme-saude", displayName: "Acme Saúde" },
      campaign: null,
    });
  });

  it("zera a identidade persistida quando não há startup coerente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "Nome solto",
              nameSource: "PERSISTED_STARTUP",
              startup: null,
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: null,
      nameSource: "NONE",
      startup: null,
      campaign: null,
    });
  });

  it("normaliza DRAFT_PAYLOAD sem displayName coerente para NONE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "   ",
              nameSource: "DRAFT_PAYLOAD",
              startup: null,
              campaign: { title: "Rodada Seed" },
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: null,
      nameSource: "NONE",
      startup: null,
      campaign: { title: "Rodada Seed" },
    });
  });

  it("mantém DRAFT_PAYLOAD somente quando há identidade comercial", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: false,
          data: {
            purpose: "TOKEN_RESERVATION",
            reservationContext: {
              kind: "STARTUP_RESERVATION",
              displayName: "  Acme Saúde  ",
              nameSource: "DRAFT_PAYLOAD",
              startup: { slug: "nao-deve-aparecer", displayName: "Acme Saúde" },
              campaign: null,
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect((await response.json()).data.reservationContext).toEqual({
      kind: "STARTUP_RESERVATION",
      displayName: "Acme Saúde",
      nameSource: "DRAFT_PAYLOAD",
      startup: null,
      campaign: null,
    });
  });

  it("representa contexto ausente como null e não aceita contexto em assinatura", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: false,
            data: {
              purpose: "SUBSCRIPTION",
              reservationContext: {
                kind: "STARTUP_RESERVATION",
                displayName: "Não deve aparecer",
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: false, data: { purpose: "INVESTMENT" } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const subscriptionResponse = await loader(loaderArgs());
    const investmentResponse = await loader(loaderArgs());

    expect(
      (await subscriptionResponse.json()).data.reservationContext,
    ).toBeNull();
    expect(
      (await investmentResponse.json()).data.reservationContext,
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserva erro e envelope upstream, sem chamada secundária", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: true,
          message: "Pagamento não encontrado",
          codigo: 404,
          data: null,
        }),
        { status: 404 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader(loaderArgs());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: true,
      message: "Pagamento não encontrado",
      codigo: 404,
      data: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 400 sem id e não acessa o backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader({
      request: new Request("http://localhost/api/payment/"),
      params: {},
    } as never);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
