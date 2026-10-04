import { beforeEach, describe, expect, it, vi } from "vitest";
import { loader, action } from "./admin.email-templates";

const fetchMock = vi.fn();

describe("BFF /api/admin/email-templates", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("loader (GET)", () => {
    it("faz proxy para o backend e retorna lista de templates", async () => {
      const mockTemplates = [
        { id: "1", slug: "welcome", name: "Boas-vindas" },
      ];

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: mockTemplates }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const request = new Request("http://localhost/api/admin/email-templates", {
        headers: { cookie: "session_id=admin-token" },
      });

      const response = await loader({
        request,
        params: {},
        context: {},
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual(mockTemplates);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/email-templates"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ cookie: "session_id=admin-token" }),
        }),
      );
    });
  });

  describe("action (POST)", () => {
    it("retorna 405 se método não for POST", async () => {
      const request = new Request("http://localhost/api/admin/email-templates", {
        method: "GET",
      });

      const response = await action({
        request,
        params: {},
        context: {},
      } as any);

      expect(response.status).toBe(405);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("encaminha criação de novo template para o backend", async () => {
      const payload = {
        name: "Confirmação de Reserva",
        slug: "confirmacao-reserva",
        subject: "Sua reserva de tokens",
      };

      const mockCreated = {
        success: true,
        data: { id: "new-tpl", ...payload },
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(mockCreated), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const request = new Request("http://localhost/api/admin/email-templates", {
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

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(mockCreated);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/email-templates"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ cookie: "session_id=admin-token" }),
          body: JSON.stringify(payload),
        }),
      );
    });
  });
});
