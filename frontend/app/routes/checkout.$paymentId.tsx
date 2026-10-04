/**
 * Checkout EFI — layout responsivo para desktop e mobile.
 * Mantém o fluxo EFI existente: criação de sessão, polling, PIX, cartão e cupom.
 */

import { useEffect, useState, type ReactNode } from "react";
import { redirect, useParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { toast } from "sonner";
import {
  CheckoutOrderSummary,
  type OrderItem,
} from "~/components/checkout/checkout-order-summary";
import { CheckoutSkeleton } from "~/components/checkout/checkout-skeleton";
import { EfiErrorBoundary } from "~/components/checkout/efi-error-boundary";
import { ErrorCard } from "~/components/checkout/error-card";
import { Pending3DSCard } from "~/components/checkout/pending-3ds-card";
import { PixCheckout } from "~/components/checkout/pix-checkout";
import { PixExpiredCard } from "~/components/checkout/pix-expired-card";
import { SuccessCard } from "~/components/checkout/success-card";
import { ToastContainer } from "~/components/toast/toast-provider";
import {
  useCheckoutSession,
  useCreateCheckout,
  useRegeneratePix,
} from "~/hooks/use-efi-checkout";

export function meta() {
  return [
    { title: "Finalizar Pagamento | iSelfToken" },
    {
      name: "description",
      content: "Checkout seguro com PIX ou Cartão de Crédito.",
    },
  ];
}

/**
 * Loader: redireciona `/checkout/efi/:paymentId` (legacy, EFI v1) para o
 * fluxo unificado `/checkout/payment/:id` (EFI v2 / Payments Hub).
 *
 * O hook `use-efi-checkout.ts` chama `/api/checkout/efi/*` (BFFs que
 * não existem) — ver auditoria §3.8. O fluxo consolidado vive em
 * `routes/private/checkout-payment.tsx`.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const paymentId = params.paymentId;
  if (!paymentId) return redirect("/home");
  return redirect(`/checkout/payment/${paymentId}`);
}

function buildOrderItems(checkoutData: {
  amount: number;
  method: string;
}): OrderItem[] {
  const label =
    checkoutData.method === "PIX" ? "Pagamento PIX" : "Pagamento Cartão";
  return [
    {
      name: label,
      description: "Transação iSelfToken",
      quantity: "Qtd: 1",
      price: checkoutData.amount,
      icon: "network",
    },
  ];
}

function TrustFooter() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#9f7896]">
      <span className="inline-flex items-center gap-1.5">
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z" />
        </svg>
        Criptografia SSL 256-bit
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 3 4 6v5c0 4.5 3.1 8.4 8 10 4.9-1.6 8-5.5 8-10V6z" />
        </svg>
        Transação Segura
      </span>
    </div>
  );
}

function PaymentMethodTabs({
  method,
  onChange,
}: {
  method: "PIX" | "CARD";
  onChange: (method: "PIX" | "CARD") => void;
}) {
  return (
    <div
      className="grid grid-cols-2 border-b border-[#5d194f]/70"
      role="radiogroup"
      aria-label="Método de pagamento"
    >
      <button
        type="button"
        role="radio"
        aria-checked={method === "CARD"}
        onClick={() => onChange("CARD")}
        className={`checkout-method-tab ${method === "CARD" ? "checkout-method-tab-active" : ""}`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        <span>Cartão de Crédito</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={method === "PIX"}
        onClick={() => onChange("PIX")}
        className={`checkout-method-tab ${method === "PIX" ? "checkout-method-tab-active" : ""}`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m7 3 5 5 5-5M7 21l5-5 5 5M3 7l5 5-5 5M21 7l-5 5 5 5" />
        </svg>
        <span>PIX</span>
      </button>
    </div>
  );
}

export default function CheckoutEfiPage() {
  const { paymentId } = useParams();
  const [method, setMethod] = useState<"PIX" | "CARD">("CARD");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<Error | null>(null);

  const createCheckout = useCreateCheckout();
  const regeneratePix = useRegeneratePix();

  useEffect(() => {
    if (!paymentId) return;

    setCheckoutId(null);
    setCheckoutError(null);
    createCheckout
      .mutateAsync({ paymentId, method })
      .then((result) => setCheckoutId(result.checkoutId))
      .catch((err) => setCheckoutError(err));
  }, [paymentId, method]);

  const {
    data: checkoutData,
    isLoading,
    error,
  } = useCheckoutSession({
    checkoutId: checkoutId ?? "",
    paymentId: paymentId ?? "",
    enabled: !!checkoutId && !!paymentId,
  });

  if (!paymentId) {
    return (
      <CheckoutState>
        <ErrorCard customMessage="ID de pagamento não encontrado." />
      </CheckoutState>
    );
  }

  if ((!checkoutId && !checkoutError) || isLoading) {
    return (
      <CheckoutState>
        <CheckoutSkeleton />
      </CheckoutState>
    );
  }

  if (checkoutError || error || !checkoutData) {
    return (
      <CheckoutState>
        <ErrorCard
          onRetry={() => window.location.reload()}
          customMessage={
            checkoutError
              ? "Falha ao iniciar checkout. Tente novamente."
              : undefined
          }
        />
      </CheckoutState>
    );
  }

  const handleCouponApplied = (
    discount: number,
    _newTotal: number,
    code?: string,
  ) => {
    setDiscountAmount(discount);
    setCouponCode(code ?? "APLICADO");
  };

  const orderItems = buildOrderItems(checkoutData);
  const subtotal = checkoutData.amount;
  const total = Math.max(0, checkoutData.amount - discountAmount);

  const renderPayment = () => {
    switch (checkoutData.status) {
      case "PAID":
        return (
          <SuccessCard
            paymentStatus={{
              status: checkoutData.status,
              paymentId,
              efiChargeId: checkoutData.efiChargeId,
              amount: checkoutData.amount,
              method: checkoutData.method,
            }}
          />
        );
      case "EXPIRED":
        return method === "PIX" ? (
          <PixExpiredCard
            onRegenerate={() => regeneratePix.mutate(paymentId)}
            onPayWithCard={() => setMethod("CARD")}
          />
        ) : (
          <ErrorCard onRetry={() => window.location.reload()} />
        );
      case "PENDING_3DS":
        return (
          <Pending3DSCard
            authenticationUrl={checkoutData.authenticationUrl || ""}
            onTimeout={() => window.location.reload()}
            onContinueManually={() => window.location.reload()}
          />
        );
      case "PENDING":
      default:
        return method === "PIX" ? (
          <PixCheckout
            checkoutData={checkoutData}
            onPaid={() =>
              toast.success("Pagamento PIX confirmado!", { richColors: true })
            }
          />
        ) : (
          // Fluxo de cartão migrou para /checkout/payment/:id (CreditCardForm).
          // Esta rota legada sempre redireciona no loader; este branch nunca
          // renderiza, mas é mantido válido para o type-check.
          <ErrorCard
            onRetry={() => window.location.reload()}
            customMessage="Redirecionando para o checkout atualizado…"
          />
        );
    }
  };

  const summary = (
    <CheckoutOrderSummary
      items={orderItems}
      subtotal={subtotal}
      total={total}
      paymentId={paymentId}
      discount={discountAmount}
      couponCode={couponCode}
      onCouponApplied={handleCouponApplied}
    />
  );

  return (
    <EfiErrorBoundary>
      <div className="checkout-page min-h-screen bg-[#120010] text-[#f7d8f5]">
        <div className="checkout-watermark" aria-hidden="true">
          iSelfToken
        </div>
        <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="hidden min-h-screen flex-col bg-[#050005] px-8 py-8 lg:flex xl:px-16 xl:py-12">
            <CheckoutIntro />
            <div className="mt-12 max-w-[520px]">{summary}</div>
            <p className="mt-auto pt-12 font-mono text-[10px] tracking-[0.22em] text-[#704367]">
              SYS.AUTH.TKN / 2024
            </p>
          </aside>

          <main className="min-w-0 bg-[#260021] px-5 py-5 sm:px-8 sm:py-8 lg:px-14 lg:py-14 xl:px-24">
            <div className="mx-auto max-w-[620px]">
              <header className="mb-8 flex items-center justify-between lg:mb-16">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="flex items-center gap-3 text-[#d6aaca] lg:hidden"
                  aria-label="Voltar"
                >
                  <span className="text-2xl leading-none">‹</span>
                  <span className="text-sm">Voltar</span>
                </button>
                <span className="text-lg font-extrabold tracking-tight text-[#ef79ff] lg:hidden">
                  iSelfToken
                </span>
                <span className="hidden text-xs font-bold uppercase tracking-[0.28em] text-[#ed70ff] lg:block">
                  Pagamento seguro
                </span>
                <span className="text-[10px] text-[#9e7296]">
                  {method === "CARD" ? "01" : "02"} / 02
                </span>
              </header>

              <div className="mb-7 lg:hidden">{summary}</div>

              <section aria-labelledby="checkout-heading">
                <div className="mb-5 hidden lg:block">
                  <h1
                    id="checkout-heading"
                    className="text-2xl font-extrabold text-[#f7d8f5]"
                  >
                    Finalizar Pagamento
                  </h1>
                  <p className="mt-2 text-xs text-[#b98aad]">
                    Escolha a forma de pagamento para concluir sua participação.
                  </p>
                </div>
                <h2 className="mb-4 text-xl font-extrabold text-[#f7d8f5] lg:hidden">
                  Payment Method
                </h2>
                <PaymentMethodTabs method={method} onChange={setMethod} />
                <div className="checkout-payment-card mt-5">
                  {renderPayment()}
                </div>
              </section>

              <div className="mt-8 border-t border-[#5d194f]/70 pt-5">
                <TrustFooter />
              </div>
            </div>
          </main>
        </div>
      </div>
      <ToastContainer />
    </EfiErrorBoundary>
  );
}

function CheckoutState({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#120010] px-4 py-12">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

function CheckoutIntro() {
  return (
    <div className="max-w-[420px]">
      <p className="text-[10px] font-bold tracking-tight text-[#ed70ff]">
        iSelfToken
      </p>
      <div className="mt-16">
        <span className="mb-4 block h-1 w-8 rounded-full bg-[#ed70ff]" />
        <h1 className="max-w-sm text-2xl font-extrabold leading-tight text-[#f7d8f5]">
          Garanta sua participação{" "}
          <span className="text-[#ed70ff]">no futuro.</span>
        </h1>
        <p className="mt-5 max-w-sm text-xs leading-6 text-[#b98aad]">
          Acesso exclusivo à rodada de investimento. Estrutura de segurança de
          grau institucional com liquidação imediata e custódia descentralizada.
          O seu capital, potencializado pela arquitetura cinética.
        </p>
      </div>
    </div>
  );
}
