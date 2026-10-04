import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  CreditCard,
  Hexagon,
  Lock,
  QrCode,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import {
  Link,
  redirect,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { toast } from "sonner";

import { CreditCardForm } from "~/components/checkout-payment/CreditCardForm";
import { PixPayment } from "~/components/checkout-payment/PixPayment";
import { useApplyCoupon } from "~/hooks/use-apply-coupon";
import type { InstallmentOption } from "~/hooks/use-installment-options";
import { computeCheckoutTotals } from "~/lib/checkout-totals";
import { useUser } from "~/hooks/use-user";
import {
  getMissingProfileFieldsForCardPayment,
  PROFILE_FIELD_LABELS,
} from "~/lib/card-payment-profile";
import { refreshUserRelatedQueries } from "~/lib/invalidate";
import {
  getPaymentPresentation,
  type PaymentSummary,
} from "~/lib/payment-presentation";
import { isAfiliado } from "~/lib/roles";
import { serverFetch } from "~/lib/server-fetch";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/checkout-payment";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Conclua seu pagamento | iSelfToken" },
    {
      name: "description",
      content: "Finalize para confirmar sua solicitação.",
    },
  ];
}

interface LoaderData {
  payment: PaymentSummary | null;
  error: string | null;
}

export async function loader({
  request,
  params,
}: Route.LoaderArgs): Promise<LoaderData> {
  const { id } = params;
  if (!id) return { payment: null, error: "ID do pagamento inválido." };

  const res = await serverFetch(request, `/api/payment/${id}`);
  if (res.status === 401) throw redirect("/login");

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    return {
      payment: null,
      error: body?.message ?? "Pagamento não encontrado.",
    };
  }

  return { payment: (body?.data ?? body) as PaymentSummary, error: null };
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const AUTO_REDIRECT_SECONDS = 5;

