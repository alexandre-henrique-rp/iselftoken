import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StartupBranding } from "./startup-branding";
import type { SectionStatus } from "./_section-props";

/**
 * Regressão: upload de banner/logo é auto-persistente (PATCH direto em
 * /api/startup/:id). A seção NÃO pode reportar dirty>0 — senão a action bar
 * "Salvar alterações" acende e o save consolidado responde "Nenhuma
 * alteração para salvar" (branding não registra getValues).
 */
function renderBranding(reportStatus: (s: SectionStatus) => void) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <StartupBranding
        startup={{ id: 1, nome: "Startup Teste" }}
        reportStatus={reportStatus}
      />
    </QueryClientProvider>,
  );
}

function stubUploadAndPatch() {
  const fetchMock = vi.fn((...args: unknown[]) => {
    const url = String(args[0]);
    if (url.startsWith("/api/uploads")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: { data: { id: 42, publicId: "up-42", url_web: "https://cdn/x.webp" } },
        }),
      });
    }
    if (url === "/api/startup/1") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ error: false, data: { id: 1 } }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("StartupBranding — dirty state (regressão)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("persiste cover_id via PATCH direto e NUNCA reporta dirty>0", async () => {
    const fetchMock = stubUploadAndPatch();
    const statuses: SectionStatus[] = [];
    const { container } = renderBranding((s) => statuses.push(s));

    // input[0] = logo, input[1] = cover/banner
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBe(2);
    const coverInput = inputs[1] as HTMLInputElement;

    const file = new File(["img"], "banner.png", { type: "image/png" });
    fireEvent.change(coverInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === "/api/startup/1")).toBe(
        true,
      ),
    );

    const patchCall = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/startup/1",
    )!;
    const init = patchCall[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ cover_id: 42 });

    // Nenhum reportStatus pode ter dirty>0 — o upload já persistiu.
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((s) => s.id === "startup-branding")).toBe(true);
    expect(statuses.every((s) => s.dirty === 0)).toBe(true);
    // E o cover passa a contar como preenchido.
    expect(statuses.at(-1)?.filled).toBe(1);
  });
});
