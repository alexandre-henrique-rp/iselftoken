import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  EditStartupFormProvider,
  useEditStartupForm,
} from "~/lib/edit-startup-form-context";
import { EditStartupActionBar } from "~/components/founder/edit-startup-action-bar";
import { EditStartupSaveRegistrar } from "./edit-startup-layout";

// Simula uma seção que registra valores + marca o form como dirty (para a
// action bar ficar visível/clicável).
function FakeSection() {
  const { registerSectionGetValues, setDirtyCount } = useEditStartupForm();
  useEffect(() => {
    registerSectionGetValues("corporate-identity", () => ({
      values: { razaoSocial: "Nova Razão Social SA" },
      dirtyFields: { razaoSocial: true },
    }));
    setDirtyCount(1);
  }, [registerSectionGetValues, setDirtyCount]);
  return null;
}

function renderLayout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EditStartupFormProvider>
        <EditStartupSaveRegistrar startupId="1" />
        <FakeSection />
        <EditStartupActionBar />
      </EditStartupFormProvider>
    </QueryClientProvider>,
  );
}

describe("EditStartupSaveRegistrar — save consolidado (regressão)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registra onSave no provider e dispara PATCH ao clicar em Salvar", async () => {
    const fetchMock = vi.fn((...args: unknown[]) => {
      const url = args[0];
      if (typeof url === "string" && url.includes("/api/country")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ error: false, data: { id: 1 } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLayout();

    const saveBtn = await screen.findByRole("button", {
      name: /salvar alterações/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) => c[0] === "/api/startup/1"),
      ).toBe(true),
    );

    const patchCall = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/startup/1",
    )!;
    const init = patchCall[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.razao_social).toBe("Nova Razão Social SA");
  });

  it("envia SOMENTE campos alterados (dirty) — ignora campos preenchidos mas não modificados", async () => {
    const fetchMock = vi.fn((...args: unknown[]) => {
      const url = args[0];
      if (typeof url === "string" && url.includes("/api/country")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ error: false, data: { id: 1 } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Seção com vários campos preenchidos, mas só 'site' foi alterado.
    function DirtyOnlySite() {
      const { registerSectionGetValues, setDirtyCount } = useEditStartupForm();
      useEffect(() => {
        registerSectionGetValues("social-links", () => ({
          values: {
            site: "https://novo-site.com",
            linkedin: "https://linkedin.com/company/x",
            instagram: "@x",
          },
          dirtyFields: { site: true }, // apenas site foi mexido
        }));
        setDirtyCount(1);
      }, [registerSectionGetValues, setDirtyCount]);
      return null;
    }

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <EditStartupFormProvider>
          <EditStartupSaveRegistrar startupId="1" />
          <DirtyOnlySite />
          <EditStartupActionBar />
        </EditStartupFormProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /salvar alterações/i }),
    );

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === "/api/startup/1")).toBe(
        true,
      ),
    );

    const init = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/startup/1",
    )![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.site).toBe("https://novo-site.com");
    // linkedin/instagram não foram alterados → não devem ir no payload
    expect(body.redes_sociais).toBeUndefined();
    expect(Object.keys(body)).toEqual(["site"]);
  });
});
