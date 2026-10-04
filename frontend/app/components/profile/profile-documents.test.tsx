import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { meQueryOptions } from "~/lib/queries";
import { ProfileDocuments } from "./profile-documents";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("~/hooks/use-upload", () => ({
  useUploadMutation: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("./profile-document-tile", () => ({
  ProfileDocumentTile: ({
    label,
    onClick,
    status,
    previewUrl,
  }: {
    label: string;
    onClick: () => void;
    status: string;
    previewUrl?: string | null;
  }) => (
    <button
      type="button"
      onClick={onClick}
      data-status={status}
      data-preview-url={previewUrl ?? ""}
    >
      {label}
    </button>
  ),
}));

vi.mock("./liveness-modal", () => ({
  LivenessModal: ({
    open,
    onComplete,
  }: {
    open: boolean;
    onComplete: (result: unknown) => void;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          onComplete({
            videoBlob: new Blob(["video"], { type: "video/webm" }),
            mimeType: "video/webm;codecs=vp9",
            rejectionReasons: [],
          })
        }
      >
        Concluir selfie
      </button>
    ) : null,
}));

function renderDocuments(
  queryClient = new QueryClient(),
  user: Parameters<typeof ProfileDocuments>[0]["user"] = null,
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileDocuments user={user} />
    </QueryClientProvider>,
  );
}

describe("ProfileDocuments — upload direto e vínculo pelo id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:avatar-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("mostra a URL retornada e vincula o id diretamente no campo do avatar", async () => {
    const queryClient = new QueryClient();
    const updatedUser = {
      id: 41,
      nome: "Perfil atualizado",
      avatar: { id: 99, url: "https://storage.test/image/avatar.png" },
    };
    mocks.mutateAsync.mockResolvedValue({
      id: 82,
      publicId: "upload-avatar",
      url: "https://storage.test/image/avatar.png",
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: false, data: updatedUser }),
    } as Response);

    const { container } = renderDocuments(queryClient);
    fireEvent.click(screen.getByRole("button", { name: "Avatar" }));
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(["avatar"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Avatar atualizado com sucesso.",
        { duration: 5000, richColors: true },
      );
      expect(screen.getByRole("button", { name: "Avatar" })).toHaveAttribute(
        "data-preview-url",
        "https://storage.test/image/avatar.png",
      );
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]).toEqual([
      "/api/users/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ avatar_upload_id: 82 }),
      }),
    ]);
    expect(queryClient.getQueryData(meQueryOptions.queryKey)).toEqual(
      updatedUser,
    );
  });

  it("vincula o comprovante sem exigir profileField na resposta do upload", async () => {
    mocks.mutateAsync.mockResolvedValue({
      id: 27,
      publicId: "upload-comprovante",
      url: "https://storage.test/document/comprovante.png",
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: false, data: { id: 41, nome: "Usuário" } }),
    } as Response);

    const { container } = renderDocuments();
    fireEvent.click(screen.getByRole("button", { name: "Comprovante" }));
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["comprovante"], "comprovante.png", {
            type: "image/png",
          }),
        ],
      },
    });

    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Comprovante atualizado com sucesso.",
        { duration: 5000, richColors: true },
      ),
    );

    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ comprovante_upload_id: 27 }),
      }),
    );
  });

  it("exibe o erro do PATCH sem apagar o preview retornado pelo upload", async () => {
    mocks.mutateAsync.mockResolvedValue({
      id: 84,
      publicId: "upload-documento",
      url: "https://storage.test/document/documento.png",
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: true,
        message: "Não foi possível vincular o arquivo",
      }),
    } as Response);

    const { container } = renderDocuments();
    fireEvent.click(screen.getByRole("button", { name: "Identidade" }));
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["documento"], "documento.png", { type: "image/png" }),
        ],
      },
    });

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Não foi possível vincular o arquivo",
        { richColors: true },
      ),
    );
    expect(screen.getByRole("button", { name: "Identidade" })).toHaveAttribute(
      "data-preview-url",
      "https://storage.test/document/documento.png",
    );
  });

  it("mantém o preview da selfie enquanto envia e vincula o id", async () => {
    let resolveUpload!: (value: unknown) => void;
    mocks.mutateAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    renderDocuments();
    fireEvent.click(screen.getByRole("button", { name: "Selfie" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir selfie" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Selfie" })).toHaveAttribute(
        "data-status",
        "PENDING",
      ),
    );

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: false,
        data: {
          id: 41,
          biofacial: { id: 100, url: "https://storage.test/selfie.webm" },
        },
      }),
    } as Response);
    resolveUpload({
      id: 83,
      publicId: "biofacial-upload",
      url: "https://storage.test/selfie.webm",
    });

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Selfie enviada e aguardando análise do Compliance.",
        { duration: 5000, richColors: true },
      );
      expect(screen.getByRole("button", { name: "Selfie" })).toHaveAttribute(
        "data-preview-url",
        "https://storage.test/selfie.webm",
      );
    });

    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ biofacial_upload_id: 83 }),
      }),
    );
  });

  // ─── BUG-FT-005: rejeição admin → status volta para análise ───
  // Quando o admin REJETA ou pede reenvio, o KYCProfile é deletado + FK nulled
  // mas o backend popula `User.lastKycRejectionSlot/Reason/At` para o frontend
  // saber que houve rejeição recente. O slot deve mostrar status
  // "REJECTED_NO_DOC" (chip "Faça upload novamente") em vez de "EMPTY".

  describe("BUG-FT-005 — REJECTED_NO_DOC", () => {
    it("slot com lastKycRejectionSlot=avatar + sem avatar retorna 'REJECTED_NO_DOC'", () => {
      renderDocuments(
        new QueryClient(),
        {
          id: 41,
          avatar: undefined,
          documento: undefined,
          biofacial: undefined,
          comprovante: undefined,
          lastKycRejectionAt: new Date().toISOString(),
          lastKycRejectionReason: "imagem contra foto",
          lastKycRejectionSlot: "avatar",
        } as any,
      );

      expect(screen.getByRole("button", { name: "Avatar" })).toHaveAttribute(
        "data-status",
        "REJECTED_NO_DOC",
      );
    });

    it("slot SEM rejeição + sem doc retorna 'EMPTY'", () => {
      renderDocuments(
        new QueryClient(),
        {
          id: 41,
          avatar: undefined,
          documento: undefined,
          biofacial: undefined,
          comprovante: undefined,
        } as any,
      );

      expect(screen.getByRole("button", { name: "Avatar" })).toHaveAttribute(
        "data-status",
        "EMPTY",
      );
    });

    it("rejeição antiga (>90d) não bloqueia — slot retorna 'EMPTY'", () => {
      const ninetyDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
      renderDocuments(
        new QueryClient(),
        {
          id: 41,
          avatar: undefined,
          lastKycRejectionAt: ninetyDaysAgo,
          lastKycRejectionReason: "rejeição antigo",
          lastKycRejectionSlot: "avatar",
        } as any,
      );

      expect(screen.getByRole("button", { name: "Avatar" })).toHaveAttribute(
        "data-status",
        "EMPTY",
      );
    });

    it("rejeição recente mas slot diferente retorna 'EMPTY' para o slot correto", () => {
      renderDocuments(
        new QueryClient(),
        {
          id: 41,
          avatar: undefined,
          documento: undefined,
          biofacial: undefined,
          comprovante: undefined,
          lastKycRejectionAt: new Date().toISOString(),
          lastKycRejectionReason: "motivo",
          lastKycRejectionSlot: "comprovante", // rejeição no comprovante
        } as any,
      );

      // Avatar: não afetado pela rejeição do comprovante
      expect(screen.getByRole("button", { name: "Avatar" })).toHaveAttribute(
        "data-status",
        "EMPTY",
      );
      // Comprovante: REJECTED_NO_DOC
      expect(screen.getByRole("button", { name: "Comprovante" })).toHaveAttribute(
        "data-status",
        "REJECTED_NO_DOC",
      );
    });
  });
});