export default function CheckoutPaymentPage() {
  const { payment, error } = useLoaderData<LoaderData>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const applyCoupon = useApplyCoupon();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const kycStatus = user?.documento?.status ?? null;
  const kyc = { approved: kycStatus === "APPROVED", status: kycStatus };
  const ehAfiliado = isAfiliado(user);
  const ehInvestimento = payment?.purpose === "INVESTMENT";
  const bloqueiaInvestimento =
    ehInvestimento && !kyc.approved && payment?.status !== "PAID";

  // Validação de perfil: o usuário NÃO pode pagar (nem PIX nem cartão)
  // enquanto os campos do perfil não estiverem preenchidos. Os mesmos campos
  // são exigidos pela EFI em one-step (birth + billing_address + cpf), e
  // manter o perfil completo é requisito de compliance.
  const missingProfileFields = getMissingProfileFieldsForCardPayment(user);
  const bloqueiaPerfil = missingProfileFields.length > 0;
  const presentation = payment ? getPaymentPresentation(payment) : null;

  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">(
    payment?.method === "PIX" ? "PIX" : "CREDIT_CARD",
  );
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);
  const [now, setNow] = useState(() => Date.now());
  const [canceling, setCanceling] = useState(false);

  // Opção de parcelamento selecionada no CreditCardForm (fonte de verdade do
  // backend). Usada para refletir juros e total COM juros no resumo do pedido
  // quando o método é cartão e há parcelamento (installments > 1).
  const [selectedInstallment, setSelectedInstallment] =
    useState<InstallmentOption | null>(null);

  // Coupon state — lido do backend (serviceDetails) ou preenchido localmente
  // após aplicação bem-sucedida. Prioriza backend (sobrevive refresh).
  const couponFromBackend = payment?.serviceDetails?.couponCode
    ? {
        code: payment.serviceDetails.couponCode,
        percent: payment.serviceDetails.percent ?? 0,
        discountApplied: payment.serviceDetails.discountApplied ?? 0,
      }
    : null;

  const [couponCode, setCouponCode] = useState(couponFromBackend?.code ?? "");
  const [discountApplied, setDiscountApplied] = useState(!!couponFromBackend);
  const [discountValue, setDiscountValue] = useState(
    couponFromBackend?.discountApplied ?? 0,
  );
  const [couponPercent, setCouponPercent] = useState(
    couponFromBackend?.percent ?? 0,
  );

  useEffect(() => {
    if (!couponFromBackend) return;
    setCouponCode(couponFromBackend.code);
    setDiscountApplied(true);
    setDiscountValue(couponFromBackend.discountApplied);
    setCouponPercent(couponFromBackend.percent);
  }, [
    couponFromBackend?.code,
    couponFromBackend?.discountApplied,
    couponFromBackend?.percent,
  ]);

  const isLocked = !!payment?.txid;
  // PIX já emitido pode receber cupom: o backend cancela o txid anterior e
  // reemite a cobrança com o valor líquido. O bloqueio permanece para estados
  // não pendentes; cartão emitido continua sendo rejeitado pelo backend.
  const isCouponLocked = payment?.status !== "PENDING";
  const expiresAtMs = payment?.expiresAt ? Date.parse(payment.expiresAt) : NaN;
  const isExpired =
    ehInvestimento &&
    !!payment &&
    payment.status === "PENDING" &&
    Number.isFinite(expiresAtMs) &&
    now >= expiresAtMs;

  const handleStatusChange = (status: string) => {
    if (status === "PAID" || status === "CANCELED") {
      revalidator.revalidate();
      // Sprint S34-b — bug "paguei mas continua informando que não comprei":
      // revalidator só recarrega loaders da rota atual (PaymentSummary), mas
      // o cache [me] do TanStack Query (subscriptions) tem staleTime 5min e
      // fica stale até a próxima navegação. Forçar refetch do [me] aqui
      // garante que /perfil e a sidebar já mostrem o plano recém-ativado.
      // Sprint fix cache-stale: usa helper centralizado.
      void refreshUserRelatedQueries(queryClient);
    }
  };

  async function handleCancelOrder(silent = false) {
    if (!payment?.investmentId || canceling) return;
    if (!silent) setCanceling(true);
    try {
      const response = await fetch(
        `/api/investments/${payment.investmentId}/cancel`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Cancelado pelo investidor" }),
          keepalive: silent,
        },
      );
      if (!silent) {
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.error) {
          toast.error(body?.message ?? "Não foi possível cancelar a ordem.");
          return;
        }
        toast.success("Ordem cancelada e reserva liberada.");
        revalidator.revalidate();
      }
    } catch {
      if (!silent) toast.error("Não foi possível cancelar a ordem.");
    } finally {
      if (!silent) setCanceling(false);
    }
  }

  useEffect(() => {
    if (
      payment?.status !== "PENDING" ||
      !Number.isFinite(expiresAtMs) ||
      expiresAtMs <= Date.now()
    ) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [payment?.status, payment?.expiresAt, expiresAtMs]);

  useEffect(() => {
    if (!isExpired || !payment?.investmentId) return;
    void handleCancelOrder(true);
  }, [isExpired, payment?.investmentId]);

  useEffect(() => {
    const onPageHide = () => {
      if (payment?.status === "PENDING" && !isExpired) {
        void handleCancelOrder(true);
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [payment?.status, payment?.investmentId, isExpired]);

  useEffect(() => {
    if (payment?.status !== "PAID") return;

    if (
      Number(payment.amount) === 0 &&
      payment.serviceDetails?.couponSettlement?.type === "COUPON_100"
    ) {
      navigate(`/checkout/payment/${payment.id}/success`, { replace: true });
      return;
    }

    if (ehInvestimento) {
      if (!payment.effectsAppliedAt) {
        const interval = setInterval(() => revalidator.revalidate(), 2000);
        return () => clearInterval(interval);
      }
      navigate(`/investments/${payment.investmentId}/success`, {
        replace: true,
      });
      return;
    }

    if (payment.purpose === "SUBSCRIPTION") {
      if (!payment.effectsAppliedAt) {
        const interval = setInterval(() => revalidator.revalidate(), 2000);
        return () => clearInterval(interval);
      }

      let disposed = false;
      // Sprint fix cache-stale pós-compra: refetch IMEDIATO + helper
      // centralizado (refreshUserRelatedQueries) antes de navegar para
      // /home. Garante que o plano já aparece no Sidebar/TopNavbar e
      // dispensa reload manual (Sprint S34-b + S36).
      void refreshUserRelatedQueries(queryClient).then(() => {
        if (!disposed) navigate("/home", { replace: true });
      });

      return () => {
        disposed = true;
      };
    }

    // Para INVESTIMENTO e outros purposes também precisamos invalidar o
    // cache [me] (ex.: saldo da Wallet muda ao confirmar investment).
    if (!payment.effectsAppliedAt) {
      const interval = setInterval(() => revalidator.revalidate(), 2000);
      return () => clearInterval(interval);
    }
    void refreshUserRelatedQueries(queryClient);

    setCountdown(AUTO_REDIRECT_SECONDS);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate("/home");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [
    payment?.id,
    payment?.status,
    payment?.amount,
    payment?.serviceDetails?.couponSettlement?.type,
    payment?.effectsAppliedAt,
    payment?.investmentId,
    payment?.purpose,
    ehInvestimento,
    navigate,
    queryClient,
    revalidator,
  ]);

  const handleApplyCoupon = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payment || !couponCode.trim() || applyCoupon.isPending) return;

    const normalizedCode = couponCode.trim().toUpperCase();
    applyCoupon.mutate(
      { couponCode: normalizedCode, paymentId: payment.id },
      {
        onSuccess: (result) => {
          if (result.completion?.type === "COUPON_100") {
            navigate(`/checkout/payment/${payment.id}/success`, {
              replace: true,
            });
            return;
          }

          setDiscountValue(result.discountAmount ?? 0);
          setDiscountApplied(true);
          setCouponCode(normalizedCode);
          setCouponPercent(result.coupon?.percent ?? 0);
          // Re-fetch loader data para sincronizar amount, QR e txid novos.
          revalidator.revalidate();
        },
        onError: () => {
          // Se a saga cancelou a cobrança e falhou ao emitir a nova, remove o
          // QR antigo da tela assim que o loader refletir o estado seguro.
          revalidator.revalidate();
        },
      },
    );
  };

  const handleSimulatePaid = async () => {
    if (!payment) return;
    try {
      const res = await fetch(`/api/payment/${payment.id}/simulate-paid`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        toast.error(
          body?.message ??
            "Não foi possível simular o pagamento (somente dev).",
        );
        return;
      }
      toast.success("Pagamento simulado!");
      revalidator.revalidate();
    } catch {
      toast.error("Erro ao simular pagamento.");
    }
  };

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#1f031d] border border-primary/20 p-8 rounded-3xl space-y-6">
          <CircleAlert className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold text-[#ffdbf3]">
            Pagamento não disponível
          </h1>
          <p className="text-sm text-[#cc9dc0]">
            {error ?? "Não conseguimos carregar este pagamento."}
          </p>
          <Link
            to="/pricing"
            className="inline-block px-6 py-3 rounded-full bg-primary text-black font-bold uppercase text-xs tracking-widest hover:opacity-90"
          >
            Voltar para os planos
          </Link>
        </div>
      </div>
    );
  }

  // baseAmount = valor original (antes do desconto). Se o cupom já foi
  // aplicado e o loader re-buscou, payment.amount já é o valor com desconto
  // e discountValue precisa ser restaurado do backend para exibir a linha.
  const baseAmount = discountApplied
    ? Number(payment.amount) + discountValue // reconstrói o original
    : Number(payment.amount);
  const finalAmount = Number(payment.amount); // sempre o valor que será cobrado

  // S18.6 — quando o founder contratou Fast Track Review, o backend cria
  // 2 Payments (TOKEN_RESERVATION + FAST_TRACK_REVIEW) com o mesmo txid
  // PIX. O checkout é carregado com o Payment principal (TOKEN_RESERVATION);
  // `payment.fastTrackPayment` traz o irmão para exibir o 2º produto no
  // resumo do pedido e o valor total consolidado.
  const fastTrackSibling = payment.fastTrackPayment;
  const fastTrackPresentation = fastTrackSibling
    ? getPaymentPresentation({
        ...payment,
        purpose: fastTrackSibling.purpose,
        amount: fastTrackSibling.amount,
      })
    : null;
  const fastTrackAmount = fastTrackSibling ? Number(fastTrackSibling.amount) : 0;

  // FAST_DEPLOY ("Publicação Rápida") — mesmo padrão do Fast Track, porém o
  // irmão é um Payment FAST_DEPLOY ligado à mesma Campaign (COMPLIANCE_FEE +
  // FAST_DEPLOY no mesmo PIX consolidado). `payment.fastDeployPayment` traz o
  // irmão para exibir o 2º produto no resumo e somar no total.
  const fastDeploySibling = payment.fastDeployPayment;
  const fastDeployPresentation = fastDeploySibling
    ? getPaymentPresentation({
        ...payment,
        purpose: fastDeploySibling.purpose,
        amount: fastDeploySibling.amount,
      })
    : null;
  const fastDeployAmount = fastDeploySibling
    ? Number(fastDeploySibling.amount)
    : 0;

  // Total = soma dos 2 Payments (ou só o principal se não houver Fast Track).
  // O desconto de cupom (se houver) continua sendo aplicado só ao `payment`
  // principal por enquanto — Fast Track ainda não recebe rateio.
  const totalAmount =
    Number(payment.amount) + fastTrackAmount + fastDeployAmount;
  const baseTotalAmount = discountApplied
    ? totalAmount + discountValue
    : totalAmount;

  // Juros de cartão: só aplicam quando o método é cartão, há parcelamento
  // (installments > 1) e a opção selecionada traz juros. O backend é a fonte
  // de verdade — aqui apenas espelhamos o valor retornado pela simulação.
  const { cardInterest, displayTotal } = computeCheckoutTotals({
    method,
    baseTotal: totalAmount,
    selectedInstallment,
  });

  // Modelo B — investimentos: o Payment.amount é o TOTAL cobrado do
  // investidor (subtotal de tokens + taxa da plataforma). O resumo separa
  // as duas linhas para transparência de cobrança.
  const invSplit = ehInvestimento ? payment.investment : null;
  const invSubtotal =
    invSplit?.tokenSubtotal != null ? Number(invSplit.tokenSubtotal) : null;
  const invFee =
    invSplit?.platformFeeAmount != null
      ? Number(invSplit.platformFeeAmount)
      : 0;
  const invFeePct =
    invSplit?.platformFeePct != null ? Number(invSplit.platformFeePct) : 0;
  const hasInvSplit = invSubtotal != null;

  return (
    <div className="relative w-full text-[#ffdbf3] font-sans selection:bg-primary selection:text-black">
      {/* Botão de Retorno */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#cc9dc0] hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {ehInvestimento && payment.status === "PENDING" && !isExpired && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-[#cc9dc0]">
            Esta ordem reserva os tokens até{" "}
            <strong className="text-primary">
              {payment.expiresAt
                ? new Date(payment.expiresAt).toLocaleTimeString("pt-BR")
                : "o vencimento"}
            </strong>
            .
          </p>
          <button
            type="button"
            onClick={() => void handleCancelOrder()}
            disabled={canceling}
            className="text-xs font-black uppercase tracking-widest text-destructive hover:underline disabled:opacity-50"
          >
            {canceling ? "Cancelando…" : "Cancelar ordem"}
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start",
          isExpired && "blur-sm pointer-events-none select-none",
        )}
      >
        {/* Left Column: Branding & Order Summary */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6">
          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-[#ffdbf3] leading-[1.15]">
              Conclua seu pagamento.
            </h1>
            <p className="text-xs sm:text-sm text-[#cc9dc0] leading-relaxed max-w-lg">
              Finalize para confirmar sua solicitação.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <Hexagon className="w-5 h-5 text-primary fill-primary/20" />
              <div className="h-px w-20 bg-primary/40" />
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-linear-to-br from-background via-background to-primary/30 backdrop-blur-xl p-5 sm:p-7 rounded-2xl border border-primary/20 space-y-4 shadow-xl">
            <h3 className="text-xs sm:text-sm font-black text-primary flex items-center gap-2 uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4" />
              Resumo do Pedido
            </h3>

            {/* Items List */}
            <div className="space-y-3">
              {/* Item 1: Payment principal (TOKEN_RESERVATION / SUBSCRIPTION / etc.) */}
              <div className="flex justify-between items-start border-b border-[#380e33] pb-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#ffdbf3]">
                    {presentation?.title}
                  </h4>
                  <p className="text-[11px] text-[#cc9dc0] mt-0.5">
                    {presentation?.description}
                  </p>
                  {presentation?.details.map((detail) => (
                    <p
                      key={detail}
                      className="text-[11px] text-[#cc9dc0] mt-0.5"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
                    {presentation?.quantityLabel}
                  </span>
                  {/* S18.6 — preço original riscado quando há desconto */}
                  {payment.originalAmount != null &&
                  payment.originalAmount > Number(payment.amount) ? (
                    <>
                      <span className="block text-[10px] text-[#cc9dc0]/60 line-through">
                        {formatBRL(Number(payment.originalAmount))}
                      </span>
                      <span className="block text-xs sm:text-sm font-bold text-emerald-400">
                        {formatBRL(Number(payment.amount))}
                      </span>
                    </>
                  ) : (
                    <span className="block text-xs sm:text-sm font-bold text-[#ffdbf3]">
                      {/* Investimento com split: o preço do item é o subtotal
                          de tokens; a taxa aparece em linha própria abaixo. */}
                      {formatBRL(hasInvSplit ? invSubtotal : Number(payment.amount))}
                    </span>
                  )}
                </div>
              </div>

              {/* Item 2 (S18.6): Fast Track Review — produto adicional no checkout
                  consolidado. Compartilha o mesmo txid PIX com o principal. */}
              {fastTrackSibling && fastTrackPresentation && (
                <div className="flex justify-between items-start border-b border-[#380e33] pb-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#ffdbf3]">
                      {fastTrackPresentation.title}
                    </h4>
                    <p className="text-[11px] text-[#cc9dc0] mt-0.5">
                      {fastTrackPresentation.description}
                    </p>
                    {fastTrackPresentation.details.map((detail) => (
                      <p
                        key={detail}
                        className="text-[11px] text-[#cc9dc0] mt-0.5"
                      >
                        {detail}
                      </p>
                    ))}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
                      {fastTrackPresentation.quantityLabel}
                    </span>
                    {/* S18.6 — preço original riscado quando há desconto */}
                    {fastTrackSibling.originalAmount != null &&
                    fastTrackSibling.originalAmount >
                      fastTrackSibling.amount ? (
                      <>
                        <span className="block text-[10px] text-[#cc9dc0]/60 line-through">
                          {formatBRL(fastTrackSibling.originalAmount)}
                        </span>
                        <span className="block text-xs sm:text-sm font-bold text-emerald-400">
                          {formatBRL(fastTrackAmount)}
                        </span>
                      </>
                    ) : (
                      <span className="block text-xs sm:text-sm font-bold text-[#ffdbf3]">
                        {formatBRL(fastTrackAmount)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* FAST_DEPLOY ("Publicação Rápida") — 2º produto do checkout
                  consolidado da Taxa de Compliance (mesmo txid PIX). */}
              {fastDeploySibling && fastDeployPresentation && (
                <div className="flex justify-between items-start border-b border-[#380e33] pb-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#ffdbf3]">
                      {fastDeployPresentation.title}
                    </h4>
                    <p className="text-[11px] text-[#cc9dc0] mt-0.5">
                      {fastDeployPresentation.description}
                    </p>
                    {fastDeployPresentation.details.map((detail) => (
                      <p
                        key={detail}
                        className="text-[11px] text-[#cc9dc0] mt-0.5"
                      >
                        {detail}
                      </p>
                    ))}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
                      {fastDeployPresentation.quantityLabel}
                    </span>
                    {/* Paridade com Fast Track (linhas 582-598) e Payment
                        principal (linhas 537-554): preço original riscado +
                        valor final em emerald quando o cupom já rateou o
                        desconto para o FAST_DEPLOY (coupon.service.ts S18.6).
                        Sem essa lógica, o usuário via "R$ 1.000,00" sem
                        strikethrough enquanto o COMPLIANCE_FEE ao lado
                        mostrava o desconto aplicado — confuso e enganoso. */}
                    {fastDeploySibling.originalAmount != null &&
                    fastDeploySibling.originalAmount > fastDeployAmount ? (
                      <>
                        <span className="block text-[10px] text-[#cc9dc0]/60 line-through">
                          {formatBRL(fastDeploySibling.originalAmount)}
                        </span>
                        <span className="block text-xs sm:text-sm font-bold text-emerald-400">
                          {formatBRL(fastDeployAmount)}
                        </span>
                      </>
                    ) : (
                      <span className="block text-xs sm:text-sm font-bold text-[#ffdbf3]">
                        {formatBRL(fastDeployAmount)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs text-[#cc9dc0]">
              <span>{hasInvSplit ? "Subtotal de tokens" : "Subtotal"}</span>
              <span className="font-bold text-[#ffdbf3]">
                {formatBRL(hasInvSplit ? invSubtotal : baseTotalAmount)}
              </span>
            </div>

            {/* Taxa da plataforma (Modelo B) — cobrada por cima do subtotal */}
            {hasInvSplit && invFee > 0 && (
              <div className="flex justify-between items-center text-xs text-[#cc9dc0]">
                <span>
                  Taxa da plataforma (
                  {(invFeePct * 100).toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}
                  %)
                </span>
                <span className="font-bold text-[#ffdbf3]">
                  {formatBRL(invFee)}
                </span>
              </div>
            )}

            {discountApplied && discountValue > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <span>
                  Desconto ({couponPercent > 0 ? `${couponPercent}%` : "Cupom"}
                  {couponCode ? ` ${couponCode}` : ""})
                </span>
                <span className="font-bold">-{formatBRL(discountValue)}</span>
              </div>
            )}

            {/* Discount Coupon Box */}
            {!discountApplied ? (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5 pt-1">
                <label className="block text-[10px] uppercase tracking-widest text-[#cc9dc0] font-bold">
                  Cupom de Desconto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Insira o código"
                    disabled={isCouponLocked}
                    className="flex-1 bg-[#380e33] border-none border-b-2 border-transparent focus:border-primary text-[#ffdbf3] placeholder:text-[#cc9dc0]/40 px-3.5 py-2.5 text-xs rounded-xl outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={applyCoupon.isPending || isCouponLocked}
                    className="bg-[#4a1844] hover:bg-[#5e1f57] text-primary font-black px-4 py-2.5 rounded-xl uppercase text-[10px] tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                </div>
                {isCouponLocked && (
                  <p className="flex items-center gap-1.5 text-[10px] leading-relaxed text-[#cc9dc0]">
                    <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    O cupom só pode ser aplicado enquanto o pagamento estiver
                    pendente.
                  </p>
                )}
              </form>
            ) : (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 pt-1">
                <div className="space-y-0.5">
                  <label className="block text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                    Cupom Aplicado
                  </label>
                  <p className="text-xs font-bold text-[#ffdbf3]">
                    {couponCode}
                    {couponPercent > 0 && (
                      <span className="text-emerald-400 ml-1.5">
                        ({couponPercent}% off)
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-emerald-400 text-lg">✓</span>
              </div>
            )}

            <div className="h-px w-full bg-primary/20 my-2" />

            {/* Juros do parcelamento (cartão, N>1) — espelha o valor que será
                cobrado na EFI (fonte de verdade: simulação do backend). */}
            {cardInterest > 0 && selectedInstallment && (
              <div className="flex justify-between items-center text-xs text-amber-300">
                <span>
                  Juros do parcelamento ({selectedInstallment.installments}x)
                </span>
                <span className="font-bold">+{formatBRL(cardInterest)}</span>
              </div>
            )}

            {/* Total Final */}
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                Total Final
              </span>
              <span className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                {formatBRL(displayTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Form / PIX Flow */}
        <div className="lg:col-span-6 xl:col-span-6 bg-linear-to-br from-background via-background to-primary/25 border border-primary/15 p-6 sm:p-8 rounded-3xl shadow-2xl">
          {payment.status === "PAID" ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center space-y-5">
              <BadgeCheck className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
              <div>
                <h2 className="text-xl font-black text-[#ffdbf3]">
                  Pagamento Confirmado!
                </h2>
                <p className="text-xs text-[#cc9dc0] mt-1.5">
                  Seu acesso foi liberado com sucesso. Redirecionando em{" "}
                  {countdown}s…
                </p>
              </div>
              <Link
                to="/home"
                className="inline-block w-full py-3.5 rounded-full bg-emerald-400 text-black font-black uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
              >
                Ir para a Home
              </Link>
            </div>
          ) : payment.status === "CANCELED" ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center space-y-5">
              <CircleAlert className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <h2 className="text-xl font-black text-[#ffdbf3]">
                  Pagamento Cancelado
                </h2>
                <p className="text-xs text-[#cc9dc0] mt-1.5">
                  Esta transação foi cancelada. Escolha outro plano para
                  continuar.
                </p>
              </div>
              <Link
                to="/pricing"
                className="inline-block w-full py-3.5 rounded-full bg-primary text-black font-black uppercase text-xs tracking-widest hover:opacity-90"
              >
                Ver Planos
              </Link>
            </div>
          ) : bloqueiaPerfil ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center space-y-5">
              <ShieldAlert className="w-12 h-12 mx-auto text-amber-400" />
              <div>
                <h2 className="text-xl font-black text-amber-300">
                  Perfil incompleto
                </h2>
                <p className="text-xs text-[#cc9dc0] mt-1.5">
                  Para realizar qualquer pagamento, seu perfil precisa estar
                  completo. Faltam os seguintes campos:
                </p>
                <ul className="text-xs text-[#ffdbf3] mt-3 space-y-1 text-left max-w-xs mx-auto">
                  {missingProfileFields.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-2 justify-center"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {PROFILE_FIELD_LABELS[
                        field as keyof typeof PROFILE_FIELD_LABELS
                      ] ?? field}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/profile"
                className="inline-block w-full py-3.5 rounded-full bg-amber-400 text-black font-black uppercase text-xs tracking-widest hover:opacity-90"
              >
                Completar Perfil
              </Link>
            </div>
          ) : bloqueiaInvestimento ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center space-y-5">
              <ShieldAlert className="w-12 h-12 mx-auto text-amber-400" />
              <div>
                <h2 className="text-xl font-black text-amber-300">
                  KYC Obrigatório
                </h2>
                <p className="text-xs text-[#cc9dc0] mt-1.5">
                  Para concluir este investimento, sua verificação de identidade
                  precisa ser aprovada.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-block w-full py-3.5 rounded-full bg-amber-400 text-black font-black uppercase text-xs tracking-widest hover:opacity-90"
              >
                Completar KYC
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Method Tabs */}
              <div className="flex border-b border-[#380e33] gap-8">
                <button
                  type="button"
                  onClick={() => setMethod("CREDIT_CARD")}
                  disabled={isLocked}
                  className={cn(
                    "pb-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-b-2",
                    method === "CREDIT_CARD"
                      ? "text-primary border-primary"
                      : "text-[#cc9dc0] border-transparent hover:text-[#ffdbf3]",
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("PIX");
                    setSelectedInstallment(null);
                  }}
                  disabled={isLocked}
                  className={cn(
                    "pb-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-b-2",
                    method === "PIX"
                      ? "text-primary border-primary"
                      : "text-[#cc9dc0] border-transparent hover:text-[#ffdbf3]",
                  )}
                >
                  <QrCode className="w-4 h-4" />
                  PIX
                </button>
              </div>

              {/* Credit Card View */}
              {method === "CREDIT_CARD" ? (
                <div className="space-y-4 xl:space-y-5 animate-in fade-in duration-300">
                  <CreditCardForm
                    paymentId={payment.id}
                    amount={finalAmount}
                    onApproved={() => revalidator.revalidate()}
                    onInstallmentChange={setSelectedInstallment}
                  />

                  {/* Trust Badges */}
                  <div className="flex justify-center items-center gap-5 pt-3 border-t border-[#380e33] text-[11px] text-[#cc9dc0]">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span>Criptografia SSL 256-bit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>Transação Segura</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* PIX View */
                <div className="animate-in fade-in duration-300">
                  <PixPayment
                    paymentId={payment.id}
                    initialCob={
                      payment.qrCodeBase64 || payment.copyPastePix
                        ? {
                            paymentId: payment.id,
                            txid: payment.txid ?? "",
                            qrCodeBase64: payment.qrCodeBase64,
                            copyPastePix: payment.copyPastePix,
                            amount: finalAmount,
                            expiresAt: payment.expiresAt ?? undefined,
                            status: payment.status,
                          }
                        : null
                    }
                    suppressCob={applyCoupon.isPending}
                    onStatusChange={handleStatusChange}
                  />

                  {/* Trust Badges */}
                  <div className="flex justify-center items-center gap-5 pt-4 mt-4 border-t border-[#380e33] text-[11px] text-[#cc9dc0]">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span>Criptografia SSL 256-bit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>Transação Segura</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Developer Simulation */}
              {import.meta.env.DEV && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSimulatePaid}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[#cc9dc0]/80 hover:text-primary transition-colors"
                  >
                    <Wand2 className="w-3 h-3 text-primary" />
                    Dev: Simular Pagamento Aprovado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpired && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="payment-expired-title"
          className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/70 p-6 backdrop-blur-md"
        >
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-destructive/40 bg-[#1f031d] p-8 text-center shadow-2xl">
            <CircleAlert className="mx-auto h-14 w-14 text-destructive" />
            <div>
              <h2
                id="payment-expired-title"
                className="text-2xl font-black text-[#ffdbf3]"
              >
                Pagamento expirado
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#cc9dc0]">
                O prazo desta ordem terminou e os tokens reservados foram
                liberados. Refaça o investimento para gerar uma nova ordem.
              </p>
            </div>
            <Link
              to={
                payment.investment?.campaign?.startup?.id
                  ? `/startups/${payment.investment.campaign.startup.id}`
                  : "/home"
              }
              className="inline-flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-xs font-black uppercase tracking-widest text-black hover:opacity-90"
            >
              Refazer investimento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
