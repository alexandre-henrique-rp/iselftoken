import { AlertTriangle, RotateCcw } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { toast } from "sonner";

import { formatBRDateTime } from "~/lib/date-utils";

interface CaptacaoRejectionBannerProps {
  startupId: string | number;
  /** Texto da justificativa deixada pelo admin na rejeição. Pode ser null se a decisão foi gravada sem texto (legado). */
  justification: string | null;
  /** ISO string do createdAt da última decisão REJECTED da fase 3. */
  rejectedAt: string | null;
}

/**
 * Banner exibido em `/founder/startups/:id/captacao` quando o admin rejeita
 * a Etapa 3 (Detalhes de Captação) via `/admin/startups/:id/3`.
 *
 * Espelha o banner de rejeição do `/edit` (que cobre fases 1 e 2) — porém
 * aqui usamos paleta rosa destrutiva para diferenciar visualmente o caso em
 * que a captação precisa de revisão (vs. banner âmbar genérico do /edit).
 *
 * Inclui:
 *   - motivo da rejeição (justification do admin) entre aspas
 *   - data da rejeição (DD/MM/YYYY HH:mm UTC)
 *   - CTA "Ressubmeter para análise" chamando `POST /api/startup/:id/resubmit`
 *     (mesmo endpoint do banner /edit — backend aceita qualquer startup
 *     com status REJECTED).
 *
 * @see backendnode/src/api/startup/service/startup-extras.service.ts:getCaptacaoData
 *      para o payload `phase3Rejected/phase3RejectedJustification/phase3RejectedAt`.
 */
export function CaptacaoRejectionBanner({
  startupId,
  justification,
  rejectedAt,
}: CaptacaoRejectionBannerProps) {
  const [isResubmitting, setIsResubmitting] = useState(false);

  async function handleResubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isResubmitting) return;
    setIsResubmitting(true);

    try {
      const response = await fetch(`/api/startup/${startupId}/resubmit`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        toast.error(body?.message ?? "Não foi possível ressubmeter a captação.");
        return;
      }

      toast.success("Captação ressubmetida para nova análise.");
      window.location.reload();
    } catch {
      toast.error("Serviço de startups indisponível.");
    } finally {
      setIsResubmitting(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="captacao-rejection-banner"
      className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-bold text-rose-100">
            Etapa 3 rejeitada pela curadoria
          </p>
          <p className="text-xs text-rose-100/70">
            Corrija os problemas apontados e ressubmeta a captação para nova
            análise do Compliance.
          </p>
          {justification && (
            <blockquote className="mt-2 border-l-2 border-rose-500/40 pl-3 text-xs italic text-rose-100/90">
              <span className="block text-[10px] not-italic font-bold uppercase tracking-widest text-rose-300/80 mb-1">
                Motivo da rejeição
              </span>
              &ldquo;{justification}&rdquo;
              {rejectedAt && (
                <span className="block mt-1 not-italic text-[10px] text-rose-300/70 font-mono">
                  — em {formatBRDateTime(rejectedAt)}
                </span>
              )}
            </blockquote>
          )}
        </div>
      </div>
      <form onSubmit={handleResubmit} className="shrink-0">
        <button
          type="submit"
          disabled={isResubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {isResubmitting
            ? "Ressubmetendo…"
            : "Ressubmeter para análise"}
        </button>
      </form>
    </div>
  );
}