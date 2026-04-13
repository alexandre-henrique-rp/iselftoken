import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, CreditCard, Loader2, Lock, User } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CheckoutCard } from "./checkout-card";
import type { InstallmentOption } from "./types";

const cardSchema = z.object({
  cardNumber: z.string().min(16, "Número inválido").max(19, "Número inválido"),
  cardholderName: z.string().min(3, "Nome obrigatório"),
  expiryDate: z.string().min(4, "Validade obrigatória"),
  cvv: z.string().min(3, "CVV obrigatório").max(4, "CVV inválido"),
  installments: z.coerce.number().min(1),
});

type CardFormValues = z.infer<typeof cardSchema>;

type CreditCardFormProps = {
  installments: InstallmentOption[];
  totalAmount: number;
  isProcessing: boolean;
  onSubmit: (data: CardFormValues) => void;
  onInstallmentsChange?: (installments: number) => void;
};

/**
 * @name CreditCardForm
 * @description Formulário de pagamento por cartão com validação.
 *
 * @param {CreditCardFormProps} props - Propriedades do componente.
 * @returns {JSX.Element} Formulário de cartão.
 */
export function CreditCardForm({
  installments,
  totalAmount,
  isProcessing,
  onSubmit,
  onInstallmentsChange,
}: CreditCardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      installments: 1,
      cardNumber: "",
      cardholderName: "",
      expiryDate: "",
      cvv: "",
    },
  });

  const selectedInstallment = useMemo(
    () =>
      installments.find(
        (option) => option.count === form.watch("installments"),
      ),
    [installments, form],
  );

  const watchedInstallments = form.watch("installments");

  useEffect(() => {
    if (onInstallmentsChange) {
      onInstallmentsChange(watchedInstallments);
    }
  }, [onInstallmentsChange, watchedInstallments]);

  return (
    <CheckoutCard>
      <div className="mb-6 flex items-center gap-3 border-b border-stone-800 pb-4">
        <CreditCard className="h-6 w-6 text-blue-500" />
        <h3 className="text-lg font-bold text-stone-50">Dados do Cartão</h3>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-stone-400">
            Número do Cartão
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              {...form.register("cardNumber")}
              placeholder="0000 0000 0000 0000"
              className="border-stone-800 bg-stone-950 pl-10 text-stone-100 placeholder:text-stone-600 focus-visible:ring-blue-600/50"
            />
            <p className="mt-1 text-xs text-red-400">
              {form.formState.errors.cardNumber?.message}
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-stone-400">
            Nome impresso no cartão
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              {...form.register("cardholderName")}
              placeholder="COMO NO CARTÃO"
              className="border-stone-800 bg-stone-950 pl-10 uppercase text-stone-100 placeholder:text-stone-600 focus-visible:ring-blue-600/50"
            />
            <p className="mt-1 text-xs text-red-400">
              {form.formState.errors.cardholderName?.message}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-400">
            Validade
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              {...form.register("expiryDate")}
              placeholder="MM/AA"
              maxLength={5}
              className="border-stone-800 bg-stone-950 pl-10 text-stone-100 placeholder:text-stone-600 focus-visible:ring-blue-600/50"
            />
            <p className="mt-1 text-xs text-red-400">
              {form.formState.errors.expiryDate?.message}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-400">
            CVV
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              {...form.register("cvv")}
              placeholder="123"
              maxLength={4}
              className="border-stone-800 bg-stone-950 pl-10 text-stone-100 placeholder:text-stone-600 focus-visible:ring-blue-600/50"
            />
            <p className="mt-1 text-xs text-red-400">
              {form.formState.errors.cvv?.message}
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-stone-400">
            Parcelamento
          </label>
          <select
            {...form.register("installments")}
            className="h-11 w-full rounded-md border border-stone-800 bg-stone-950 px-3 text-sm text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
          >
            {installments.map((option) => (
              <option key={option.count} value={option.count}>
                {option.count}x de R$ {option.value.toFixed(2)}{" "}
                {option.interest ? "(c/ juros)" : "sem juros"} - Total R${" "}
                {option.total.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          className="col-span-full w-full py-4 text-base"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Processando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Pagar R${" "}
              {(selectedInstallment?.total ?? totalAmount).toFixed(2)}
            </span>
          )}
        </Button>
      </form>
    </CheckoutCard>
  );
}
