import { CreditCard, QrCode } from "lucide-react";
import type { PaymentMethod } from "./types";

type PaymentMethodSelectProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
};

/**
 * @name PaymentMethodSelect
 * @description Seleção de método de pagamento (cartão/PIX).
 *
 * @param {PaymentMethodSelectProps} props - Propriedades do componente.
 * @returns {JSX.Element} Rádio cards de método.
 */
export function PaymentMethodSelect({
  value,
  onChange,
}: PaymentMethodSelectProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label
        className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
          value === "CREDIT_CARD"
            ? "border-blue-600 bg-blue-600/5"
            : "border-stone-800 bg-stone-900 hover:border-stone-700"
        }`}
      >
        <input
          type="radio"
          name="method"
          className="hidden"
          checked={value === "CREDIT_CARD"}
          onChange={() => onChange("CREDIT_CARD")}
        />
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            value === "CREDIT_CARD" ? "border-blue-600" : "border-stone-600"
          }`}
        >
          {value === "CREDIT_CARD" && (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-stone-200" />
            <span className="font-semibold text-stone-200">Cartão de Crédito</span>
          </div>
          <p className="text-xs text-stone-500">Até 10x (5x sem juros)</p>
        </div>
      </label>

      <label
        className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
          value === "PIX"
            ? "border-blue-600 bg-blue-600/5"
            : "border-stone-800 bg-stone-900 hover:border-stone-700"
        }`}
      >
        <input
          type="radio"
          name="method"
          className="hidden"
          checked={value === "PIX"}
          onChange={() => onChange("PIX")}
        />
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            value === "PIX" ? "border-blue-600" : "border-stone-600"
          }`}
        >
          {value === "PIX" && (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-stone-200" />
            <span className="font-semibold text-stone-200">PIX</span>
          </div>
          <p className="text-xs text-stone-500">Aprovação imediata</p>
        </div>
      </label>
    </div>
  );
}
