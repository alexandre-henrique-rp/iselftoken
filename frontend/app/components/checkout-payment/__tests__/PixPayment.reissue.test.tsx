import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PixPayment } from "../PixPayment";

vi.mock("~/hooks/use-generate-pix-mutation", () => ({
  useGeneratePixMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("~/lib/queries", () => ({
  paymentStatusQueryOptions: (paymentId: number) => ({
    queryKey: ["payment-status", paymentId],
    queryFn: async () => null,
    enabled: false,
  }),
}));

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

describe("PixPayment — substituição de cobrança", () => {
  it("oculta o QR antigo enquanto a cobrança com cupom é reemitida", () => {
    renderWithQueryClient(
      <PixPayment
        paymentId={7}
        suppressCob
        initialCob={{
          paymentId: 7,
          txid: "old-txid",
          qrCodeBase64: "data:image/png;base64,old",
          copyPastePix: "old-pix-code",
          amount: 1000,
          status: "PENDING",
        }}
      />,
    );

    expect(screen.getByText("Atualizando cobrança PIX")).toBeTruthy();
    expect(screen.queryByAltText("QR Code PIX")).toBeNull();
    expect(screen.queryByText("old-pix-code")).toBeNull();
  });
});
