/**
 * S6-T01 — Save handler consolidado no layout.
 *
 * Comportamento esperado:
 *  - Layout expoe um unico `setOnSave` que aceita 1 handler consolidado
 *  - Cada aba apenas REGISTRA valores via registerSectionGetValues
 *  - Save coleta TODOS os sectionValues no momento do clique
 *  - section unregister limpa valor (cleanup)
 *  - getAllSectionValues captura valor atual (nao referencia antiga)
 */

import { render } from "@testing-library/react";
import { act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { vi } from "vitest";
import {
  EditStartupFormProvider,
  useEditStartupForm,
} from "./edit-startup-form-context";

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useEditStartupForm>) => void }) {
  const api = useEditStartupForm();
  useEffect(() => {
    onReady(api);
  });
  return null;
}

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const ProbeHolder = ({
    onReady,
  }: {
    onReady: (api: ReturnType<typeof useEditStartupForm>) => void;
  }) => (
    <QueryClientProvider client={qc}>
      <EditStartupFormProvider>
        <Probe onReady={onReady} />
      </EditStartupFormProvider>
    </QueryClientProvider>
  );
  return ProbeHolder;
}

describe("EditStartupFormProvider — save consolidado (S6-T01)", () => {
  it("getAllSectionValues coleta TODOS os sections registrados", () => {
    let api!: ReturnType<typeof useEditStartupForm>;
    const Wrapper = makeWrapper();

    render(
      <Wrapper
        onReady={(a) => {
          api = a;
        }}
      />,
    );

    act(() => {
      api.registerSectionGetValues("corporate-identity", () => ({
        razaoSocial: "Empresa X",
        cnpj: "12345678000190",
      }));
      api.registerSectionGetValues("founders", () => ({
        members: [{ nome: "Fulano", cargo: "CEO", participacao: 100 }],
      }));
    });

    const all = api.getAllSectionValues();
    expect(all["corporate-identity"]).toEqual({
      razaoSocial: "Empresa X",
      cnpj: "12345678000190",
    });
    expect(all["founders"]).toEqual({
      members: [{ nome: "Fulano", cargo: "CEO", participacao: 100 }],
    });
  });

  it("setOnSave consolidado: hook expoe o handler mais recente", () => {
    let api!: ReturnType<typeof useEditStartupForm>;
    const Wrapper = makeWrapper();

    render(
      <Wrapper
        onReady={(a) => {
          api = a;
        }}
      />,
    );

    const unifiedSave = vi.fn();

    act(() => {
      api.setOnSave?.(unifiedSave);
    });

    expect(api.onSave).toBe(unifiedSave);
  });

  it("section unregister limpa valor", () => {
    let api!: ReturnType<typeof useEditStartupForm>;
    const Wrapper = makeWrapper();

    render(
      <Wrapper
        onReady={(a) => {
          api = a;
        }}
      />,
    );

    const getValues = () => ({ foo: "bar" });

    act(() => {
      api.registerSectionGetValues("section-x", getValues);
    });
    expect(api.getAllSectionValues()["section-x"]).toEqual({ foo: "bar" });

    act(() => {
      api.unregisterSectionGetValues("section-x");
    });
    expect(api.getAllSectionValues()["section-x"]).toBeUndefined();
  });

  it("getAllSectionValues captura valor atual (nao referencia)", () => {
    let api!: ReturnType<typeof useEditStartupForm>;
    const Wrapper = makeWrapper();

    render(
      <Wrapper
        onReady={(a) => {
          api = a;
        }}
      />,
    );

    let counter = 0;

    act(() => {
      api.registerSectionGetValues("counter", () => ({
        value: ++counter,
      }));
    });

    expect(api.getAllSectionValues()["counter"]).toEqual({ value: 1 });
    expect(api.getAllSectionValues()["counter"]).toEqual({ value: 2 });
  });
});