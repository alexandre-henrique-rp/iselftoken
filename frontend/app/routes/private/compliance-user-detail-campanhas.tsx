import { useRouteLoaderData } from "react-router";
import { Megaphone, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { loader } from "./compliance-user-detail";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "text-gray-400" },
  OPEN: { label: "Aberta", color: "text-green-400" },
  FUNDED: { label: "Financiada", color: "text-blue-400" },
  FAILED: { label: "Falhou", color: "text-red-400" },
  PAID_OUT: { label: "Pago", color: "text-purple-400" },
};

export function meta() {
  return [
    { title: "Campanhas | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailCampaignsPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  if (!user) {
    return <div>Carregando...</div>;
  }

  const handleApprove = async (campaignId: number) => {
    try {
      toast.success("Campanha aprovada");
    } catch {
      toast.error("Erro ao aprovar campanha");
    }
  };

  const handleReject = async (campaignId: number) => {
    try {
      toast.error("Campanha rejeitada");
    } catch {
      toast.error("Erro ao rejeitar campanha");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-primary" />
            Campanhas
          </h2>

          {user.campaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma campanha encontrada.</p>
          ) : (
            <div className="space-y-4">
              {user.campaigns.map((campaign) => {
                const statusInfo = STATUS_LABELS[campaign.status] || { label: campaign.status, color: "text-muted-foreground" };
                return (
                  <div
                    key={campaign.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest">{campaign.startupNome}</h3>
                        <p className={cn("text-xs", statusInfo.color)}>{statusInfo.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(campaign.id)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(campaign.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <span>Meta: R$ {(campaign.targetAmount / 1000).toFixed(0)}K</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {campaign.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/50"
                        style={{ width: `${campaign.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Campanhas
          </span>
          <p className="text-xs text-muted-foreground/60">
            Aprovar ou rejeitar campanhas de captação.
          </p>
        </div>
      </aside>
    </div>
  );
}