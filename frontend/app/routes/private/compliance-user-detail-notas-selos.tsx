import { useRouteLoaderData } from "react-router";
import { Award, Star, ClipboardList } from "lucide-react";
import { useAuditLogsQuery } from "~/hooks/use-audit-logs";
import { AuditTimeline } from "~/components/compliance/audit-timeline";
import { cn } from "~/lib/utils";
import type { loader } from "./compliance-user-detail";

const AVAILABLE_SEALS = [
  { id: "INVESTOR_VERIFIED", label: "Investidor Verificado", emoji: "✅" },
  { id: "FOUNDER_PREMIUM", label: "Founder Premium", emoji: "⭐" },
  { id: "KYC_APPROVED", label: "KYC Aprovado", emoji: "🛡️" },
  { id: "HIGH_INVESTOR", label: "Alto Investidor", emoji: "💰" },
  { id: "EARLY_ADOPTER", label: "Early Adopter", emoji: "🚀" },
];

export function meta() {
  return [
    { title: "Notas e Selos | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailNotesSealsPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  // Histórico de interações de compliance sobre este User.
  // Backend ainda não expõe mutações de notas/selos/rating em user-level;
  // exibimos o audit log como histórico read-only.
  const auditQuery = useAuditLogsQuery("User", user?.id, 100);

  if (!user) {
    return <div>Carregando...</div>;
  }

  const rating = user.rating ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        {/* Rating */}
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <Star className="w-5 h-5 text-primary" />
            Avaliação
          </h2>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                aria-label={`${star} estrelas`}
                className={cn(
                  "p-2",
                  star <= rating
                    ? "text-yellow-400"
                    : "text-muted-foreground",
                )}
              >
                <Star className={cn("w-6 h-6", star <= rating && "fill-current")} />
              </span>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {rating > 0 ? `${rating}/5` : "Sem avaliação"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Edição de rating será habilitada quando backend expor endpoint dedicado.
          </p>
        </section>

        {/* Selos */}
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <Award className="w-5 h-5 text-primary" />
            Selos
          </h2>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {user.seals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum selo aplicado.</p>
              ) : (
                user.seals.map((seal: string) => {
                  const sealInfo = AVAILABLE_SEALS.find((s) => s.id === seal);
                  return (
                    <span
                      key={seal}
                      className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-black uppercase tracking-widest border border-primary/30 flex items-center gap-2"
                    >
                      {sealInfo?.emoji} {sealInfo?.label || seal}
                    </span>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Edição de selos será habilitada quando backend expor endpoint dedicado.
            </p>
          </div>
        </section>

        {/* Histórico de Compliance (audit log) */}
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-primary" />
            Histórico de Compliance
          </h2>

          {auditQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : (
            <AuditTimeline entries={auditQuery.data ?? []} />
          )}
          <p className="text-[10px] text-muted-foreground/60">
            Eventos gravados pelo sistema (KYC decide, status toggle, change requests, etc).
            Backend não expõe campo nativo de notas no User; este audit log serve como histórico read-only.
          </p>
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Notas e Selos
          </span>
          <p className="text-xs text-muted-foreground/60">
            Visualização read-only de selos/rating + timeline de auditoria. Edição de notas
            e rating depende de endpoints backend ainda não implementados para user-level.
          </p>
        </div>
      </aside>
    </div>
  );
}