import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Building2,
  Target,
  Brain,
  Users,
  PieChart,
  Gift,
  Check,
  RotateCcw,
  Ban,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";
import type { Route } from "./+types/compliance-campaign-detail";
import {
  useComplianceCampaignDetailQuery,
  type ComplianceCampaignDetail,
} from "~/hooks/use-compliance-campaign-detail";
import { useStartupDocumentsQuery } from "~/hooks/use-startup-documents";
import { StartupDocumentsTab } from "~/components/compliance/startup-documents-tab";

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Campanha #${params.id} | Compliance | iSelfToken` }];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const TABS = [
  { id: "visao", label: "Visão Geral", icon: Target },
  { id: "tese", label: "Tese", icon: Brain },
  { id: "governanca", label: "Governança", icon: Users },
  { id: "recursos", label: "Recursos", icon: PieChart },
  { id: "retornos", label: "Retornos", icon: Gift },
  { id: "startup", label: "Startup", icon: Building2 },
  { id: "documentos", label: "Documentos", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_UI: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  OPEN: { label: "Aberta", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  PAUSED: { label: "Pausada", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  CLOSED: { label: "Encerrada", className: "bg-muted text-muted-foreground border-white/10" },
  FUNDED: { label: "Financiada", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ComplianceCampaignDetailPage({ params }: Route.ComponentProps) {
  const { data: campaign } = useComplianceCampaignDetailQuery(params.id);
  const documentsQuery = useStartupDocumentsQuery(campaign?.startup.id);
  const [activeTab, setActiveTab] = useState<TabId>("visao");
  const [observation, setObservation] = useState("");
  const [deciding, setDeciding] = useState(false);
  const navigate = useNavigate();

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <p className="text-lg font-black text-muted-foreground">Campanha não encontrada.</p>
        <Link to="/compliance/campaigns" className="text-primary hover:underline text-sm font-bold">
          ← Voltar
        </Link>
      </div>
    );
  }

  const status = STATUS_UI[campaign.status] ?? STATUS_UI.DRAFT;
  const canDecide = ["DRAFT", "OPEN"].includes(campaign.status);

  const handleDecision = async (decision: "APPROVED" | "NEEDS_REVISION" | "REJECTED") => {
    if ((decision === "NEEDS_REVISION" || decision === "REJECTED") && !observation.trim()) {
      toast.error("Observação é obrigatória para revisão ou rejeição.");
      return;
    }
    setDeciding(true);
    try {
      const res = await fetch(`/api/compliance/campaigns/${campaign.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision, observation: observation.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        toast.error(data?.message ?? "Erro ao processar decisão.");
        return;
      }
      const msgs = {
        APPROVED: "Campanha aprovada!",
        NEEDS_REVISION: "Campanha devolvida para revisão.",
        REJECTED: "Campanha rejeitada.",
      };
      toast.success(msgs[decision]);
      navigate("/compliance/campaigns");
    } catch {
      toast.error("Erro inesperado.");
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Back */}
      <Link
        to="/compliance/campaigns"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar à lista
      </Link>

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <InitialsImage
            name={campaign.startup.nome}
            src={campaign.startup.logo?.url}
            alt={campaign.startup.nome}
            className="h-14 w-14 rounded-xl border border-white/10"
            fallbackClassName="bg-primary/10"
            fallbackTextClassName="text-lg font-black text-primary"
          />
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground">
              {campaign.startup.nome}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.title} · ID #{campaign.id}
            </p>
          </div>
        </div>
        <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", status.className)}>
          {status.label}
        </span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white/[0.05] text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "visao" && <TabVisaoGeral c={campaign} />}
        {activeTab === "tese" && <TabTese c={campaign} />}
        {activeTab === "governanca" && <TabGovernanca c={campaign} />}
        {activeTab === "recursos" && <TabRecursos c={campaign} />}
        {activeTab === "retornos" && <TabRetornos c={campaign} />}
        {activeTab === "startup" && <TabStartup c={campaign} />}
        {activeTab === "documentos" && (
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                Documentos da Startup
              </h2>
            </div>
            <StartupDocumentsTab
              documents={documentsQuery.data?.documents ?? []}
            />
          </div>
        )}
      </div>

      {/* Painel de Decisão */}
      {canDecide && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Decisão</h2>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Observações (obrigatório para revisão/rejeição)..."
            rows={3}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 resize-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecision("APPROVED")}
              disabled={deciding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Aprovar
            </button>
            <button
              onClick={() => handleDecision("NEEDS_REVISION")}
              disabled={deciding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-amber-500 text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/10 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Solicitar Revisão
            </button>
            <button
              onClick={() => handleDecision("REJECTED")}
              disabled={deciding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-red-500 text-red-400 font-bold text-xs uppercase tracking-wider hover:bg-red-500/10 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" /> Rejeitar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function Campo({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm font-bold text-foreground break-words">{value ?? "—"}</p>
    </div>
  );
}

function TabVisaoGeral({ c }: { c: ComplianceCampaignDetail }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <Campo label="Meta" value={brl(c.targetAmount)} />
      <Campo label="Valuation" value={brl(c.valuation)} />
      <Campo label="Preço Token" value={brl(c.tokenPrice)} />
      <Campo label="Mín. Investimento" value={brl(c.minInvestment)} />
      <Campo label="Total Tokens" value={c.totalTokens.toLocaleString("pt-BR")} />
      <Campo label="Tokens Vendidos" value={c.tokensSold.toLocaleString("pt-BR")} />
      <Campo label="Captado" value={brl(c.raised)} />
      <Campo label="Progresso" value={`${c.percentage}%`} />
      <Campo label="Investidores" value={c.investorsCount} />
      <Campo label="Deadline" value={new Date(c.deadline).toLocaleDateString("pt-BR")} />
      <Campo label="Criada em" value={new Date(c.createdAt).toLocaleDateString("pt-BR")} />
      <Campo label="Termo Repasse" value={c.aceiteTermoRepasse ? "Aceito" : "Pendente"} />
      <Campo label="Declaração Veracidade" value={c.declaracaoVeracidade ? "Aceita" : "Pendente"} />
    </div>
  );
}

function TabTese({ c }: { c: ComplianceCampaignDetail }) {
  return (
    <div className="space-y-6">
      <Campo label="Problema" value={c.problema} />
      <Campo label="Solução" value={c.solucao} />
      <Campo label="Diferencial Competitivo" value={c.diferencial} />
      <Campo label="Modelo de Receita" value={c.modeloReceita} />
      <Campo label="Mercado-Alvo" value={c.mercadoAlvo} />
    </div>
  );
}

function TabGovernanca({ c }: { c: ComplianceCampaignDetail }) {
  return (
    <div className="space-y-6">
      <Campo label="Sócios / Fundadores" value={c.sociosCount} />
      <Campo label="Dedicação dos Fundadores" value={c.dedicacao} />
      <Campo label="Potenciais Compradores" value={c.compradores} />
      <Campo label="Investimento Prévio" value={c.investimentoPrevio} />
      <Campo label="Concorrência" value={c.concorrencia} />
    </div>
  );
}

function TabRecursos({ c }: { c: ComplianceCampaignDetail }) {
  if (!c.resources || c.resources.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma alocação de recurso definida.</p>;
  }
  const total = c.resources.reduce((s, r) => s + r.percentual, 0);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Soma: <strong className={total === 100 ? "text-emerald-400" : "text-red-400"}>{total}%</strong>
      </p>
      <div className="space-y-2">
        {c.resources.map((r) => (
          <div key={r.categoria} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 border border-white/5">
            <span className="text-xs font-bold text-foreground capitalize">
              {r.categoria.toLowerCase().replace(/_/g, " ")}
              {r.descricaoCustomizada && <span className="text-muted-foreground ml-2">({r.descricaoCustomizada})</span>}
            </span>
            <span className="text-sm font-black text-primary">{r.percentual}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabRetornos({ c }: { c: ComplianceCampaignDetail }) {
  return (
    <div className="space-y-6">
      <Campo label="Participação nos Lucros" value={c.participacaoLucros ? "Sim" : "Não"} />
      {c.participacaoLucros && (
        <Campo label="Faturamento Mínimo para Distribuição" value={c.faturamentoMinimoLucros ? brl(c.faturamentoMinimoLucros) : "—"} />
      )}
      <Campo label="Benefícios Adicionais" value={c.beneficiosAdicionais ? "Sim" : "Não"} />
      {c.beneficiosAdicionais && (
        <Campo label="Descrição dos Benefícios" value={c.beneficiosDescricao} />
      )}
    </div>
  );
}

function TabStartup({ c }: { c: ComplianceCampaignDetail }) {
  const s = c.startup;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Campo label="Razão Social" value={s.razao_social} />
        <Campo label="CNPJ" value={s.cnpj} />
        <Campo label="Site" value={s.site} />
        <Campo label="E-mail" value={s.email} />
        <Campo label="Telefone" value={s.telefone} />
        <Campo label="Área de Atuação" value={s.area_atuacao || s.category} />
        <Campo label="Estágio" value={s.estagio} />
        <Campo label="Fundador" value={s.founder?.nome} />
        <Campo label="Email Fundador" value={s.founder?.email} />
      </div>
      {(s.banco || s.pix_key) && (
        <div className="pt-4 border-t border-white/5">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Dados Bancários</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Campo label="Titular" value={s.titular} />
            <Campo label="Documento Titular" value={s.documento_titular} />
            <Campo label="Banco" value={s.banco} />
            <Campo label="Agência" value={s.agencia} />
            <Campo label="Conta" value={s.conta} />
            <Campo label="Dígito" value={s.digito} />
            <Campo label="Tipo Conta" value={s.tipo_conta} />
            <Campo label="Chave PIX" value={s.pix_key} />
          </div>
        </div>
      )}
    </div>
  );
}