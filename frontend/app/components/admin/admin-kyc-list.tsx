import { Link, useSearchParams } from "react-router";
import { ShieldCheck } from "lucide-react";
import { AdminKycListHeader } from "~/components/admin/admin-kyc-list-header";
import { AdminKycListFilters } from "~/components/admin/admin-kyc-list-filters";
import { AdminKycListPagination } from "~/components/admin/admin-kyc-list-pagination";
import { AdminKycListEmptyState } from "~/components/admin/admin-kyc-list-empty-state";
import { cn } from "~/lib/utils";

type KycStatus =
  | "aprovado"
  | "pendente"
  | "rejeitado"
  | "reenvio"
  | "nao_enviado";

interface KycUser {
  id: number;
  nome: string;
  email: string;
  role?: string;
  createdAt: string;
  kycStatus: KycStatus;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminKycListProps {
  users: KycUser[];
  filters?: { search?: string; kycStatus?: string };
  pagination: Pagination;
  hasActiveFilters?: boolean;
}

/**
 * Tokens semânticos do theme (NÃO emerald — emerald é só financeiro).
 *  - aprovado  → primary (magenta) — destaque de plataforma
 *  - pendente  → warning (âmbar)
 *  - rejeitado → destructive (vermelho)
 *  - reenvio    → warning (precisa de ação mas não bloqueante)
 *  - nao_enviado → neutro
 */
const STATUS_UI: Record<KycStatus, { label: string; className: string }> = {
  aprovado: {
    label: "Aprovado",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  pendente: {
    label: "Pendente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  rejeitado: {
    label: "Rejeitado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  reenvio: {
    label: "Reenvio",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  nao_enviado: {
    label: "Sem docs",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function initials(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AdminKycList({
  users,
  filters = {},
  pagination,
  hasActiveFilters = false,
}: AdminKycListProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminKycListHeader total={pagination.total} />

      <AdminKycListFilters filters={filters} />

      {users.length === 0 ? (
        <AdminKycListEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 backdrop-blur-sm">
          <div className="overflow-x-auto no-scrollbar -mx-3 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[640px] sm:min-w-0">
              <thead>
                <tr className="bg-accent/20 border-b border-white/5">
                  <th className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    ID
                  </th>
                  <th className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    Usuário
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    E-mail
                  </th>
                  <th className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-center text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    Status KYC
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    Cadastro
                  </th>
                  <th className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-right text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const ui = STATUS_UI[u.kycStatus] ?? STATUS_UI.nao_enviado;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 font-mono text-primary/80 text-xs font-bold whitespace-nowrap">
                        #{String(u.id).padStart(6, "0")}
                      </td>
                      <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[10px] sm:text-xs font-black ring-2 ring-primary/20 group-hover:ring-primary transition-all shrink-0">
                            {initials(u.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-foreground italic text-sm truncate">
                              {u.nome}
                            </p>
                            {u.role && (
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 truncate">
                                {u.role}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-sm font-medium text-muted-foreground/80 break-all">
                        {u.email}
                      </td>
                      <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-center">
                        <span
                          className={cn(
                            "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block",
                            ui.className,
                          )}
                        >
                          {ui.label}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-xs font-bold text-muted-foreground/60 tracking-tight whitespace-nowrap">
                        {dateFmt.format(new Date(u.createdAt))}
                      </td>
                      <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-right">
                        <Link
                          to={`/admin/kyc?userId=${u.id}`}
                          className="text-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                          <span className="hidden sm:inline">Revisar</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminKycListPagination pagination={pagination} />
        </div>
      )}
    </div>
  );
}
