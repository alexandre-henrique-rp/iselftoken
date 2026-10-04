import { beforeEach, describe, expect, it, vi } from "vitest";
import { loader } from "./config.fundraising";

const fetchMock = vi.fn();

describe("BFF /api/config/fundraising", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("encaminha o cookie para a leitura operacional", async () => {
    const payload = {
      error: false,
      data: {
        authFeePerToken: 1,
        minCampaign: 300_000,
        maxCampaign: 12_000_000,
        equityMin: 5,
        equityMax: 20,
        tokenPrice: 200,
        fastTrackFee: 2_500,
      },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const response = await loader({
      request: new Request("http://localhost/api/config/fundraising", {
        headers: { cookie: "session_id=founder-session" },
      }),
      params: {},
      context: {},
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/config/fundraising"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          cookie: "session_id=founder-session",
        }),
      }),
    );
  });

  it("propaga 403 do backend sem mascarar autorização", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: true }), { status: 403 }),
    );

    const response = await loader({
      request: new Request("http://localhost/api/config/fundraising"),
      params: {},
      context: {},
    } as any);

    expect(response.status).toBe(403);
  });
});
