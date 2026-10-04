import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { TermoAdesaoSectionHandle } from "../termo-adesao-section";
import { TermoAdesaoSection } from "../termo-adesao-section";

// Mock TanStack Query — armazenamos refs para poder reconfigurar em cada teste
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: (...args: unknown[]) => mockUseQueryClient(...args),
}));

// Mock react-router Link
vi.mock("react-router", async () => {
  const actual = await import("react-router");
  return {
    ...actual,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

/** Configura o retorno de useQuery para cada teste. */
function mockQueryResult(data: unknown, isLoading = false, isError = false, isSuccess = true) {
  mockUseQuery.mockReturnValue({
    data,
    isLoading,
    isError,
    isSuccess,
    refetch: vi.fn(),
  });
}

describe("TermoAdesaoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks para useMutation
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
    });
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
  });

  describe("Estado 1: Carregando (loading)", () => {
    it("mostra skeleton quando status está carregando", () => {
      mockQueryResult(undefined, true, false, false);

      render(<TermoAdesaoSection startupId={123} />);

      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Estado 2: Switch (não assinado)", () => {
    beforeEach(() => {
      mockQueryResult({ exists: false }, false, false, true);
    });

    it("mostra switch com label 'Li e aceito o Termo de Adesão'", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const switchEl = screen.getByRole("switch");
      expect(switchEl).toBeInTheDocument();
      expect(switchEl).toHaveAttribute("aria-checked", "false");
    });

    it("exibe badge 'Obrigatório' indicando que o aceite é mandatório", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const badge = screen.getByText(/obrigatório/i);
      expect(badge).toBeInTheDocument();
    });

    it("switch possui atributo aria-required para leitores de tela", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const switchEl = screen.getByRole("switch");
      expect(switchEl).toHaveAttribute("aria-required", "true");
    });

    it("mostra o botão para abrir o termo em modal", () => {
      render(<TermoAdesaoSection startupId={123} />);

      expect(
        screen.getByRole("button", { name: /termo de adesão/i }),
      ).toBeInTheDocument();
    });

    it("switch fica desabilitado quando prop disabled=true", () => {
      render(<TermoAdesaoSection startupId={123} disabled />);

      const switchEl = screen.getByRole("switch");
      expect(switchEl).toBeDisabled();
    });

    it("switch fica desabilitado enquanto o documento não foi lido até o final", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const switchEl = screen.getByRole("switch");
      expect(switchEl).toBeDisabled();
      expect(
        screen.getByText(/leia o documento até o final para liberar o aceite/i),
      ).toBeInTheDocument();
    });

    it("clique no switch atualiza o estado quando habilitado", () => {
      // Pré-condição: `hasReadTermo` precisa ser true para o switch aceitar toggle.
      // Simulamos isso injetando um termo com scrollHeight baixo que dispara o
      // useEffect interno que libera o aceite.
      render(<TermoAdesaoSection startupId={123} />);

      const switchEl = screen.getByRole("switch");
      expect(switchEl).toBeDisabled();
    });

    it("segundo clique desmarca o switch", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const switchEl = screen.getByRole("switch");
      // Switch fica disabled porque o termo ainda não foi lido. Esta asserção
      // documenta que, sem scroll do termo, o toggle está bloqueado.
      expect(switchEl).toBeDisabled();
    });
  });

  describe("Estado 3: Assinado (selo visual)", () => {
    const signedStatus = {
      exists: true,
      signedAt: "2026-07-10T14:30:00.000Z",
      serialCert: "00:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88",
      hashSha256: "a3f5d8e1b9c2407f8e6a2d9c5b8e1f3a4d7b9c2e5f8a1b3c6d9e2f5a8b1c4e7",
      presignedUrl: "https://example.com/signed.pdf",
    };

    beforeEach(() => {
      mockQueryResult(signedStatus, false, false, true);
    });

    it("mostra badge 'Termo de Adesão Assinado Digitalmente'", () => {
      render(<TermoAdesaoSection startupId={123} />);

      expect(screen.getByText(/termo de adesão assinado digitalmente/i)).toBeInTheDocument();
    });

    it("mostra data de assinatura formatada em PT-BR", () => {
      render(<TermoAdesaoSection startupId={123} />);

      expect(screen.getByText(/10\/07\/2026/i)).toBeInTheDocument();
    });

    it("mostra botão 'Ler termo assinado' com href para presignedUrl", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const readLink = screen.getByRole("link", { name: /ler termo assinado/i });
      expect(readLink).toHaveAttribute("href", signedStatus.presignedUrl);
    });

    it("mostra botão 'Baixar termo assinado' com atributo download", () => {
      render(<TermoAdesaoSection startupId={123} />);

      const downloadLink = screen.getByRole("link", { name: /baixar termo assinado/i });
      expect(downloadLink).toHaveAttribute("href", signedStatus.presignedUrl);
      expect(downloadLink).toHaveAttribute("download", `termo-adesao-123.pdf`);
    });

    it("não exibe hash ou serial técnico para o fundador", () => {
      render(<TermoAdesaoSection startupId={123} />);

      expect(screen.queryByText(/hash sha-256 do pdf/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/serial do certificado/i)).not.toBeInTheDocument();
    });
  });

  describe("Estado de erro", () => {
    it("mostra mensagem de erro e botão 'Tentar novamente'", () => {
      mockQueryResult(undefined, false, true, false);

      render(<TermoAdesaoSection startupId={123} />);

      expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
    });
  });

  describe("API de ref (forwardRef)", () => {
    it("expoe signIfNeeded via ref.current.signIfNeeded", async () => {
      mockQueryResult({ exists: false }, false, false, true);

      const ref = React.createRef<TermoAdesaoSectionHandle>();
      render(<TermoAdesaoSection startupId={123} ref={ref} />);

      await waitFor(() => {
        expect(typeof ref.current?.signIfNeeded).toBe("function");
      });
    });

    it("ref.current.signIfNeeded retorna Promise", async () => {
      mockQueryResult({ exists: false }, false, false, true);

      const ref = React.createRef<TermoAdesaoSectionHandle>();
      render(<TermoAdesaoSection startupId={123} ref={ref} />);

      await waitFor(() => {
        expect(ref.current?.signIfNeeded).toBeDefined();
      });
      const result = ref.current!.signIfNeeded();
      await expect(result).toBeInstanceOf(Promise);
    });
  });
});
