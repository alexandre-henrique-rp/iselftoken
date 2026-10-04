/**
 * MyCouponsGrid — Grid de cupons disponíveis para usuário
 */

import { useState } from "react";
import { toast } from "sonner";
import { NoCouponsEmpty } from "~/components/ui/empty-states";
import { useAvailableCoupons } from "~/hooks/use-available-coupons";
import { useMyCouponUsage } from "~/hooks/use-my-coupon-usage";
import {
  formatExpiryDate,
  type AvailableCoupon,
  type CouponUsageStatus,
} from "~/lib/api/coupons";

interface MyCouponsGridProps {
  onApplyCoupon?: (code: string) => void;
}

export function MyCouponsGrid({ onApplyCoupon }: MyCouponsGridProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { data: availableData, isLoading } = useAvailableCoupons();
  const { data: usageData } = useMyCouponUsage();

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Código ${code} copiado!`, { richColors: true });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Falha ao copiar código", { richColors: true });
    }
  };

  const coupons = availableData?.coupons ?? [];
  const hero = availableData?.hero ?? null;
  const usageHistory = usageData?.data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <NoCouponsEmpty
        title="Nenhum cupom disponível"
        description="No momento não há cupons ativos. Fique atento a novas promoções!"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero coupon */}
      {hero && (
        <div className="relative p-8 rounded-3xl overflow-hidden glass-strong">
          {/* Gradient border via pseudo-element */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, #f084ff 0%, #ea6bff 60%, #d500f9 100%)",
              padding: "2px",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
            aria-hidden="true"
          />
          <div className="relative bg-surface-dim rounded-[22px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-dim uppercase tracking-wider mb-1">
                  Melhor desconto
                </p>
                <p className="text-6xl font-black text-gradient">
                  {hero.percent}%
                </p>
                <code className="font-mono text-sm text-primary mt-2 block">
                  {hero.code}
                </code>
              </div>
              <div className="flex flex-col items-end gap-2">
                {hero.isExhausted || hero.isExpired ? (
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      hero.isExpired ? "pill-expired" : "pill-exhausted"
                    }`}
                  >
                    {hero.isExpired ? "Expirado" : "Esgotado"}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleCopy(hero.code)}
                      className="px-4 py-2 rounded-xl border border-outline text-on-surface text-sm hover:bg-surface-container transition-colors"
                      aria-label={`Copiar código ${hero.code}`}
                    >
                      {copiedCode === hero.code ? "Copiado!" : "Copiar"}
                    </button>
                    {onApplyCoupon && (
                      <button
                        onClick={() => onApplyCoupon(hero.code)}
                        className="btn-accent px-4 py-2 rounded-xl font-bold text-sm"
                      >
                        Aplicar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-on-surface-dim mt-4">
              Válido até {formatExpiryDate(hero.validUntil)}
            </p>
          </div>
        </div>
      )}

      {/* Coupons grid */}
      <div>
        <h3 className="text-lg font-bold text-on-surface mb-4">
          Cupons disponíveis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons
            .filter((c) => c.id !== hero?.id)
            .map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onCopy={handleCopy}
                onApply={onApplyCoupon}
                copied={copiedCode === coupon.code}
              />
            ))}
        </div>
      </div>

      {/* Usage history */}
      {usageHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-on-surface mb-4">
            Meu histórico
          </h3>
          <ul className="flex flex-col gap-2">
            {usageHistory.map((usage, index) => (
              <li
                key={`${usage.couponCode}-${usage.appliedAt}-${index}`}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container"
              >
                <div>
                  <code className="font-mono text-sm text-primary">
                    {usage.couponCode}
                  </code>
                  <p className="text-xs text-on-surface-dim mt-1">
                    Aplicado em{" "}
                    {new Date(usage.appliedAt).toLocaleDateString("pt-BR")}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${usageStatusClass(usage.usageStatus)}`}
                  >
                    {humanizeUsageStatus(usage.usageStatus)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-success">
                  -{usage.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CouponCard({
  coupon,
  onCopy,
  onApply,
  copied,
}: {
  coupon: AvailableCoupon;
  onCopy: (code: string) => void;
  onApply?: (code: string) => void;
  copied: boolean;
}) {
  const isDisabled = coupon.isExhausted || coupon.isExpired;

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-3xl font-black text-primary">
            {coupon.percent}%
          </span>
          <code className="font-mono text-sm text-on-surface-variant block mt-1">
            {coupon.code}
          </code>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            coupon.isExhausted
              ? "pill-exhausted"
              : coupon.isExpired
                ? "pill-expired"
                : "pill-active"
          }`}
        >
          {coupon.isExhausted
            ? "Esgotado"
            : coupon.isExpired
              ? "Expirado"
              : "Disponível"}
        </span>
      </div>

      <p className="text-xs text-on-surface-dim">
        {formatExpiryDate(coupon.validUntil)}
      </p>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onCopy(coupon.code)}
          disabled={isDisabled}
          className="flex-1 px-3 py-2 rounded-lg border border-outline text-on-surface text-xs hover:bg-surface-container transition-colors disabled:opacity-50"
          aria-label={`Copiar código ${coupon.code}`}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
        {onApply && (
          <button
            onClick={() => onApply(coupon.code)}
            disabled={isDisabled}
            className="flex-1 btn-accent px-3 py-2 rounded-lg font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        )}
      </div>
    </div>
  );
}

function humanizeUsageStatus(status: CouponUsageStatus): string {
  if (status === "CONFIRMED") return "Confirmado";
  if (status === "RESERVED") return "Reserva pendente";
  return "Liberado";
}

function usageStatusClass(status: CouponUsageStatus): string {
  if (status === "CONFIRMED") return "bg-primary/10 text-primary";
  if (status === "RESERVED") return "bg-amber-400/10 text-amber-300";
  return "bg-white/10 text-muted-foreground";
}
