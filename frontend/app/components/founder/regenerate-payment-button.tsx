import { useState } from "react";
import { useNavigate } from "react-router";
import { RefreshCcw } from "lucide-react";

interface RegeneratePaymentButtonProps {
  /** Id do Payment expirado/cancelado de origem. */
  paymentId: number;
  /** Callback opcional após sucesso (ex.: invalidar query). */
  onSuccess?: () => void;
}

/**
 * "Gerar Novo Pagamento" (fluxo_startup §1/§4).
 *
 * Recria a cobrança de reserva expirada (sem refazer o wizard) via
 * POST /api/payment/:id/regenerate e navega para o checkout retornado.
 * Idempotente no backend (retorna a cobrança PENDING existente se houver).
 */
export function RegeneratePaymentButton({
  paymentId,
  onSuccess,
}: RegeneratePaymentButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment/${paymentId}/regenerate`, {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error || !body?.data?.paymentId) {
        setError(body?.message ?? "Não foi possível gerar o novo pagamento.");
        return;
      }
      onSuccess?.();
      navigate(`/checkout/payment/${body.data.paymentId}`);
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        <RefreshCcw
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {loading ? "Gerando..." : "Gerar Novo Pagamento"}
      </button>
      {error && (
        <span role="alert" className="text-[10px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
