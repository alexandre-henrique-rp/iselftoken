import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleAlert,
  Home,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatCurrencyBRL } from "~/lib/currency-format";
import {
  getPaymentPresentation,
  isCouponIntegralPayment,
} from "~/lib/payment-presentation";
import { paymentDetailQueryOptions } from "~/lib/queries";

type CouponPaymentSuccessProps = {
  paymentId: number;
  initialError: boolean;
};

export function CouponPaymentSuccess({
  paymentId,
  initialError,
}: CouponPaymentSuccessProps) {
  const [isPollingEnabled, setIsPollingEnabled] = useState(!initialError);
  const paymentQuery = useQuery({
    ...paymentDetailQueryOptions(paymentId),
    enabled: isPollingEnabled,
  });
  const payment = paymentQuery.data;

  useEffect(() => {
    if (payment) setIsPollingEnabled(true);
  }, [payment]);

  if (initialError && !payment && !paymentQuery.isFetching) {
    return <CouponPaymentSuccessError onRetry={paymentQuery.refetch} />;
  }

  if (paymentQuery.isPending) return <CouponPaymentSuccessLoading />;

  if (paymentQuery.isError || !payment) {
    return <CouponPaymentSuccessError onRetry={paymentQuery.refetch} />;
  }

  if (!isCouponIntegralPayment(payment)) {
    return (
      <CouponPaymentSuccessError
        message="Não encontramos uma confirmação válida deste pagamento por cupom."
        onRetry={paymentQuery.refetch}
      />
    );
  }

  const presentation = getPaymentPresentation(payment);
  const effectsPending = !payment.effectsAppliedAt;
  const couponCode = payment.serviceDetails?.couponCode;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-1 py-6 sm:gap-8 sm:py-10">
      <section className="rounded-3xl border border-primary/20 bg-card p-6 text-center shadow-2xl sm:p-10">
        {effectsPending ? (
          <Loader2 className="mx-auto h-14 w-14 animate-spin text-primary" />
        ) : (
          <BadgeCheck className="mx-auto h-16 w-16 text-emerald-400" />
        )}
        <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-primary">
          {effectsPending ? "Pagamento confirmado" : "Pagamento concluído"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {effectsPending
            ? "Estamos finalizando seu pedido"
            : "Seu pagamento foi concluído"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {effectsPending
            ? "O cupom cobriu o valor integral. Estamos aplicando as últimas confirmações com segurança."
            : "O cupom cobriu o valor integral do pedido. Nenhuma cobrança foi enviada à EFI."}
        </p>
      </section>

      <section
        aria-label="Resumo do pagamento"
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pedido
          </p>
          <p className="mt-2 text-lg font-black text-foreground">
            {presentation.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {presentation.description}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Valor pago
          </p>
          <p className="mt-2 text-3xl font-black text-primary">
            {formatCurrencyBRL(Number(payment.amount))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Coberto integralmente pelo cupom.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Cupom integral aplicado
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {couponCode
            ? `O cupom ${couponCode} foi registrado neste pagamento.`
            : "O cupom aplicado foi registrado neste pagamento."}
        </p>
      </section>

      <Link
        to="/home"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto sm:self-center"
      >
        <Home className="h-4 w-4" />
        Voltar para a Home
      </Link>
    </main>
  );
}

export function CouponPaymentSuccessLoading() {
  return (
    <main className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:py-24">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-2xl font-black text-foreground">
        Carregando a confirmação
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Estamos consultando o status seguro do seu pagamento.
      </p>
    </main>
  );
}

function CouponPaymentSuccessError({
  message = "Não foi possível carregar a confirmação deste pagamento.",
  onRetry,
}: {
  message?: string;
  onRetry: () => unknown;
}) {
  return (
    <main className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:py-24">
      <CircleAlert className="h-12 w-12 text-destructive" />
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Confirmação indisponível
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={() => void onRetry()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 px-5 py-3 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          to="/home"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Home className="h-4 w-4" />
          Voltar para a Home
        </Link>
      </div>
    </main>
  );
}
