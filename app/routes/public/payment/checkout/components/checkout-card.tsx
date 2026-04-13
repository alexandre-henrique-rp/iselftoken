import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

type CheckoutCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * @name CheckoutCard
 * @description Container visual para seções do checkout.
 *
 * @param {CheckoutCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} Card estilizado.
 */
export function CheckoutCard({ children, className }: CheckoutCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stone-800 bg-stone-900 p-6 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
