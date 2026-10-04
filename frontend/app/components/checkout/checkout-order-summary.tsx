import { CouponField } from "~/components/checkout/coupon-field";

interface OrderItem {
  name: string;
  description: string;
  price: number;
  quantity?: string;
  icon: "network" | "rocket" | "headset";
}

interface CheckoutOrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentId: string;
  discount: number;
  couponCode: string | null;
  onCouponApplied: (discount: number, newTotal: number, code?: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ItemIcon({ type }: { type: OrderItem["icon"] }) {
  if (type === "rocket") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M14.5 4.5c2.1-2.1 4.5-2.5 5.5-2.5 0 1-.4 3.4-2.5 5.5l-5.1 5.1-3.5-3.5 5.6-4.6Z" />
        <path d="m8.9 9.1-3.2.7-2.2 2.2 5 1.2M14.9 15.1l-.7 3.2-2.2 2.2-1.2-5" />
        <circle cx="16.8" cy="7.2" r="1.2" />
      </svg>
    );
  }

  if (type === "headset") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2ZM20 13v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
        <path d="M17 19c0 1.1-1.8 2-4 2h-1" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" />
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="7" r="2" />
      <circle cx="5" cy="17" r="2" />
      <circle cx="19" cy="17" r="2" />
      <path d="m10.4 10.8-3.8-2.6M13.6 10.8l3.8-2.6M10.4 13.2l-3.8 2.6M13.6 13.2l3.8 2.6" />
    </svg>
  );
}

export function CheckoutOrderSummary({
  items,
  subtotal,
  total,
  paymentId,
  discount,
  couponCode,
  onCouponApplied,
}: CheckoutOrderSummaryProps) {
  return (
    <section className="checkout-summary-panel" aria-label="Resumo do pedido">
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#f7d8f5]">
        <span className="hidden lg:inline-flex">
          <svg
            className="h-4 w-4 text-[#ec6cff]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 5h16v14H4zM8 9h8M8 13h5" />
          </svg>
        </span>
        <span className="lg:hidden text-xl">Order Summary</span>
        <span className="hidden lg:inline">Resumo do Pedido</span>
      </h2>

      <div className="checkout-items-card mt-5 divide-y divide-[#5d194f]/70">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-3 py-4 first:pt-0 last:pb-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#501243] text-[#ee75ff]">
              <ItemIcon type={item.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#f7d8f5]">
                {item.name}
              </p>
              <p className="truncate text-[10px] text-[#b98aad]">
                {item.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-[#d58cca]">{item.quantity}</p>
              <p className="text-xs font-semibold text-[#ef72ff]">
                {formatCurrency(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="checkout-summary-breakdown mt-1 flex items-center justify-between border-t border-[#5d194f]/70 pt-4 text-[11px]">
        <span className="text-[#bc91b0]">Subtotal</span>
        <span className="text-[#e4c4dd]">{formatCurrency(subtotal)}</span>
      </div>

      <div className="checkout-coupon mt-5">
        <p className="checkout-coupon-label mb-2 text-[11px] text-[#bc91b0]">
          Cupom de Desconto
        </p>
        <CouponField paymentId={paymentId} onApplySuccess={onCouponApplied} />
      </div>

      {discount > 0 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-300">
          <span>Cupom {couponCode}</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}

      <div className="checkout-total mt-5 flex items-center justify-between border-t border-[#5d194f]/70 pt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#ed70ff]">
          Total Final
        </span>
        <span className="text-sm font-extrabold text-[#f28aff]">
          {formatCurrency(total)}
        </span>
      </div>
    </section>
  );
}

export type { OrderItem };
