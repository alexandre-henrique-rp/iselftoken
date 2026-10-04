/**
 * CouponField — Input de cupom com estados
 *
 * Estados: idle | applying | applied | invalid | expired
 * 6 mensagens 422 distintas do backend
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApplyCoupon } from "~/hooks/use-apply-coupon";
import { validateCouponCode } from "~/lib/api/coupons";

interface CouponFieldProps {
  paymentId: string;
  onApplySuccess?: (
    discountAmount: number,
    newTotal: number,
    code?: string,
  ) => void;
}

type CouponState = "idle" | "applying" | "applied" | "invalid" | "expired";

export function CouponField({ paymentId, onApplySuccess }: CouponFieldProps) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<CouponState>("idle");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const applyMutation = useApplyCoupon();

  const handleApply = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Digite um código de cupom", { richColors: true });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();

    if (!validateCouponCode(normalizedCode)) {
      setState("invalid");
      toast.error("Código de cupom inválido", { richColors: true });
      return;
    }

    setState("applying");

    try {
      const result = await applyMutation.mutateAsync({
        couponCode: normalizedCode,
        paymentId: Number(paymentId),
      });

      if (result.success) {
        setState("applied");
        setAppliedCode(normalizedCode);
        onApplySuccess?.(
          result.discountAmount!,
          result.newTotal!,
          normalizedCode,
        );
      }
    } catch {
      // Mutation handles toast via onError
      setState("invalid");
    }
  }, [code, paymentId, applyMutation, onApplySuccess]);

  const handleReset = useCallback(() => {
    setCode("");
    setState("idle");
    setAppliedCode(null);
  }, []);

  const isApplied = state === "applied";
  const isLoading = state === "applying";

  return (
    <div
      className="flex flex-col gap-2"
      role="region"
      aria-label="Cupom de desconto"
    >
      {isApplied ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30">
          <svg
            className="w-5 h-5 text-success flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium text-success">
              Cupom {appliedCode} aplicado!
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-on-surface-dim hover:text-on-surface transition-colors"
            aria-label="Remover cupom"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (state === "invalid") setState("idle");
              }}
              placeholder="Código do cupom"
              disabled={isLoading}
              maxLength={32}
              className={`input-field-kinetic uppercase ${
                state === "invalid" ? "border-danger ring-2 ring-danger/20" : ""
              }`}
              aria-label="Código do cupom de desconto"
              aria-invalid={state === "invalid"}
              aria-describedby={
                state === "invalid" ? "coupon-error-message" : undefined
              }
            />
            {state === "invalid" && (
              <p
                id="coupon-error-message"
                className="text-xs text-danger flex items-center gap-1"
                role="alert"
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                Cupom inválido. Verifique o código.
              </p>
            )}
          </div>

          <button
            data-testid="apply-coupon-btn"
            onClick={handleApply}
            disabled={isLoading || !code.trim()}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              "Aplicar"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
