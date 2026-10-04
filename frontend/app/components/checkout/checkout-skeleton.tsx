/**
 * CheckoutSkeleton — Skeleton para loading state
 *
 * Preserva layout — mesma estrutura dos componentes reais
 */

export function CheckoutSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 p-6"
      role="status"
      aria-live="polite"
      aria-label="Carregando checkout..."
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 skeleton rounded" />
        <div className="h-6 w-24 skeleton rounded" />
      </div>

      {/* QR Code skeleton */}
      <div className="flex justify-center">
        <div className="w-56 h-56 skeleton rounded-xl" />
      </div>

      {/* Textarea skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 skeleton rounded" />
        <div className="flex gap-2">
          <div className="flex-1 h-20 skeleton rounded-xl" />
          <div className="w-16 h-12 skeleton rounded-xl" />
        </div>
      </div>

      {/* Instructions skeleton */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="w-4 h-4 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Badge skeleton */}
      <div className="flex justify-center">
        <div className="h-8 w-40 skeleton rounded-full" />
      </div>

      {/* Screen reader only */}
      <span className="sr-only">Carregando informações de pagamento...</span>
    </div>
  );
}
