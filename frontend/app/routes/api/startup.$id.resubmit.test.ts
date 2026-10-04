import { afterEach, describe, expect, it, vi } from "vitest";
import { action } from "./startup.$id.resubmit";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/startup/:id/resubmit", () => {
  it("encaminha a ressubmissão ao backend e preserva a resposta", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: false, data: { id: 3 } }), {
        status: 200,
      }),
    );

    const response = await action({
      request: new Request("http://localhost/api/startup/3/resubmit", {
        method: "POST",
        headers: { cookie: "session_id=session-123" },
      }),
      params: { id: "3" },
    } as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      error: false,
      data: { id: 3 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/startup/3/resubmit"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ cookie: "session_id=session-123" }),
      }),
    );
  });
});
