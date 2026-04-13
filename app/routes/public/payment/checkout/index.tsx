import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types";
import {
  CheckoutCard,
  CheckoutHeader,
  CheckoutSummary,
  CreditCardForm,
  PaymentMethodSelect,
  PixPayment,
} from "./components/index";
import type {
  CheckoutStep,
  InstallmentOption,
  PaymentMethod,
  TransactionData,
} from "./components/types";

type LoaderData = {
  transaction: TransactionData | null;
  transactionId?: string;
  error?: string;
};

type TransactionsApiPayload = {
  method: string;
  purpose: string;
  amount: number;
  currency: string;
  description: string;
  planId?: number;
  subscriptionId?: number;
  campaignId?: number;
  orderId?: number;
};

type PixData = {
  qrCodeText: string;
  expiresAt: string;
};

type PaymentResult = {
  status: "approved" | "pending" | "rejected" | "error";
  transactionId: string;
  paymentId?: string;
  message?: string;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const buildTransactionsPayload = (
  transactionData: TransactionData,
): TransactionsApiPayload => {
  const metadata = transactionData.product.metadata ?? {};
  const purpose = transactionData.purpose ?? "SUBSCRIPTION";

  const payload: TransactionsApiPayload = {
    method: transactionData.paymentMethod ?? "CREDIT_CARD",
    purpose,
    amount: transactionData.summary.total,
    currency: transactionData.product.currency ?? "BRL",
    description: transactionData.product.name,
  };

  if (purpose === "SUBSCRIPTION") {
    payload.planId =
      toOptionalNumber(transactionData.product.id) ??
      toOptionalNumber(metadata.planId);
    payload.subscriptionId = toOptionalNumber(metadata.subscriptionId);
  }

  if (purpose === "TOKEN_RESERVATION" || purpose === "INVESTMENT") {
    payload.campaignId =
      toOptionalNumber(metadata.campaignId) ??
      toOptionalNumber(metadata.startupId) ??
      toOptionalNumber(transactionData.product.id);
  }

  if (purpose === "P2P_BUY") {
    payload.orderId =
      toOptionalNumber(metadata.orderId) ??
      toOptionalNumber(transactionData.product.id);
  }

  return payload;
};

/**
 * @name loader
 * @description Valida o token de checkout via API interna.
 *
 * @param {Route.LoaderArgs} args - Dados da requisição.
 * @returns {Promise<Response>} Dados da transação.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const token = params.token ? decodeURIComponent(params.token) : undefined;

  if (!token) {
    return Response.json(
      { transaction: null, error: "Token não informado" },
      { status: 400 },
    );
  }

  // Valida o token de checkout
  const validateUrl = new URL("/api/payment/validate", request.url);
  const api = await fetch(validateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await api.json();

  if (!api.ok || data?.error) {
    return Response.json(
      { transaction: null, error: data?.error ?? "Token inválido" },
      { status: api.status },
    );
  }

  const transactionData = data.transaction as TransactionData;

  // Cria a transação na API externa
  const transactionsUrl = new URL("/api/payment/transactions", request.url);
  const transactionResponse = await fetch(transactionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(buildTransactionsPayload(transactionData)),
  });

  const transactionResult = await transactionResponse.json();

  if (!transactionResponse.ok || transactionResult?.error) {
    return Response.json(
      {
        transaction: null,
        error: transactionResult?.message ?? "Erro ao criar transação",
      },
      { status: transactionResponse.status },
    );
  }

  const transactionId = transactionResult.data?.id ?? transactionResult.id;

  // Atualiza a transação com o ID real
  const updatedTransaction: TransactionData = {
    ...transactionData,
    transactionId: String(transactionId),
  };

  return Response.json({
    transaction: updatedTransaction,
    transactionId: String(transactionId),
  });
}

/**
 * @name meta
 * @description Define metadados da página de checkout.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Checkout | iSelfToken" }];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const calculateInstallments = (total: number): InstallmentOption[] => {
  const installments: InstallmentOption[] = [];
  const interestRate = 0.02;

  for (let count = 1; count <= 10; count += 1) {
    if (count <= 5) {
      installments.push({
        count,
        value: total / count,
        total,
        interest: false,
      });
    } else {
      const months = count - 5;
      const interest = total * interestRate * months;
      const totalWithInterest = total + interest;

      installments.push({
        count,
        value: totalWithInterest / count,
        total: totalWithInterest,
        interest: true,
      });
    }
  }

  return installments;
};

/**
 * @name Checkout
 * @description Renderiza a tela de checkout com etapas e métodos de pagamento.
 */
export default function Checkout({ loaderData }: Route.ComponentProps) {
  const { transaction, error } = loaderData as LoaderData;
  const [step, setStep] = useState<CheckoutStep>("review");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CREDIT_CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixStatus, setPixStatus] = useState("Aguardando");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null,
  );
  const [installments, setInstallments] = useState(1);
  const [expiresIn, setExpiresIn] = useState("00:00");

  const installmentOptions = useMemo(() => {
    if (!transaction) return [];
    return calculateInstallments(transaction.summary.total);
  }, [transaction]);

  const selectedInstallment = installmentOptions.find(
    (option) => option.count === installments,
  );

  const installmentLabel = selectedInstallment
    ? `em ${selectedInstallment.count}x de ${formatCurrency(
        selectedInstallment.value,
      )}`
    : undefined;

  useEffect(() => {
    if (!pixData?.expiresAt) return;

    const timer = setInterval(() => {
      const diff = new Date(pixData.expiresAt).getTime() - Date.now();
      const minutes = Math.max(0, Math.floor(diff / 60000));
      const seconds = Math.max(0, Math.floor((diff % 60000) / 1000));
      setExpiresIn(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [pixData?.expiresAt]);

  useEffect(() => {
    if (!transaction || step !== "payment" || paymentMethod !== "PIX") return;
    if (pixData) return;

    const generatePix = async () => {
      const response = await fetch("/api/payment/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transactionId: transaction.transactionId }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        setPixStatus("Erro ao gerar PIX");
        return;
      }

      setPixData({
        qrCodeText: data.qrCodeText,
        expiresAt: data.expiresAt,
      });
    };

    generatePix();
  }, [paymentMethod, pixData, step, transaction]);

  useEffect(() => {
    if (!transaction || step !== "payment" || paymentMethod !== "PIX") return;
    if (!pixData) return;

    const interval = setInterval(async () => {
      const response = await fetch("/api/payment/pix/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transactionId: transaction.transactionId }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        setPixStatus("Erro ao consultar status");
        return;
      }

      if (data.status === "paid") {
        setPaymentResult({
          status: "approved",
          transactionId: transaction.transactionId,
        });
        setStep("confirmation");
      } else {
        setPixStatus("Aguardando");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentMethod, pixData, step, transaction]);

  if (!transaction || error) {
    return (
      <div className="min-h-screen bg-stone-950 px-4 py-12 text-stone-50">
        <div className="mx-auto max-w-md">
          <CheckoutCard className="border-red-500/20 bg-red-500/5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-red-400">
              Erro na Transação
            </h2>
            <p className="mb-6 text-stone-400">
              {error ?? "Não foi possível validar o token."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-stone-800 px-4 py-3 text-sm font-medium text-stone-200 hover:bg-stone-700"
            >
              Tentar novamente
            </button>
          </CheckoutCard>
        </div>
      </div>
    );
  }

  const handleCardPayment = async (data: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
    installments: number;
  }) => {
    setIsProcessing(true);

    const response = await fetch("/api/payment/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        transactionId: transaction.transactionId,
        cardData: data,
        installments: data.installments,
        amount: transaction.summary.total,
      }),
    });

    const result = await response.json();

    if (!response.ok || result?.error) {
      setIsProcessing(false);
      setPaymentResult({
        status: "error",
        transactionId: transaction.transactionId,
        message: result?.error ?? "Pagamento não aprovado",
      });
      return;
    }

    setPaymentResult({
      status: "approved",
      transactionId: transaction.transactionId,
      paymentId: result.paymentId,
    });
    setIsProcessing(false);
    setStep("confirmation");
  };

  const handlePixCopy = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.qrCodeText);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50">
      <CheckoutHeader transactionId={transaction.transactionId} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {step === "confirmation" && paymentResult ? (
              <CheckoutCard className="border-green-500/20 bg-green-500/5 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-2 text-3xl font-bold">
                  Pagamento Confirmado!
                </h2>
                <p className="mb-8 text-stone-400">
                  Sua transação foi processada com sucesso. Você receberá um
                  e-mail com os detalhes.
                </p>
                <div className="mx-auto mb-8 max-w-sm rounded-xl border border-stone-800 bg-stone-950/50 p-4">
                  <p className="mb-1 text-xs uppercase text-stone-500">
                    Comprovante
                  </p>
                  <p className="text-lg font-mono text-stone-200">
                    {paymentResult.transactionId}
                  </p>
                </div>
                <button
                  type="button"
                  className="mx-auto w-full max-w-sm rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Ir para Meus Investimentos
                </button>
              </CheckoutCard>
            ) : (
              <>
                <div className="flex items-center">
                  <div
                    className={`flex items-center gap-2 ${
                      step === "review" || step === "payment"
                        ? "text-blue-400"
                        : "text-stone-600"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold ${
                        step === "review" || step === "payment"
                          ? "border-blue-400 bg-blue-400/10"
                          : "border-stone-700"
                      }`}
                    >
                      1
                    </div>
                    <span className="font-medium">Identificação</span>
                  </div>
                  <div className="mx-3 h-0.5 w-12 bg-stone-800" />
                  <div
                    className={`flex items-center gap-2 ${
                      step === "payment" ? "text-blue-400" : "text-stone-500"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold ${
                        step === "payment"
                          ? "border-blue-400 bg-blue-400/10"
                          : "border-stone-700"
                      }`}
                    >
                      2
                    </div>
                    <span className="font-medium">Pagamento</span>
                  </div>
                </div>

                {step === "review" && (
                  <div className="space-y-6">
                    <CheckoutCard>
                      <div className="mb-6 flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-stone-400">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-stone-200">
                            {transaction.buyer.name}
                          </h3>
                          <p className="text-sm text-stone-400">
                            {transaction.buyer.email}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            CPF: {transaction.buyer.document}
                          </p>
                        </div>
                      </div>
                    </CheckoutCard>

                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-stone-50">
                        Como você prefere pagar?
                      </h3>
                      <PaymentMethodSelect
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setStep("payment")}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-500 md:w-auto"
                      >
                        Continuar <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === "payment" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      className="mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar e alterar
                      método
                    </button>

                    {paymentMethod === "CREDIT_CARD" ? (
                      <CreditCardForm
                        installments={installmentOptions}
                        totalAmount={transaction.summary.total}
                        isProcessing={isProcessing}
                        onSubmit={handleCardPayment}
                        onInstallmentsChange={setInstallments}
                      />
                    ) : (
                      <PixPayment
                        pixCode={pixData?.qrCodeText ?? "Gerando código PIX..."}
                        expiresIn={expiresIn}
                        statusLabel={pixStatus}
                        isProcessing={isProcessing}
                        onCopy={handlePixCopy}
                        onConfirm={() => setIsProcessing(true)}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <CheckoutSummary
            transaction={transaction}
            paymentMethod={paymentMethod}
            installmentLabel={installmentLabel}
            formatCurrency={formatCurrency}
          />
        </div>
      </main>
    </div>
  );
}
