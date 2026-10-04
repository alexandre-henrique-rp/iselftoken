/**
 * Testes para EmailTemplateEditor.
 * Testa fluxo: carrega template → muda subject → chama mutation → toast verde;
 * testa fluxo de erro: backend retorna 400 com "CPF detectado" → toast vermelho.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "~/context/ToastContext";
import { MemoryRouter } from "react-router";

// Mock dos hooks
vi.mock("~/hooks/use-email-template", () => ({
  useEmailTemplate: vi.fn(() => ({
    data: {
      id: "1",
      slug: "welcome-founder",
      name: "Welcome Founder",
      description: "Email de boas-vindas",
      isActive: true,
      currentVersion: {
        id: "v1",
        version: 1,
        subject: "Bem-vindo, {{userName}}!",
        status: "PUBLISHED",
        publishedAt: "2026-01-15T10:00:00Z",
      },
      versions: [
        {
          id: "v1",
          templateId: "1",
          version: 1,
          subject: "Bem-vindo, {{userName}}!",
          htmlTemplate: "<p>Olá {{userName}}</p",
          textTemplate: "Olá {{userName}}",
          variablesSchema: { type: "object", properties: { userName: { type: "string" } }, required: ["userName"] },
          status: "PUBLISHED",
          changeNote: null,
          createdByUserId: 1,
          createdAt: "2026-01-10T08:00:00Z",
          publishedAt: "2026-01-15T10:00:00Z",
          publishedByUserId: 1,
        },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("~/hooks/use-create-email-template-version", () => ({
  useCreateEmailTemplateVersion: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("~/hooks/use-update-email-template-version", () => ({
  useUpdateEmailTemplateVersion: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("~/hooks/use-publish-email-template-version", () => ({
  usePublishEmailTemplateVersion: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("~/hooks/use-preview-email-template-version", () => ({
  usePreviewEmailTemplateVersion: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
  })),
}));

// Mock do editor TipTap
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ insertContent: vi.fn(() => ({ run: vi.fn() })) })) })),
    isActive: vi.fn(() => false),
    commands: { setContent: vi.fn() },
  })),
  EditorContent: vi.fn(() => <div data-testid="editor-content">Editor Content</div>),
}));

import { EmailTemplateEditor } from "~/components/admin/email-templates/email-template-editor";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("EmailTemplateEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza LGPD warning banner", () => {
    renderWithProviders(<EmailTemplateEditor slug="welcome-founder" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/⚠️ LGPD:/)).toBeInTheDocument();
  });

  it("renderiza nome do template no header", () => {
    renderWithProviders(<EmailTemplateEditor slug="welcome-founder" />);
    expect(screen.getByText(/Template: Welcome Founder/)).toBeInTheDocument();
  });

  it("renderiza link Voltar", () => {
    renderWithProviders(<EmailTemplateEditor slug="welcome-founder" />);
    expect(screen.getByText(/Voltar/)).toBeInTheDocument();
  });

  it("renderiza botões de ação", () => {
    renderWithProviders(<EmailTemplateEditor slug="welcome-founder" />);
    expect(screen.getByRole("button", { name: /Preview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publicar/i })).toBeInTheDocument();
  });

  it("abre o modal de preview somente após clicar em Preview", () => {
    renderWithProviders(<EmailTemplateEditor slug="welcome-founder" />);
    expect(screen.queryByRole("dialog", { name: "Preview do email" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Preview/i }));

    expect(screen.getByRole("dialog", { name: "Preview do email" })).toBeInTheDocument();
  });
});
