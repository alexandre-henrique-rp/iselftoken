import { beforeEach, describe, expect, it, vi } from "vitest";
import { action } from "~/routes/api/admin.kyc.$id.decide";

const fetchMock = vi.fn();

function makeRequest(body: unknown, cookie = "session=admin") {
  return new Request("http://localhost/api/admin/kyc/123/decide", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("BFF admin KYC decision", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("rejeita decisão fora do contrato do endpoint admin", async () => {
    const response = await action({
      params: { id: "123" },
      request: makeRequest({ decision: "PENDING" }),
    } as any);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encaminha decisão, motivo e cookie ao backend admin", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: false, message: "KYC approved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await action({
      params: { id: "123" },
      request: makeRequest(
        {
          decision: "REJECTED",
          reason: "Documento incompatível com os dados informados",
        },
        "session=secure-admin",
      ),
    } as any);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/kyc/123/decide"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ cookie: "session=secure-admin" }),
        body: JSON.stringify({
          decision: "REJECTED",
          reason: "Documento incompatível com os dados informados",
        }),
      }),
    );
  });
});
