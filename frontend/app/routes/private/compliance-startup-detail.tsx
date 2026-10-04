import type { Route } from "./+types/compliance-startup-detail";
import { Link, Form, useActionData, useNavigation } from "react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, Ban, DollarSign, FileText, History, Mail, Plus, Rocket, User } from "lucide-react";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";
import { useState } from "react";
import { useComplianceStartupDetailQuery } from "~/hooks/use-compliance-startup-detail";
import { useAuditLogsQuery } from "~/hooks/use-audit-logs";
import { useStartupDocumentsQuery } from "~/hooks/use-startup-documents";
import { useDocumentRequestsQuery, useCancelDocumentRequestMutation } from "~/hooks/use-document-requests";
import { StartupOnboardingStepper } from "~/components/compliance/startup-onboarding-stepper";
import { AuditTimeline } from "~/components/compliance/audit-timeline";
import { StartupDocumentsTab } from "~/components/compliance/startup-documents-tab";
import { DocumentRequestsList } from "~/components/compliance/document-requests-list";
import { RequestDocumentModal } from "~/components/compliance/request-document-modal";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

const brl = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v || 0));

// Status cru do enum → rótulo/estilo.
const STATUS_UI: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  LIVE: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "Rejeitada", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  DECLINED: { label: "Recusada", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  PENDING_CURATOR_REVIEW: { label: "Em Curadoria", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PENDING_RESERVATION_PAYMENT: { label: "Aguardando Reserva", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  RESERVATION_PAID: { label: "Reserva Paga", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  PENDING: { label: "Pendente", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Startup #${params.id} · Detalhe | iSelfToken` }];
}

export async function action({ request, params }: Route.ActionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const formData = await request.formData();
  const intent = formData.get("intent");
  const decision = intent === "approve" ? "APPROVED" : intent === "reject" ? "REJECTED" : null;
  if (!decision) return { success: false, error: "Ação inválida" };

  const reason = (formData.get("justification") as string) || undefined;
  try {
    const res = await fetch(`${BACKEND_URL}/admin/compliance/startup/${params.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ decision, reason }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) return { success: false, error: json?.message ?? "Erro ao processar a decisão" };
    return { success: true, message: decision === "APPROVED" ? "Startup aprovada" : "Startup rejeitada" };
  } catch {
    return { success: false, error: "Erro ao processar a decisão" };
  }
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm font-bold text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

export default function ComplianceStartupDetailPage({ params }: Route.ComponentProps) {
  const { data: startup } = useComplianceStartupDetailQuery(params.id);
  const auditQuery = useAuditLogsQuery("Startup", startup?.id);
  const documentsQuery = useStartupDocumentsQuery(startup?.id);
  const requestsQuery = useDocumentRequestsQuery({ startupId: startup?.id });
  const cancelRequest = useCancelDocumentRequestMutation();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const nav = useNavigation();
  const enviando = nav.state !== "idle";
  const actionData = useActionData<{ success?: boolean; message?: string; error?: string }>();
  const ultimo = useRef<unknown>(null);
  useEffect(() => {
    if (!actionData || actionData === ultimo.current) return;
    ultimo.current = actionData;
    if (actionData.success) toast.success(actionData.message ?? "Feito");
    else if (actionData.error) toast.error(actionData.error);
  }, [actionData]);

  if (!startup) {
    return (
      <div className="relative max-w-[1600px] mx-auto py-20 text-center space-y-6">
        <p className="text-lg font-black text-muted-foreground uppercase tracking-widest">Startup não encontrada.</p>
        <Link to="/compliance/startups" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-black uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>
    );
  }

  const ui = STATUS_UI[startup.status] ?? { label: startup.status, className: "bg-white/5 text-muted-foreground border-white/10" };
  const campaigns = startup.campaigns ?? [];
  const emCuradoria = startup.status === "PENDING_CURATOR_REVIEW";

  return (
    <div className="relative max-w-[1400px] mx-auto space-y-8">
      <Link to="/compliance/startups" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Voltar à lista
      </Link>

      {/* Stepper do pipeline de onboarding */}
      <StartupOnboardingStepper status={startup.status} />

      {/* Aba de Documentos CVM */}
      <section className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Documentos
          </h2>
        </div>
        <StartupDocumentsTab documents={documentsQuery.data?.documents ?? []} />
      </section>

      {/* Solicitações de documentos extras (AC-07) */}
      <section className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              Solicitações de documentos extras
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="px-4 py-2 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Solicitar documento
          </button>
        </div>
        <DocumentRequestsList
          requests={requestsQuery.data ?? []}
          onCancel={(id) => cancelRequest.mutate(id)}
        />
      </section>

      {/* Timeline de decisões */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Histórico de decisões
          </h2>
        </div>
        <AuditTimeline entries={auditQuery.data ?? []} />
      </section>

      {/* Header */}
      <header className="glass-panel rounded-3xl p-8 border border-white/5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <InitialsImage
            name={startup.nome}
            src={startup.logo?.url}
            alt={startup.nome}
            className="h-16 w-16 rounded-2xl border border-white/10"
            fallbackClassName="bg-accent/50"
            fallbackTextClassName="text-xl font-black text-primary"
          />
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground italic">{startup.nome}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">#{String(startup.id).padStart(6, "0")} · {startup.area_atuacao || "—"} · {startup.estagio || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", ui.className)}>{ui.label}</span>
          {emCuradoria && (
            <div className="flex gap-2">
              <Form method="post">
                <input type="hidden" name="intent" value="approve" />
                <button type="submit" disabled={enviando} className="px-5 py-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-4 h-4" /> Aprovar
                </button>
              </Form>
              <Form method="post" onSubmit={(e) => { const r = prompt("Motivo da rejeição:"); if (!r) { e.preventDefault(); return; } (e.currentTarget.elements.namedItem("justification") as HTMLInputElement).value = r; }}>
                <input type="hidden" name="intent" value="reject" />
                <input type="hidden" name="justification" value="" />
                <button type="submit" disabled={enviando} className="px-5 py-2.5 rounded-full border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Rejeitar
                </button>
              </Form>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-8">
          {/* Dados cadastrais */}
          <section className="glass-panel rounded-3xl p-8 border border-white/5">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-3"><Building2 className="w-5 h-5 text-primary" /> Dados Cadastrais</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Campo label="Razão Social" value={startup.razao_social} />
              <Campo label="CNPJ" value={startup.cnpj} />
              <Campo label="Site" value={startup.site} />
              <Campo label="E-mail" value={startup.email} />
              <Campo label="Telefone" value={startup.telefone} />
              <Campo label="Fundação" value={startup.data_fundacao ? new Date(startup.data_fundacao).toLocaleDateString("pt-BR") : null} />
            </div>
            {startup.descricao && (
              <div className="mt-6 pt-6 border-t border-white/5 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Descrição</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{startup.descricao}</p>
              </div>
            )}
          </section>

          {/* Pitch */}
          {(startup.problema || startup.solucao || startup.modelo_receita) && (
            <section className="glass-panel rounded-3xl p-8 border border-white/5 space-y-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-3"><Rocket className="w-5 h-5 text-primary" /> Pitch</h2>
              {startup.problema && <Campo label="Problema" value={startup.problema} />}
              {startup.solucao && <Campo label="Solução" value={startup.solucao} />}
              {startup.modelo_receita && <Campo label="Modelo de Receita" value={startup.modelo_receita} />}
            </section>
          )}

          {/* Campanhas */}
          <section className="glass-panel rounded-3xl p-8 border border-white/5">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-3"><DollarSign className="w-5 h-5 text-primary" /> Campanhas ({campaigns.length})</h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">Nenhuma campanha.</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c: any) => {
                  const invs = c.investments ?? [];
                  const arrecadado = invs.filter((i: any) => i.status === "CONFIRMED").reduce((s: number, i: any) => s + Number(i.amount), 0);
                  const pct = c.totalTokens > 0 ? Math.round((c.tokensSold / c.totalTokens) * 100) : 0;
                  return (
                    <div key={c.id} className="border border-white/5 rounded-2xl p-5 bg-black/20">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div>
                          <p className="font-black text-foreground">{c.title}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">{c.status} · {invs.length} investidores</p>
                        </div>
                        <p className="text-primary font-black text-lg">{pct}%</p>
                      </div>
                      <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                        <span>Arrecadado: <span className="text-foreground">{brl(arrecadado)}</span></span>
                        <span>Meta: <span className="text-foreground">{brl(c.targetAmount)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: fundador */}
        <aside className="space-y-8">
          <section className="glass-panel rounded-3xl p-8 border border-white/5 space-y-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-3"><User className="w-5 h-5 text-primary" /> Fundador</h2>
            <Campo label="Nome" value={startup.founder?.nome} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /> {startup.founder?.email || "—"}</div>
            <Campo label="Documento" value={startup.founder?.reg_documento} />
            <Campo label="Tipo" value={startup.founder?.tipo_documento} />
          </section>

          <section className="glass-panel rounded-3xl p-8 border border-white/5 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Verificação</h2>
            <Campo label="Status de Verificação" value={startup.verificationStatus} />
            <Campo label="Score de Marketplace" value={String(startup.score ?? 0)} />
            {startup.needs_manual_review && (
              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">Revisão manual pendente</span>
            )}
           </section>
         </aside>
       </div>

      {requestModalOpen && startup && (
        <RequestDocumentModal
          startupId={startup.id}
          startupName={startup.nome}
          onClose={() => setRequestModalOpen(false)}
        />
      )}
    </div>
  );
}