import type { Route } from "./+types/admin-affiliate";
import { useState } from "react";
import { Handshake, Check, X, Coins, Building2, Users, Percent, Link2, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { useAdminAffiliateQuery } from "~/hooks/use-admin-affiliate";
import { useUpdateAffiliateMutation } from "~/hooks/use-update-affiliate-mutation";

type ProgStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
type AffStatus = "PENDING_FOUNDER" | "PENDING_ADMIN" | "ACTIVE" | "REJECTED" | "SUSPENDED";

interface Program {
  id: number;
  status: ProgStatus;
  affiliateCommissionPct: string | number;
  platformCommissionPct: string | number;
  maxAffiliates: number | null;
  startup: { id: number; nome: string; area_atuacao: string | null };
  _count: { affiliations: number };
}
interface Affiliation {
  id: number;
  status: AffStatus;
  code: string;
  tokensAllocated: number | null;
  purchaseLinkUrl: string | null;
  rejectionReason: string | null;
  user: { id: number; nome: string; email: string };
  program: { id: number; affiliateCommissionPct: string | number; startup: { id: number; nome: string } };
}

const PROG_UI: Record<ProgStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  APPROVED: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "Rejeitada", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  SUSPENDED: { label: "Suspensa", className: "bg-white/5 text-muted-foreground border-white/10" },
};
const AFF_UI: Record<AffStatus, { label: string; className: string }> = {
  PENDING_FOUNDER: { label: "Com o fundador", className: "bg-white/5 text-muted-foreground border-white/10" },
  PENDING_ADMIN: { label: "Aguardando você", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ACTIVE: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "Rejeitado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  SUSPENDED: { label: "Suspenso", className: "bg-white/5 text-muted-foreground border-white/10" },
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Afiliados — Admin | iSelfToken" }, { name: "description", content: "Aprovações de programas e afiliações." }];
}

// Loader sem fetch: dados via TanStack Query.
export async function loader(): Promise<Record<string, never>> {
  return {};
}

export default function AdminAffiliatePage() {
  const { data, isLoading, isError } = useAdminAffiliateQuery();
  const programs = (data?.programs ?? []) as Program[];
  const affiliations = (data?.affiliations ?? []) as Affiliation[];
  const [modal, setModal] = useState<{ intent: "program" | "affiliation"; id: number } | null>(null);

  const mutation = useUpdateAffiliateMutation();

  const progsPend = programs.filter((p) => p.status === "PENDING");
  const affsPend = affiliations.filter((a) => a.status === "PENDING_ADMIN");
  const affsHist = affiliations.filter((a) => a.status !== "PENDING_ADMIN" && a.status !== "PENDING_FOUNDER");

  const rejeitando = modal ? { ...modal } : null;
  const alvoAff = modal?.intent === "affiliation" ? affiliations.find((a) => a.id === modal.id) : null;
  const alvoProg = modal?.intent === "program" ? programs.find((p) => p.id === modal.id) : null;

  const handleApproveProgram = (p: Program, ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    mutation.mutate(
      {
        intent: "program",
        id: p.id,
        decision: "APPROVED",
        affiliateCommissionPct: Number(fd.get("affiliateCommissionPct") ?? p.affiliateCommissionPct),
        platformCommissionPct: Number(fd.get("platformCommissionPct") ?? p.platformCommissionPct),
      },
      { onSuccess: () => setModal(null) },
    );
  };

  const handleApproveAffiliation = (a: Affiliation, ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    mutation.mutate({ intent: "affiliation", id: a.id, decision: "APPROVED" });
  };

  const handleReject = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!rejeitando) return;
    const fd = new FormData(ev.currentTarget);
    const reason = String(fd.get("reason") ?? "").trim();
    if (!reason) return;
    mutation.mutate(
      {
        intent: rejeitando.intent,
        id: rejeitando.id,
        decision: "REJECTED",
        reason,
      },
      { onSuccess: () => setModal(null) },
    );
  };

  return (
    <div className="relative max-w-[1400px] mx-auto space-y-10">
      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Programa de Afiliados</span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Afiliados — Aprovações</h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-xl">Aprove a adesão das startups ao programa e dê o aval final às afiliações já triadas pelos fundadores.</p>
      </header>

      {isError ? (
        <div className="glass-panel rounded-3xl p-12 text-center"><p className="text-muted-foreground font-medium">Não foi possível carregar os dados de afiliação.</p></div>
      ) : isLoading ? (
        <div className="glass-panel rounded-3xl p-12 text-center"><p className="text-muted-foreground font-medium">Carregando…</p></div>
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-amber-400" /><h2 className="text-sm font-black uppercase tracking-widest text-foreground">Adesões de startups ({progsPend.length})</h2></div>
            {progsPend.length === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center"><p className="text-sm text-muted-foreground">Nenhuma adesão pendente.</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {progsPend.map((p) => (
                  <div key={p.id} className="glass-panel rounded-3xl p-7 border border-white/5 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0"><h3 className="text-lg font-black text-foreground italic truncate">{p.startup.nome}</h3><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate">{p.startup.area_atuacao || "—"}</p></div>
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">Pendente</span>
                    </div>
                    <form onSubmit={(e) => handleApproveProgram(p, e)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block"><span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1 mb-1"><Percent className="w-3 h-3" /> Afiliado</span>
                          <input type="number" name="affiliateCommissionPct" step="0.5" min={0} max={100} defaultValue={Number(p.affiliateCommissionPct)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground font-bold outline-none focus:border-primary/50" /></label>
                        <label className="block"><span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1 mb-1"><Percent className="w-3 h-3" /> Plataforma</span>
                          <input type="number" name="platformCommissionPct" step="0.5" min={0} max={100} defaultValue={Number(p.platformCommissionPct)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground font-bold outline-none focus:border-primary/50" /></label>
                      </div>
                      <div className="flex gap-3">
                        <button type="submit" disabled={mutation.isPending} className="flex-1 py-3 rounded-full bg-emerald-500 text-black hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Aprovar adesão</button>
                        <button type="button" onClick={() => setModal({ intent: "program", id: p.id })} className="flex-1 py-3 rounded-full bg-white/5 text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><X className="w-4 h-4" /> Rejeitar</button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-amber-400" /><h2 className="text-sm font-black uppercase tracking-widest text-foreground">Afiliações aguardando aval final ({affsPend.length})</h2></div>
            {affsPend.length === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center"><p className="text-sm text-muted-foreground">Nenhuma afiliação aguardando aval.</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {affsPend.map((a) => (
                  <div key={a.id} className="glass-panel rounded-3xl p-7 border border-white/5 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0"><h3 className="text-lg font-black text-foreground truncate">{a.user.nome}</h3><p className="text-[11px] text-muted-foreground truncate">{a.user.email}</p></div>
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">Aguardando você</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-black/30 border border-white/5 p-4">
                      <div className="text-center"><Building2 className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-xs font-bold text-foreground italic truncate">{a.program.startup.nome}</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Startup</p></div>
                      <div className="text-center"><Coins className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-xs font-bold text-emerald-400">{a.tokensAllocated ?? "—"}</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Tokens</p></div>
                      <div className="text-center"><Percent className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-xs font-bold text-foreground">{Number(a.program.affiliateCommissionPct)}%</p><p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Comissão</p></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Código <span className="font-mono text-primary">{a.code}</span> · aprovar gera o link público de compra.</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={(e) => handleApproveAffiliation(a, e as unknown as React.MouseEvent<HTMLButtonElement>)} disabled={mutation.isPending} className="flex-1 py-3 rounded-full bg-emerald-500 text-black hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Ativar afiliação</button>
                      <button type="button" onClick={() => setModal({ intent: "affiliation", id: a.id })} className="flex-1 py-3 rounded-full bg-white/5 text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><X className="w-4 h-4" /> Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {affsHist.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Afiliações decididas ({affsHist.length})</h2>
              <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-[1.5fr_1fr_0.7fr_1fr_1fr] gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60"><span>Afiliado</span><span>Startup</span><span>Tokens</span><span>Link</span><span className="text-right">Status</span></div>
                {affsHist.map((a) => {
                  const ui = AFF_UI[a.status];
                  return (
                    <div key={a.id} className="grid grid-cols-[1.5fr_1fr_0.7fr_1fr_1fr] gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center">
                      <div className="min-w-0"><p className="text-sm font-bold text-foreground truncate">{a.user.nome}</p><p className="text-[10px] text-muted-foreground truncate">{a.user.email}</p></div>
                      <span className="text-xs text-muted-foreground italic truncate">{a.program.startup.nome}</span>
                      <span className="text-xs font-bold text-foreground">{a.tokensAllocated ?? "—"}</span>
                      <span className="text-[10px] truncate">{a.purchaseLinkUrl ? <span className="text-primary inline-flex items-center gap-1"><Link2 className="w-3 h-3" /> gerado</span> : <span className="text-muted-foreground/40">—</span>}</span>
                      <div className="text-right"><span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", ui.className)}>{ui.label}</span></div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {rejeitando && (alvoAff || alvoProg) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="glass-panel rounded-3xl p-8 w-full max-w-md border border-white/10 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-red-500/10 flex items-center justify-center"><X className="w-5 h-5 text-red-400" /></div>
              <div><h3 className="text-lg font-black text-foreground">Rejeitar {rejeitando.intent === "program" ? "adesão" : "afiliação"}</h3>
                <p className="text-xs text-muted-foreground">{alvoProg ? alvoProg.startup.nome : `${alvoAff!.user.nome} · ${alvoAff!.program.startup.nome}`}</p></div>
            </div>
            <form onSubmit={handleReject} className="space-y-5">
              <textarea name="reason" required autoFocus rows={3} placeholder="Motivo da rejeição." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm focus:border-red-500/50 outline-none resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-full bg-white/5 text-muted-foreground hover:text-foreground transition-all text-[11px] font-black uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 py-3 rounded-full bg-red-500 text-white hover:opacity-90 disabled:opacity-40 transition-all text-[11px] font-black uppercase tracking-widest">{mutation.isPending ? "Enviando…" : "Rejeitar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
