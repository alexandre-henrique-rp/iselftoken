import type { Route } from "./+types/compliance-startups";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { HardDeleteStartupDialog } from "~/components/admin/hard-delete-startup-dialog";
import { useUserRole } from "~/hooks/use-user-role";
import { ESTAGIO_LABELS, type EstagioStartup } from "~/lib/startup-enums";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";
const PAGE_LIMIT = 25;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Compliance Startups | iSelfToken" },
    { name: "description", content: "Painel de compliance para análise e aprovação de startups." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";
  const cookie = request.headers.get("cookie") || ""; // sessão para o SSR

  try {
    const params = new URLSearchParams({ page, ...(status && { status }) });
    const response = await fetch(`${BACKEND_URL}/admin/startups?${params}`, {
      headers: { accept: "application/json", cookie },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const total = json.total ?? 0;
    return {
      data: json.data ?? [],
      pagination: {
        page: json.pagina ?? Number(page),
        limit: PAGE_LIMIT,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)),
      },
    };
  } catch {
    return {
      data: [],
      pagination: { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0 },
    };
  }
}

/** Status traduzido do backend → rótulo + estilo do badge. */
function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "aprovada":
      return { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "em_analise":
      return { label: "Em Análise", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "rejeitada":
      return { label: "Rejeitada", className: "bg-red-500/10 text-red-400 border-red-500/20" };
    default:
      return { label: status || "—", className: "bg-white/5 text-muted-foreground border-white/10" };
  }
}

export default function ComplianceStartupsPage({ loaderData }: Route.ComponentProps) {
  const { data: startups = [], pagination } = loaderData || {};
  const userRole = useUserRole();
  const isCompliance = userRole === "COMPLIANCE";
  const [deletingStartup, setDeletingStartup] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-16 lg:space-y-24">
      {/* Immersive Watermark */}
      <div className="fixed -bottom-10 -right-10 opacity-[0.03] pointer-events-none select-none -z-10 overflow-hidden rotate-[-5deg] whitespace-nowrap">
        <h1 className="text-[15vw] font-black italic tracking-tighter uppercase leading-none">iSelfToken</h1>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6 relative">
        <div className="hidden lg:block absolute -left-12 top-0 h-full w-px bg-linear-to-b from-primary via-primary/20 to-transparent opacity-40"></div>
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Compliance Overview</span>
          <h1 className="text-6xl lg:text-[7rem] font-black tracking-tighter text-foreground leading-none">
            Startup <span className="text-primary italic drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">Compliance</span>
          </h1>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-light tracking-tight text-muted-foreground flex items-center gap-3 justify-end italic">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            Audit Ready
          </h2>
          <p className="text-primary/60 text-[10px] mt-2 font-black tracking-[0.2em] uppercase">System Status: Optimal</p>
        </div>
      </header>

      {/* Table or Empty State */}
      {startups.length > 0 ? (
        <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground border-b border-white/5">
                  <th className="px-8 py-6">ID</th>
                  <th className="px-8 py-6">Startup</th>
                  <th className="px-8 py-6">Segmento</th>
                  <th className="px-8 py-6">Estágio</th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {startups.map((startup: { id: string | number; nome: string; segmento?: string; estagio?: string; status: string }) => {
                  const badge = statusBadge(startup.status);
                  return (
                  <tr key={startup.id} className="hover:bg-primary/2 transition-colors group">
                    <td className="px-8 py-6 font-mono text-primary text-xs font-bold">#{String(startup.id).padStart(6, "0")}</td>
                    <td className="px-8 py-6 font-black text-foreground italic">{startup.nome}</td>
                    <td className="px-8 py-6">
                      <span className="px-2.5 py-1 bg-accent/40 text-[10px] font-black uppercase tracking-widest rounded border border-white/5">
                        {startup.segmento || "N/A"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-muted-foreground/80 capitalize">{ESTAGIO_LABELS[startup.estagio as EstagioStartup] ?? startup.estagio ?? "—"}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <a
                        href={`/compliance/startups/${startup.id}`}
                        className="text-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
                      >
                        Revisar
                      </a>
                      {isCompliance && (
                        <button
                          onClick={() => setDeletingStartup({ id: String(startup.id), name: startup.nome })}
                          className="ml-4 text-destructive hover:text-destructive/80 transition-colors text-sm font-bold uppercase tracking-widest"
                          aria-label={`Excluir ${startup.nome} definitivamente`}
                        >
                          <Trash2 className="w-4 h-4 inline-block" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between bg-white/1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Mostrando <span className="text-foreground">{startups.length}</span> de <span className="text-foreground">{pagination?.total || 0}</span> startups
            </span>
          </div>
        </section>
      ) : (
        <div className="glass-panel rounded-3xl p-16 text-center">
          <p className="text-muted-foreground text-lg font-medium uppercase tracking-widest">Nenhuma startup pendente de análise</p>
        </div>
      )}

      {/* Modal de exclusao definitiva */}
      {deletingStartup && (
        <HardDeleteStartupDialog
          startupId={deletingStartup.id}
          startupName={deletingStartup.name}
          onClose={() => setDeletingStartup(null)}
        />
      )}
    </div>
  );
}