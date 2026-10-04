import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./uploads.$id.status";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BFF GET /api/uploads/:id/status", () => {
  /** **Validates: Requirements 2.3, 3.1** */
  it("preserva o 200 e o motivo seguro de um upload FAILED", async () => {
    const upstream = {
      success: true,
      data: {
        id: 81,
        status: "FAILED",
        rejectionReason: "Não foi possível ler o arquivo enviado. Envie-o novamente.",
        url: null,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(upstream), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader({
      params: { id: "81" },
      request: new Request("http://localhost/api/uploads/81/status", {
        headers: { cookie: "session_id=owner-session" },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upstream);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/uploads/81/status"),
      expect.objectContaining({
        headers: { cookie: "session_id=owner-session" },
      }),
    );
  });

  it("rejeita um identificador ausente sem chamar o backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await loader({
      params: {},
      request: new Request("http://localhost/api/uploads//status"),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
