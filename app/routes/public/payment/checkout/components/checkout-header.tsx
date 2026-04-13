import { Lock } from "lucide-react";

type CheckoutHeaderProps = {
  transactionId: string;
};

/**
 * @name CheckoutHeader
 * @description Cabeçalho fixo do checkout seguro.
 *
 * @param {CheckoutHeaderProps} props - Propriedades do componente.
 * @returns {JSX.Element} Header da tela.
 */
export function CheckoutHeader({ transactionId }: CheckoutHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[#d500f9]">
            iSelfToken
          </span>
          <span className="hidden h-4 w-px bg-stone-700 sm:block" />
          <span className="hidden items-center gap-1 text-sm text-stone-400 sm:flex">
            <Lock className="h-3 w-3" /> Checkout Seguro
          </span>
        </div>
        <div className="text-xs font-mono text-stone-500">ID: {transactionId}</div>
      </div>
    </header>
  );
}
