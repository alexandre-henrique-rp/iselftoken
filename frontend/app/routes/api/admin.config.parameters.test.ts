import { beforeEach, describe, expect, it, vi } from "vitest";
import { action, loader } from "./admin.config.parameters";

const fetchMock = vi.fn();

describe("BFF /api/admin/config/parameters", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("loader (GET)", () => {
    it("faz proxy para o backend com cookie e retorna lista de parâmetros", async () => {
      const mockBackendResponse = {
        error: false,
        message: "Parâmetros retornados",
        data: [
          {
            key: "platformFee",
            label: "Taxa da Plataforma",
            group: "Taxas",
            unit: "PERCENT",
            default: 0.05,
            currentValue: 0.05,
            currentEffectiveFrom: "2026-01-01T00:00:00.000Z",
            scheduled: null,
            history: [],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockBackendResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const request = new Request("http://localhost/api/admin/config/parameters", {
        headers: { cookie: "session_id=test-session-123" },
      });

      const response = await loader({
        request,
        params: {},
        context: {},
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockBackendResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/config/parameters"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            cookie: "session_id=test-session-123",
          }),
        }),
      );
    });
  });

  describe("action (POST)", () => {
    it("retorna 405 se método não for POST", async () => {
      const request = new Request("http://localhost/api/admin/config/parameters", {
        method: "PUT",
      });

      const response = await action({
        request,
        params: {},
        context: {},
      } as any);

      expect(response.status).toBe(405);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("encaminha payload de criação/agendamento para o backend", async () => {
      const payload = {
        key: "platformFee",
        value: 0.08,
        effectiveFrom: "2026-12-01T00:00:00.000Z",
        note: "Reajuste",
      };

      const mockResult = {
        error: false,
        message: "Configuração atualizada com sucesso",
        data: { id: 1, ...payload },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const request = new Request("http://localhost/api/admin/config/parameters", {
        method: "POST",
        headers: {
          cookie: "session_id=admin-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = await action({
        request,
        params: {},
        context: {},
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockResult);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/config/parameters"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            cookie: "session_id=admin-token",
          }),
          body: JSON.stringify(payload),
        }),
      );
    });
  });
});
