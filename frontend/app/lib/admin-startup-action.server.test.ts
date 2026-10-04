import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminStartupAction } from "./admin-startup-action.server";
import { serverFetch } from "./server-fetch";

vi.mock("./server-fetch", () => ({
  serverFetch: vi.fn(),
}));

const serverFetchMock = vi.mocked(serverFetch);

function makeRequest(values: Record<string, string>) {
  return new Request("http://localhost/admin/startups", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
  });
}

describe("adminStartupAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aprova uma startup usando o BFF de status", async () => {
    serverFetchMock.mockResolvedValue(
      Response.json({ error: false, message: "Status atualizado" }),
    );

    const response = await adminStartupAction({
      request: makeRequest({ intent: "approve-startup", startupId: "42" }),
    } as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Status atualizado",
    });
    expect(serverFetchMock).toHaveBeenCalledWith(
      expect.any(Request),
      "/api/admin/startups/42/status",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ status: "APPROVED" }),
      }),
    );
  });

  it("recusa rejeição sem justificativa antes de chamar o backend", async () => {
    const response = await adminStartupAction({
      request: makeRequest({ intent: "reject-startup", startupId: "42" }),
    } as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Informe o motivo da rejeição.",
    });
    expect(serverFetchMock).not.toHaveBeenCalled();
  });

  it("separa edição cadastral e score em dois BFFs", async () => {
    serverFetchMock
      .mockResolvedValueOnce(Response.json({ error: false }))
      .mockResolvedValueOnce(Response.json({ error: false }));

    const response = await adminStartupAction({
      request: makeRequest({
        intent: "edit-startup",
        startupId: "42",
        nome: "Nova Startup",
        area_atuacao: "Fintech",
        estagio: "Seed",
        score: "87",
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(serverFetchMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Request),
      "/api/admin/startups/42",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          nome: "Nova Startup",
          area_atuacao: "Fintech",
          estagio: "Seed",
        }),
      }),
    );
    expect(serverFetchMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Request),
      "/api/admin/startups/42/score",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ score: 87 }),
      }),
    );
  });

  describe("intent=increment-score (ação 'Coroar')", () => {
    it("chama o BFF de incremento com delta positivo e reason opcional", async () => {
      serverFetchMock.mockResolvedValue(
        Response.json({ error: false, message: "Score incrementado" }),
      );

      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "15",
          reason: "Performance Q3 validada",
        }),
      } as never);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        message: "Score incrementado",
      });
      expect(serverFetchMock).toHaveBeenCalledWith(
        expect.any(Request),
        "/api/admin/startups/42/score/increment",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            delta: 15,
            reason: "Performance Q3 validada",
          }),
        }),
      );
    });

    it("omite reason do body quando vazio", async () => {
      serverFetchMock.mockResolvedValue(Response.json({ error: false }));

      await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "1",
          delta: "-5",
          reason: "",
        }),
      } as never);

      expect(serverFetchMock).toHaveBeenCalledWith(
        expect.any(Request),
        "/api/admin/startups/1/score/increment",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ delta: -5 }),
        }),
      );
    });

    it("rejeita delta = 0 antes de chamar o backend", async () => {
      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "0",
        }),
      } as never);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error:
          "Delta inválido. Use inteiro entre -100 e 100, diferente de 0.",
      });
      expect(serverFetchMock).not.toHaveBeenCalled();
    });

    it("rejeita delta > 100", async () => {
      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "150",
        }),
      } as never);

      expect(response.status).toBe(400);
      expect(serverFetchMock).not.toHaveBeenCalled();
    });

    it("rejeita delta < -100", async () => {
      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "-150",
        }),
      } as never);

      expect(response.status).toBe(400);
      expect(serverFetchMock).not.toHaveBeenCalled();
    });

    it("rejeita delta não-numérico", async () => {
      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "abc",
        }),
      } as never);

      expect(response.status).toBe(400);
      expect(serverFetchMock).not.toHaveBeenCalled();
    });

    it("propaga erro do backend (ex.: Fase 3 não aprovada → 403)", async () => {
      serverFetchMock.mockResolvedValue(
        Response.json(
          {
            error: true,
            message:
              "Score só pode ser incrementado após a aprovação da Fase 3.",
          },
          { status: 403 },
        ),
      );

      const response = await adminStartupAction({
        request: makeRequest({
          intent: "increment-score",
          startupId: "42",
          delta: "10",
        }),
      } as never);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error:
          "Score só pode ser incrementado após a aprovação da Fase 3.",
      });
    });
  });
});
