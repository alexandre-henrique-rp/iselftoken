import { useState } from "react";
import type { Route } from "./+types/compliance-change-requests";
import { FileText, Clock, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ChangeRequest } from "~/lib/change-request-types";
import { FIELD_LABELS, STATUS_LABELS, STATUS_STYLES } from "~/lib/change-request-types";
import { ReviewChangeRequestModal } from "~/components/compliance/review-change-request-modal";
import { useComplianceChangeRequests } from "~/hooks/use-compliance-change-requests";
import { useReviewChangeRequestMutation } from "~/hooks/use-review-change-request-mutation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Solicitações de Alteração | Compliance | iSelfToken" },
    { name: "description", content: "Painel de compliance para revisão de solicitações de alteração de dados de startups." },
  ];
}

/**
 * Página do compliance para listar e revisar solicitações de alteração PENDING.
 *
 * Exibe todas as solicitações pendentes com nome da startup, campo, valor atual vs solicitado.
 * Ao clicar, abre modal de revisão com aprovação/rejeição.
 *
 * @returns Página JSX
 * @example
 * Rota: /compliance/change-requests
 */
export default function ComplianceChangeRequestsPage() {
  const { data: requests, isLoading, refetch } = useComplianceChangeRequests();
  const reviewMutation = useReviewChangeRequestMutation();

  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenReview = (req: ChangeRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    refetch();
  };

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-16 lg:space-y-24">
      {/* Background Watermark */}
      <div className="fixed -bottom-10 -right-10 opacity-[0.02] pointer-events-none select-none -z-10 overflow-hidden">
        <h1 className="text-[12vw] font-black italic tracking-tighter uppercase leading-none">Compliance</h1>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6 relative">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Compliance · Alterações
          </span>
          <h1 className="text-6xl lg:text-[5rem] font-black tracking-tighter text-foreground leading-none">
            Solicitações <span className="text-primary italic">Pendentes</span>
          </h1>
        </div>
        {requests && requests.length > 0 && (
          <span className="px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-widest border border-amber-500/20">
            {requests.length} pendente(s)
          </span>
        )}
      </header>

      {/* Content */}
      <section className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-sm">Carregando solicitações…</span>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação de alteração pendente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => {
              const styles = STATUS_STYLES[req.status];
              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => handleOpenReview(req)}
                  className="bg-accent/20 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-lg flex flex-col md:flex-row items-center gap-4 text-left hover:bg-accent/30 transition-colors w-full"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-black text-foreground truncate">
                        {req.startupName ?? req.startupId}
                      </h3>
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                          styles.color,
                          styles.bg,
                        )}
                      >
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Campo: <strong className="text-foreground">{FIELD_LABELS[req.field]}</strong>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Atual: <strong className="text-foreground">{req.currentValue || "—"}</strong></span>
                      <span className="text-muted-foreground/50">→</span>
                      <span>Solicitado: <strong className="text-primary">{req.requestedValue}</strong></span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 hidden md:block" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Review Modal */}
      <ReviewChangeRequestModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={handleSuccess}
        submitFn={(id, payload) => reviewMutation.mutateAsync({ id, payload })}
      />
    </div>
  );
}
