/**
 * S6-T02 — Testes do GlobalErrorBoundary
 *
 * Cobre:
 *  - renderiza children quando nao ha erro
 *  - mostra fallback quando filho lanca erro
 *  - envia para Sentry quando window.Sentry existe
 *  - fallback custom sobrescreve o default
 *  - sibling children nao quebram (testado em <EditStartupLayout>)
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GlobalErrorBoundary } from "./global-error-boundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Kaboom from child");
  }
  return <p>OK child</p>;
}

describe("GlobalErrorBoundary (S6-T02)", () => {
  it("renderiza children quando nao ha erro", () => {
    render(
      <GlobalErrorBoundary>
        <Bomb shouldThrow={false} />
      </GlobalErrorBoundary>,
    );
    expect(screen.getByText("OK child")).toBeInTheDocument();
  });

  it("mostra fallback quando filho lanca erro", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      render(
        <GlobalErrorBoundary>
          <Bomb shouldThrow={true} />
        </GlobalErrorBoundary>,
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Algo deu errado/)).toBeInTheDocument();
      expect(screen.getByText(/Kaboom from child/)).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("envia para Sentry quando window.Sentry esta disponivel", () => {
    const sentryCapture = vi.fn();
    (globalThis as any).Sentry = { captureException: sentryCapture };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      render(
        <GlobalErrorBoundary>
          <Bomb shouldThrow={true} />
        </GlobalErrorBoundary>,
      );

      expect(sentryCapture).toHaveBeenCalledTimes(1);
      expect(sentryCapture.mock.calls[0][0].message).toBe("Kaboom from child");
    } finally {
      delete (globalThis as any).Sentry;
      consoleError.mockRestore();
    }
  });

  it("fallback custom sobrescreve o default", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      render(
        <GlobalErrorBoundary fallback={<p>Custom fallback</p>}>
          <Bomb shouldThrow={true} />
        </GlobalErrorBoundary>,
      );
      expect(screen.getByText("Custom fallback")).toBeInTheDocument();
      expect(screen.queryByText(/Algo deu errado/)).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});