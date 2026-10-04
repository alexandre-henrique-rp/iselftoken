import { Award, X } from "lucide-react";
import { useState } from "react";
import { Form, useNavigation } from "react-router";
import type { SealItem, SealAssignment } from "~/lib/seal-types";

interface SealAssignModalProps {
  /** Selos ainda NÃO atribuídos a esta startup. */
  availableSeals: SealItem[];
  /** Selos já atribuídos (para impedir duplicar). */
  currentAssignments: SealAssignment[];
  /** Lista de startups para o select (caso não venha pré-filtrada). */
  startupId: number;
  onClose: () => void;
}

/**
 * Modal de atribuição de selo a uma startup específica.
 * Lista selos disponíveis (não atribuídos) + select de metadata opcional.
 */
export function SealAssignModal({
  availableSeals,
  currentAssignments,
  startupId,
  onClose,
}: SealAssignModalProps) {
  const nav = useNavigation();
  const submitting = nav.state !== "idle";
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const assignedSlugs = new Set(currentAssignments.map((a) => a.sealSlug));
  const disponiveis = availableSeals.filter(
    (s) => s.active && !assignedSlugs.has(s.slug),
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-3xl p-8 w-full max-w-md border border-white/10 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-1 block">
              Compliance
            </span>
            <h3 className="text-xl font-black text-foreground">Atribuir Selo</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione um selo do catálogo para atribuir à startup.
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

        {disponiveis.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            Todos os selos ativos já foram atribuídos a esta startup.
          </div>
        ) : (
          <Form method="post" className="space-y-5">
            <input type="hidden" name="_action" value="assign" />
            <input type="hidden" name="startupId" value={startupId} />
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Selo
              </label>
              <select
                name="sealSlug"
                required
                autoFocus
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:border-primary/50"
              >
                <option value="">Selecione…</option>
                {disponiveis.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Metadata (opcional, JSON)
              </label>
              <textarea
                name="metadata"
                rows={3}
                placeholder='{"campo": "valor"}'
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm font-mono outline-none focus:border-primary/50 resize-none"
              />
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
                type="submit"
                disabled={submitting || !selectedSlug}
                className="flex-1 py-3 rounded-full bg-primary text-black hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest"
              >
                {submitting ? "Atribuindo…" : "Atribuir"}
              </button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}
