import { ChevronDown, CreditCard, Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirmCardMutation } from "~/hooks/use-confirm-card-mutation";
import {
  useInstallmentOptions,
  type InstallmentOption,
} from "~/hooks/use-installment-options";
import { applyCpfCnpjMask, unmaskValue } from "~/lib/mask-utils";

interface CreditCardFormProps {
  paymentId: number;
  amount: number;
  /** Chamado quando a cobrança é aprovada (status PAID). */
  onApproved?: () => void;
  /**
   * Chamado quando a opção de parcelamento selecionada muda, para que o
   * resumo do pedido (checkout-payment) exiba juros e total coerentes com o
   * valor que será cobrado. O backend é a fonte de verdade do cálculo.
   */
  onInstallmentChange?: (option: InstallmentOption | null) => void;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Rótulo de uma opção de parcelamento. Os valores vêm do backend (fonte de
 * verdade): 1x é "à vista" (sem juros); N>1 mostra parcela e total com juros.
 */
function formatInstallmentOption(option: InstallmentOption): string {
  if (option.installments === 1) {
    return `à vista ${formatBRL(option.installmentAmount)}`;
  }
  const suffix =
    option.totalInterest > 0
      ? ` (total ${formatBRL(option.totalWithInterest)} com juros)`
      : ` (total ${formatBRL(option.totalWithInterest)})`;
  return `${option.installments}x de ${formatBRL(option.installmentAmount)}${suffix}`;
}

/** Formata número do cartão em grupos de 4 (só exibição). */
function maskCardNumber(digits: string): string {
  return digits
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * Formulário de cartão de crédito com tokenização EFI no navegador.
 *
 * Os dados do cartão NUNCA são enviados ao backend: a lib payment-token-efi
 * gera um `payment_token` no cliente, e só o token vai para a API.
 */
export function CreditCardForm({
  paymentId,
  amount,
  onApproved,
  onInstallmentChange,
}: CreditCardFormProps) {
  const [number, setNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDocument, setHolderDocument] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [installmentsOpen, setInstallmentsOpen] = useState(false);
  const installmentsRef = useRef<HTMLDivElement>(null);

  const confirmCard = useConfirmCardMutation();

  // Backend é a fonte de verdade: as opções de parcelamento (valores, juros,
  // parcela mínima) vêm da simulação calculada no servidor sobre o valor
  // atual do pagamento (já líquido de cupom).
  const {
    data: simulation,
    isLoading: loadingInstallments,
    isError: installmentsError,
  } = useInstallmentOptions(paymentId, amount);

  const options = useMemo(() => simulation?.options ?? [], [simulation]);

  const selectedOption = useMemo(
    () => options.find((o) => o.installments === installments) ?? null,
    [options, installments],
  );

  // Garante que a seleção seja sempre uma opção válida (não abaixo do mínimo).
  // Se a opção atual sumir ou ficar inválida (ex.: após cupom), volta p/ 1x.
  useEffect(() => {
    if (options.length === 0) return;
    const current = options.find((o) => o.installments === installments);
    if (!current || current.belowMinimum) {
      setInstallments(1);
    }
  }, [options, installments]);

  // Notifica o resumo do pedido sobre a parcela selecionada (para exibir
  // juros/total coerentes com a cobrança).
  useEffect(() => {
    onInstallmentChange?.(selectedOption);
  }, [selectedOption, onInstallmentChange]);

  useEffect(() => {
    if (!installmentsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!installmentsRef.current?.contains(event.target as Node)) {
        setInstallmentsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInstallmentsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [installmentsOpen]);

  const handleSubmit = () => {
    const digits = number.replace(/\D/g, "");
    const [mm, yy] = expiry.split("/");
    if (digits.length < 13) {
      toast.error("Número do cartão inválido.");
      return;
    }
    if (!mm || !yy || yy.length < 2) {
      toast.error("Validade inválida (use MM/AA).");
      return;
    }
    if (!holderName.trim()) {
      toast.error("Informe o nome impresso no cartão.");
      return;
    }
    // CPF (11 dígitos) ou CNPJ (14 dígitos). Sem fallback silencioso:
    // a EFI exige o campo e retorna 3500034 validation_error se ausente.
    const docDigits = unmaskValue(holderDocument);
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      toast.error("CPF/CNPJ do titular inválido (informe 11 ou 14 dígitos).");
      return;
    }
    // Expande AA -> 20AA (a EFI espera YYYY).
    const expirationYear = yy.length === 2 ? `20${yy}` : yy;

    confirmCard.mutate(
      {
        paymentId,
        card: {
          number: digits,
          holderName: holderName.trim(),
          // Envia SEM formatação para o backend (a EFI e o BFF
          // recebem só dígitos via `cardholderDocument`).
          holderDocument: unmaskValue(holderDocument),
          expirationMonth: mm.padStart(2, "0"),
          expirationYear,
          cvv: cvv.replace(/\D/g, ""),
          installments,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pagamento aprovado!");
          onApproved?.();
        },
      },
    );
  };

  const disabled = confirmCard.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-[11px] text-primary font-bold tracking-wider uppercase">
          Número do Cartão
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(maskCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            disabled={disabled}
            className="w-full bg-accent/30 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground/40 px-3.5 py-2.5 text-sm font-mono rounded-xl outline-none transition-colors disabled:opacity-60"
          />
          <CreditCard className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-primary font-bold tracking-wider uppercase">
          Nome Impresso no Cartão
        </label>
        <input
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
          placeholder="NOME DO TITULAR"
          disabled={disabled}
          className="w-full bg-accent/30 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground/40 px-3.5 py-2.5 text-xs uppercase rounded-xl outline-none transition-colors disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] text-primary font-bold tracking-wider uppercase">
          CPF/CNPJ do Titular
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={holderDocument}
          // Exibe MASCARADO (CPF até 11 dígitos, CNPJ 12-14);
          // envia SEM formatação ao backend via `unmaskValue` no submit.
          onChange={(e) => setHolderDocument(applyCpfCnpjMask(e.target.value))}
          placeholder="000.000.000-00 ou 00.000.000/0001-00"
          maxLength={18}
          disabled={disabled}
          className="w-full bg-accent/30 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground/40 px-3.5 py-2.5 text-xs font-mono rounded-xl outline-none transition-colors disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] text-primary font-bold tracking-wider uppercase">
            Validade
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
            }}
            placeholder="MM/AA"
            disabled={disabled}
            className="w-full bg-accent/30 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground/40 px-3.5 py-2.5 text-xs font-mono rounded-xl outline-none transition-colors disabled:opacity-60"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] text-primary font-bold tracking-wider uppercase">
            CVV
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cvv}
            onChange={(e) =>
              setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="123"
            disabled={disabled}
            className="w-full bg-accent/30 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground/40 px-3.5 py-2.5 text-xs font-mono rounded-xl outline-none transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          id="installments-label"
          className="block text-[11px] font-bold uppercase tracking-wider text-primary"
        >
          Parcelamento
        </label>
        <div ref={installmentsRef} className="relative">
          <button
            type="button"
            role="combobox"
            aria-expanded={installmentsOpen}
            aria-controls="installments-options"
            aria-haspopup="listbox"
            aria-labelledby="installments-label"
            disabled={disabled || loadingInstallments || options.length === 0}
            onClick={() => setInstallmentsOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setInstallmentsOpen(false);
              if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                setInstallmentsOpen(true);
              }
            }}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-accent/30 px-3.5 py-2.5 text-left text-xs text-foreground outline-none transition-colors hover:border-primary/60 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              {loadingInstallments
                ? "Calculando parcelas…"
                : installmentsError
                  ? "Parcelamento indisponível"
                  : selectedOption
                    ? formatInstallmentOption(selectedOption)
                    : "Selecione o parcelamento"}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-primary transition-transform ${
                installmentsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {installmentsOpen && options.length > 0 && (
            <div
              id="installments-options"
              role="listbox"
              aria-labelledby="installments-label"
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-primary/40 bg-background/95 p-1 shadow-2xl backdrop-blur-xl"
            >
              {options.map((option) => {
                const selected = installments === option.installments;
                return (
                  <button
                    key={option.installments}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.belowMinimum}
                    disabled={option.belowMinimum}
                    onClick={() => {
                      if (option.belowMinimum) return;
                      setInstallments(option.installments);
                      setInstallmentsOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                      option.belowMinimum
                        ? "cursor-not-allowed text-muted-foreground/40"
                        : selected
                          ? "bg-primary/15 text-primary"
                          : "text-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {formatInstallmentOption(option)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {simulation && simulation.minInstallmentAmount > 0 && (
          <p className="text-[10px] text-muted-foreground/70">
            Parcela mínima de {formatBRL(simulation.minInstallmentAmount)}.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full bg-linear-to-r from-primary to-primary-container text-black font-black py-4 rounded-full uppercase text-xs sm:text-sm tracking-widest shadow-[0_0_24px_rgba(240,132,255,0.35)] hover:shadow-[0_0_40px_rgba(240,132,255,0.55)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {disabled ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processando...
          </>
        ) : (
          <>
            Finalizar Pagamento
            <Lock className="w-4 h-4 stroke-3" />
          </>
        )}
      </button>
    </div>
  );
}
