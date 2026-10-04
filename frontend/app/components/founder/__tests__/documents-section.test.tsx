import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DocumentsSection,
  type DocumentNARow,
} from "../documents-section";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("~/hooks/use-file-validation", () => ({
  validateFile: vi.fn(() => ({ ok: true })),
}));

function renderSection(
  props: Partial<React.ComponentProps<typeof DocumentsSection>> = {},
) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentsSection
        startupId={1}
        documents={[]}
        naoSeAplica={[]}
        compliance={{ required: 6, present: 0, missing: [] }}
        onChange={() => {}}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("DocumentsSection — limite do textarea 'Não se aplica'", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  // ─── BUG-FT-006: textarea da justificativa do N/A deve aceitar no
  // ─── máximo 1000 caracteres (mesmo limite do backend via HttpException).

  it("campo de justificativa tem maxLength=1000 (limite canônico do backend)", async () => {
    const naoSeAplica: DocumentNARow[] = [
      {
        id: 1,
        categoria: "PITCH_DECK",
        justificativa: "texto curto",
        reviewStatus: "PENDING_REVIEW",
      },
    ];
    renderSection({ naoSeAplica });

    // Abre o painel "Não se aplica" — clicar em "Desfazate" ou similar
    // Expõe o textarea. Como o DocSlot já abre o panel quando há N/A
    // (naOpen inicial = isNaoSeAplica = true), basta procurar o textarea.
    await waitFor(() => {
      const textarea = document.querySelector(
        "textarea",
      ) as HTMLTextAreaElement | null;
      expect(textarea).not.toBeNull();
      expect(textarea?.getAttribute("maxLength")).toBe("1000");
    });
  });

  it("contador de caracteres exibe contagem atual e total (X/1000)", async () => {
    const naoSeAplica: DocumentNARow[] = [
      {
        id: 1,
        categoria: "PITCH_DECK",
        justificativa: "",
        reviewStatus: "PENDING_REVIEW",
      },
    ];
    renderSection({ naoSeAplica });

    const textarea = document.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();

    // Inicialmente mostra 0/1000
    expect(screen.getByText(/0\s*\/\s*1000/)).toBeInTheDocument();

    // Digitar atualiza o contador
    fireEvent.change(textarea!, { target: { value: "abc" } });
    expect(screen.getByText(/3\s*\/\s*1000/)).toBeInTheDocument();

    // Limpar volta ao 0
    fireEvent.change(textarea!, { target: { value: "" } });
    expect(screen.getByText(/0\s*\/\s*1000/)).toBeInTheDocument();
  });

  it("contador fica vermelho/aviso quando se aproxima do limite (>=900)", async () => {
    const naoSeAplica: DocumentNARow[] = [
      {
        id: 1,
        categoria: "PITCH_DECK",
        justificativa: "",
        reviewStatus: "PENDING_REVIEW",
      },
    ];
    renderSection({ naoSeAplica });

    const textarea = document.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();

    // 900 chars dispara aviso (visualmente destacado)
    const texto900 = "a".repeat(900);
    fireEvent.change(textarea!, { target: { value: texto900 } });
    expect(screen.getByText(/900\s*\/\s*1000/)).toBeInTheDocument();
    // O contador deve ter alguma indicação visual de proximidade do limite
    // (aria-label ou className destrutiva) — assert simples: aria-label inclui "limite".
    const counter = screen.getByText(/900\s*\/\s*1000/);
    expect(
      counter.getAttribute("aria-label") ??
        counter.parentElement?.getAttribute("aria-label") ??
        "",
    ).toMatch(/limite|quase|próximo/i);
  });

  it("botão Salvar fica desabilitado quando texto > 1000 (defesa em profundidade)", async () => {
    const naoSeAplica: DocumentNARow[] = [
      {
        id: 1,
        categoria: "PITCH_DECK",
        justificativa: "",
        reviewStatus: "PENDING_REVIEW",
      },
    ];
    renderSection({ naoSeAplica });

    const textarea = document.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();

    // 1001 chars via paste/colar contorna o maxLength do DOM, mas o React
    // value é controlado — forçamos value acima do limite:
    fireEvent.change(textarea!, { target: { value: "a".repeat(1001) } });
    // Botão Salvar deve ficar desabilitado
    const saveBtn = screen.getByRole("button", {
      name: /salvar justificativa/i,
    });
    expect(saveBtn).toBeDisabled();
  });

  // ─── BUG-FT-009 — simetria visual Salvar/Desfazer na justificativa N/A ───
  // Antes: variant `primary` do `DocActionButton` forçava min-h-11 + px-4 +
  // text-sm (44px), enquanto `danger`/`default` usavam py-1.5 + text-xs (~28px).
  // Resultado: "Salvar justificativa" era ~60% maior que "Desfazer" no mesmo
  // flex row. Fix unifica a estrutura de padding/tamanho — diferencia visual
  // só pela cor (magenta vs vermelho vs cinza).

  describe("BUG-FT-009 — simetria Salvar/Desfazer", () => {
    // Cenário dirty → label "Salvar justificativa". Para cenário com label
    // "Justificativa salva" (saved == current) o botão usa a mesma classe
    // primary — apenas o label muda.

    it("Salvar (primary) tem mesma estrutura de padding/texto que Desfazer (danger)", async () => {
      // savedJustificativa = "abc" (mock), justificativa inicial = "abc"
      // → isDirty = false → label fica "Justificativa salva" (não "Salvar").
      // Usamos nomes compatíveis com ambas as labels via /justificativa/i.
      const naoSeAplica: DocumentNARow[] = [
        {
          id: 1,
          categoria: "PITCH_DECK",
          justificativa: "abc",
          reviewStatus: "PENDING_REVIEW",
        },
      ];
      renderSection({ naoSeAplica });

      // Botão primary: pode ser "Salvar justificativa" (dirty) ou
      // "Justificativa salva" (clean). Ambos devem ter as classes novas.
      const primaryBtn = screen.getByRole("button", {
        name: /justificativa/i,
      });
      const desfazerBtn = screen.getByRole("button", { name: /desfazer/i });

      // Mesma estrutura base entre as variantes — diferencia visual só pela cor
      for (const cls of ["gap-1.5", "px-2.5", "py-1.5", "text-xs"]) {
        expect(primaryBtn.className).toContain(cls);
        expect(desfazerBtn.className).toContain(cls);
      }
    });

    it("Salvar (primary) NÃO usa mais min-h-11 (regressão do tamanho grande)", async () => {
      const naoSeAplica: DocumentNARow[] = [
        {
          id: 1,
          categoria: "PITCH_DECK",
          justificativa: "abc",
          reviewStatus: "PENDING_REVIEW",
        },
      ];
      renderSection({ naoSeAplica });

      const primaryBtn = screen.getByRole("button", {
        name: /justificativa/i,
      });
      // Antes do fix: min-h-11 forçava 44px de altura. Hoje: tamanho natural
      // alinhado com `danger`/`default`.
      expect(primaryBtn.className).not.toContain("min-h-11");
    });
  });
});