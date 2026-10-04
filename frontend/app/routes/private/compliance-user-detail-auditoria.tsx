import { useRouteLoaderData } from "react-router";
import { History, Clock, User as UserIcon, Globe } from "lucide-react";
import type { loader } from "./compliance-user-detail";

export function meta() {
  return [
    { title: "Auditoria | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailAuditPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            Histórico de Auditoria
          </h2>

          {user.auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro de auditoria.</p>
          ) : (
            <div className="space-y-3">
              {user.auditLogs.map((log: { id: number; action: string; entity: string; createdAt: string; ip: string; adminNome: string }) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <History className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{log.action}</h3>
                      <p className="text-xs text-muted-foreground">{log.entity}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <UserIcon className="w-3 h-3" />
                      {log.adminNome}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <Globe className="w-3 h-3" />
                      {log.ip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Auditoria
          </span>
          <p className="text-xs text-muted-foreground/60">
            Histórico de todas as ações realizadas neste usuário por administradores.
          </p>
        </div>
      </aside>
    </div>
  );
}