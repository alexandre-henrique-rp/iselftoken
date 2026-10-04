import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  EditStartupFormProvider,
  useEditStartupForm,
} from "~/lib/edit-startup-form-context";
import { CorporateIdentity } from "./corporate-identity";

const startup = {
  id: 1,
  nome: "TechInnovate",
  razao_social: "TechInnovate Soluções em IA Ltda",
  cnpj: "12.345.678/0001-90",
  estagio: "SERIES_A",
  pais: { iso3: "BRA", nome: "Brasil" },
  campaignStatus: "editing",
};

// Reproduz a página: seção populada pelo loader, registrada no provider.
// REGRESSÃO: se a página chamasse resetAllSections() no mount, os campos
// seriam zerados. Este teste garante que a população sobrevive.
function Page() {
  const { registerSectionReset } = useEditStartupForm();
  return (
    <CorporateIdentity
      startup={startup}
      reportStatus={() => {}}
      registerReset={registerSectionReset}
    />
  );
}

describe("Edit identidade — população sobrevive à montagem (regressão)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // StartupCascataSelect e SelectPais fazem useQuery (categories/country).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );
  });

  it("mantém razão social preenchida dentro do EditStartupFormProvider", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <EditStartupFormProvider>
          <Page />
        </EditStartupFormProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Razão Social") as HTMLInputElement).value,
      ).toBe("TechInnovate Soluções em IA Ltda");
    });

    // Garante que continua preenchido após ciclos de efeito (não é zerado)
    await new Promise((r) => setTimeout(r, 50));
    expect(
      (screen.getByLabelText("Razão Social") as HTMLInputElement).value,
    ).toBe("TechInnovate Soluções em IA Ltda");
  });
});
