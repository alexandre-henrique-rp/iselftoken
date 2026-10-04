import { Coins, Handshake, X } from "lucide-react";
import { Form } from "react-router";
import type { Candidatura } from "~/lib/affiliate-types";

interface AffiliateTriagemModalProps {
  candidatura: Candidatura;
  intent: "approve" | "reject";
  loading: boolean;
  onClose: () => void;
}

/**
 * Modal de decisão (aprovar/rejeitar) de uma candidatura de afiliado.
 * Submete via Form (action da rota) — sem JS adicional.
 */
export function AffiliateTriagemModal({
  candidatura,
  intent,
  loading,
  onClose,
}: AffiliateTriagemModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-3xl p-8 w-full max-w-md border border-white/10 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {intent === "approve" ? <ApproveContent candidatura={candidatura} loading={loading} onClose={onClose} /> : null}
        {intent === "reject" ? <RejectContent candidatura={candidatura} loading={loading} onClose={onClose} /> : null}
      </div>
    </div>
  );
}

function ApproveContent({
  candidatura,
  loading,
  onClose,
}: {
  candidatura: Candidatura;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Handshake className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">Aprovar afiliado</h3>
          <p className="text-xs text-muted-foreground">
            {candidatura.user.nome} · {candidatura.startup.nome}
          </p>
        </div>
      </div>
      <Form method="post" className="space-y-5">
        <input type="hidden" name="intent" value="approve" />
        <input type="hidden" name="id" value={candidatura.id} />
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-primary" /> Tokens à venda
          </label>
          <input
            type="number"
            name="tokensAllocated"
            min={1}
            max={candidatura.tokensAvailable}
            required
            autoFocus
            defaultValue={Math.min(100, candidatura.tokensAvailable)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground font-bold focus:border-primary/50 outline-none"
          />
          <p className="text-[10px] text-muted-foreground mt-2">
            Disponível para alocar:{" "}
            <span className="text-emerald-400 font-bold">
              {candidatura.tokensAvailable} tokens
            </span>
          </p>
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
            disabled={loading}
            className="flex-1 py-3 rounded-full bg-emerald-500 text-black hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest"
          >
            {loading ? "Enviando…" : "Confirmar"}
          </button>
        </div>
      </Form>
    </>
  );
}

function RejectContent({
  candidatura,
  loading,
  onClose,
}: {
  candidatura: Candidatura;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <X className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">Rejeitar candidatura</h3>
          <p className="text-xs text-muted-foreground">
            {candidatura.user.nome} · {candidatura.startup.nome}
          </p>
        </div>
      </div>
      <Form method="post" className="space-y-5">
        <input type="hidden" name="intent" value="reject" />
        <input type="hidden" name="id" value={candidatura.id} />
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Motivo
          </label>
          <textarea
            name="reason"
            required
            autoFocus
            rows={3}
            placeholder="Explique ao candidato o motivo da rejeição."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm focus:border-red-500/50 outline-none resize-none"
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
            disabled={loading}
            className="flex-1 py-3 rounded-full bg-red-500 text-white hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest"
          >
            {loading ? "Enviando…" : "Rejeitar"}
          </button>
        </div>
      </Form>
    </>
  );
}
