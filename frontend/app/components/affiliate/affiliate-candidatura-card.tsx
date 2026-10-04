import { Check, Coins, Handshake, Mail, X } from "lucide-react";
import type { Candidatura } from "~/lib/affiliate-types";
import { cn } from "~/lib/utils";

interface AffiliateCandidaturaCardProps {
  candidatura: Candidatura;
  onAprovar: () => void;
  onRejeitar: () => void;
  /** Quando true, renderiza versão compacta (sem botões). */
  readOnly?: boolean;
}

/**
 * Card de uma candidatura de afiliado (status PENDING_FOUNDER).
 * Exibe dados do candidato, startup, comissão e tokens disponíveis.
 */
export function AffiliateCandidaturaCard({
  candidatura,
  onAprovar,
  onRejeitar,
  readOnly = false,
}: AffiliateCandidaturaCardProps) {
  const semTokens = candidatura.tokensAvailable < 1;

  return (
    <div className="glass-panel rounded-3xl p-7 border border-white/5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-foreground truncate">
            {candidatura.user.nome}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3.5 h-3.5" /> {candidatura.user.email}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-white/5 text-muted-foreground shrink-0">
          {candidatura.user.role}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-black/30 border border-white/5 p-4">
        <Cell label="Startup" value={candidatura.startup.nome} />
        <Cell label="Comissão" value={`${Number(candidatura.comissaoPct)}%`} tone="primary" />
        <Cell label="Disponível" value={`${candidatura.tokensAvailable} tk`} tone="emerald" />
      </div>

      {semTokens && !readOnly && (
        <p className="text-[10px] text-amber-400/80 text-center">
          Sua startup não tem tokens disponíveis em campanhas abertas.
          Abra/atualize uma campanha para alocar.
        </p>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAprovar}
            disabled={semTokens}
            className="flex-1 py-3 rounded-full bg-emerald-500 text-black hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
            title={semTokens ? "Sem tokens disponíveis para alocar" : "Aprovar"}
          >
            <Check className="w-4 h-4" /> Aprovar
          </button>
          <button
            type="button"
            onClick={onRejeitar}
            className="flex-1 py-3 rounded-full bg-white/5 text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "emerald";
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "emerald"
        ? "text-emerald-400"
        : "text-foreground";
  return (
    <div className="text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
        {label}
      </p>
      <p className={cn("text-xs font-bold truncate", color)}>{value}</p>
    </div>
  );
}
