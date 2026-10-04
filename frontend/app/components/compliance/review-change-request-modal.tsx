import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ChangeRequest } from "~/lib/change-request-types";
import { FIELD_LABELS } from "~/lib/change-request-types";

/**
 * Modal para compliance revisar uma solicitação de alteração.
 *
 * Mostra dados atuais vs solicitados lado a lado, campo "Nota de revisão"
 * obrigatório (min 10 chars), e botões Aprovar/Rejeitar.
 * Após sucesso, chamado `onSuccess` que fecha o modal e atualiza a lista.
 *
 * @param props - Props do componente
 * @param props.isOpen - Se o modal está aberto
 * @param props.onClose - Callback para fechar o modal
 * @param props.request - Solicitação sendo revisada
 * @param props.onSuccess - Callback chamado após sucesso
 * @param props.submitFn - Função assíncrona para enviar a revisão
 * @returns Modal JSX ou null quando fechado
 * @example
 * <ReviewChangeRequestModal
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   request={selectedRequest}
 *   onSuccess={() => refetch()}
 *   submitFn={(id, payload) => mutation.mutateAsync({ id, payload })}
 * />
 */
export interface ReviewChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ChangeRequest | null;
  onSuccess: () => void;
  submitFn: (id: string, payload: { status: "APPROVED" | "REJECTED"; reviewerNote: string }) => Promise<unknown>;
}

export function ReviewChangeRequestModal({
  isOpen,
  onClose,
  request,
  onSuccess,
  submitFn,
}: ReviewChangeRequestModalProps) {
  const [reviewerNote, setReviewerNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Foco no textarea ao abrir
  useEffect(() => {
    if (isOpen) {
      setReviewerNote("");
      setError("");
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Bloquear scroll do body
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  const canSubmit = reviewerNote.trim().length >= 10 && !loading;

  const handleSubmit = async (status: "APPROVED" | "REJECTED") => {
    if (!request || !canSubmit) return;

    setError("");
    setLoading(true);
    try {
      await submitFn(request.id, { status, reviewerNote: reviewerNote.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar revisão");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-change-title"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-start gap-4">
          <div>
            <h2 id="review-change-title" className="text-xl font-black tracking-tight">
              Revisar Solicitação
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.startupName ?? request.startupId} · {FIELD_LABELS[request.field]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Dados lado a lado */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Valor atual */}
          <div className="p-3 rounded-xl bg-accent/20 border border-border/30 space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
              Valor Atual
            </span>
            <span className="text-sm font-bold text-foreground break-all">
              {request.currentValue || "—"}
            </span>
          </div>

          {/* Seta */}
          <div className="pt-5">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Valor solicitado */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
              Solicitado
            </span>
            <span className="text-sm font-bold text-foreground break-all">
              {request.requestedValue}
            </span>
          </div>
        </div>

        {/* Justificativa do fundador */}
        <div className="p-3 rounded-xl bg-accent/10 border border-border/20">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
            Justificativa do Fundador
          </span>
          <p className="text-sm text-foreground">{request.justification}</p>
        </div>

        {/* Nota de revisão */}
        <div className="space-y-2">
          <label htmlFor="reviewer-note" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Nota de Revisão <span className="text-red-400">*</span>
          </label>
          <textarea
            ref={textareaRef}
            id="reviewer-note"
            className="input-field w-full min-h-[80px] resize-none"
            placeholder="Descreva o motivo da decisão (mínimo 10 caracteres)"
            value={reviewerNote}
            onChange={(e) => setReviewerNote(e.target.value)}
            disabled={loading}
            aria-describedby={error ? "review-change-error" : "review-note-hint"}
          />
          <p id="review-note-hint" className="text-[10px] text-muted-foreground">
            {reviewerNote.length}/10 caracteres mínimos
          </p>
        </div>

        {error && (
          <p id="review-change-error" className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("REJECTED")}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Rejeitar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("APPROVED")}
            disabled={!canSubmit}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-emerald-600 text-white hover:bg-emerald-500",
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Aprovar
          </button>
        </footer>
      </div>
    </div>
  );
}
