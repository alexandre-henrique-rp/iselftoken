import { ShieldCheck, Wallet } from "lucide-react";
import { CheckoutCard } from "./checkout-card";
import type { PaymentMethod, TransactionData } from "./types";

type CheckoutSummaryProps = {
  transaction: TransactionData;
  paymentMethod: PaymentMethod;
  installmentLabel?: string;
  formatCurrency: (value: number) => string;
};

/**
 * @name CheckoutSummary
 * @description Bloco de resumo da transação exibido na sidebar.
 *
 * @param {CheckoutSummaryProps} props - Propriedades do componente.
 * @returns {JSX.Element} Resumo do pedido.
 */
export function CheckoutSummary({
  transaction,
  paymentMethod,
  installmentLabel,
  formatCurrency,
}: CheckoutSummaryProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-24">
      <CheckoutCard className="bg-stone-900/50 backdrop-blur">
        <h3 className="mb-6 border-b border-stone-800 pb-4 text-lg font-bold text-stone-50">
          Resumo do Pedido
        </h3>

        <div className="mb-6 flex gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-500">
            <Wallet className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-stone-200">
              {transaction.product.name}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {transaction.product.description}
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-3 border-t border-stone-800 pt-4 text-sm">
          <div className="flex justify-between text-stone-400">
            <span>Subtotal</span>
            <span>{formatCurrency(transaction.summary.subtotal)}</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>Taxas</span>
            <span>{formatCurrency(transaction.summary.fees)}</span>
          </div>
          {transaction.summary.discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Desconto</span>
              <span>- {formatCurrency(transaction.summary.discount)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-800 pt-4">
          <span className="font-semibold text-stone-200">Total a pagar</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-stone-50">
              {formatCurrency(transaction.summary.total)}
            </p>
            {paymentMethod === "CREDIT_CARD" && installmentLabel && (
              <p className="text-xs text-stone-500">{installmentLabel}</p>
            )}
          </div>
        </div>
      </CheckoutCard>

      <div className="flex items-start gap-3 rounded-xl border border-blue-900/20 bg-blue-900/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-400" />
        <div>
          <p className="text-sm font-semibold text-blue-200">
            Compra Garantida
          </p>
          <p className="mt-1 text-xs leading-relaxed text-blue-300/70">
            Seus dados estão protegidos com criptografia de ponta a ponta.
          </p>
        </div>
      </div>
    </div>
  );
}
