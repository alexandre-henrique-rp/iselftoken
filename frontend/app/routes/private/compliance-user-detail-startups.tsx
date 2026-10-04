import { useRouteLoaderData, useRevalidator } from "react-router";
import { Building, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { loader } from "./compliance-user-detail";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "text-yellow-400" },
  APPROVED: { label: "Aprovado", color: "text-green-400" },
  REJECTED: { label: "Rejeitado", color: "text-red-400" },
};

export function meta() {
  return [
    { title: "Startups | Compliance | iSelfToken" },
  ];
}

async function decideStartup(
  startupId: number,
  decision: "APPROVED" | "REJECTED",
): Promise<unknown> {
  const res = await fetch(`/api/compliance/startup/${startupId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Falha ${res.status}`,
    );
  }
  return res.json();
}

export default function ComplianceUserDetailStartupsPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");
  const revalidator = useRevalidator();

  const mutation = useMutation({
    mutationFn: ({
      startupId,
      decision,
    }: {
      startupId: number;
      decision: "APPROVED" | "REJECTED";
    }) => decideStartup(startupId, decision),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.decision === "APPROVED"
          ? "Startup aprovada"
          : "Startup rejeitada",
      );
      revalidator.revalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao decidir startup",
      );
    },
  });

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <Building className="w-5 h-5 text-primary" />
            Startups do Founder
          </h2>

          {user.startups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma startup criada.</p>
          ) : (
            <div className="space-y-4">
              {user.startups.map((startup) => {
                const statusInfo = STATUS_LABELS[startup.status] || { label: startup.status, color: "text-muted-foreground" };
                const isPending = mutation.isPending && mutation.variables?.startupId === startup.id;
                return (
                  <div
                    key={startup.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{startup.nome}</h3>
                      <p className={cn("text-xs", statusInfo.color)}>{statusInfo.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada em {new Date(startup.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => mutation.mutate({ startupId: startup.id, decision: "APPROVED" })}
                        disabled={startup.status === "APPROVED" || isPending}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          startup.status === "APPROVED"
                            ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        )}
                      >
                        {isPending && mutation.variables?.decision === "APPROVED" ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => mutation.mutate({ startupId: startup.id, decision: "REJECTED" })}
                        disabled={startup.status === "REJECTED" || isPending}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          startup.status === "REJECTED"
                            ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        )}
                      >
                        {isPending && mutation.variables?.decision === "REJECTED" ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </button>
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
            Startups
          </span>
          <p className="text-xs text-muted-foreground/60">
            Gerencie as startups criadas por este usuário.
          </p>
        </div>
      </aside>
    </div>
  );
}