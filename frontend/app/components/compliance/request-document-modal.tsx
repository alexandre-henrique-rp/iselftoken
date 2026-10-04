import { Calendar, FileText, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useCreateDocumentRequestMutation } from "~/hooks/use-document-requests";

interface RequestDocumentModalProps {
  startupId: number;
  startupName: string;
  onClose: () => void;
  onCreated?: () => void;
}

const SUGGESTED_TYPES = [
  "BALANCO_ATUALIZADO",
  "CONTRATO_SOCIAL",
  "CARTAO_CNPJ",
  "DECLARACAO_VERACIDADE",
  "ATA_ELEICAO",
  "PROJECOES_FINANCEIRAS",
  "PITCH_DECK",
];

/**
 * Modal de criação de solicitação de documento (compliance).
 * Submete via TanStack Mutation — sem JS adicional além do hook.
 */
export function RequestDocumentModal({
  startupId,
  startupName,
  onClose,
  onCreated,
}: RequestDocumentModalProps) {
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const mutation = useCreateDocumentRequestMutation();
  const submitting = mutation.isPending;
  const error = mutation.error ? (mutation.error as Error).message : null;

  const canSubmit = type.length >= 2 && description.length >= 10 && !submitting;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate(
      {
        startupId,
        type,
        description,
        deadline: deadline || null,
      },
      {
        onSuccess: () => {
          onCreated?.();
          onClose();
        },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-3xl p-8 w-full max-w-lg border border-white/10 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-1 block">
              Compliance
            </span>
            <h3 className="text-xl font-black text-foreground">Solicitar documento</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Startup: <strong>{startupName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Tipo de documento
            </label>
            <input
              type="text"
              list="document-request-types"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              autoFocus
              placeholder="Ex.: BALANCO_ATUALIZADO"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:border-primary/50"
            />
            <datalist id="document-request-types">
              {SUGGESTED_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Sugestões: balance, contrato, CNPJ, declaração, ata, projeções, pitch.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Descrição / Orientação
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={4}
              placeholder="Explique ao founder o que precisa ser enviado (mínimo 10 caracteres)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Prazo (opcional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary/50"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-white/5 text-muted-foreground hover:text-foreground transition-all text-[11px] font-black uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-full bg-primary text-black hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            {submitting ? "Solicitando…" : "Solicitar"}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          O founder será notificado em in-app. Acesse{" "}
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="underline text-primary"
          >
            notificações
          </button>{" "}
          para acompanhar.
        </p>
      </div>
    </div>
  );
}
