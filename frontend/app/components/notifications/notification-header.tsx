import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { NotificationFilter } from "~/lib/queries";

const filters: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "investments", label: "Investimentos" },
  { id: "security", label: "Segurança" },
  { id: "subscriptions", label: "Perfis" },
  { id: "repasses", label: "Repasses" },
  { id: "general", label: "Geral" },
];

interface NotificationHeaderProps {
  activeFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  onMarkAllAsRead: () => void;
  isMarkingAll?: boolean;
  canMarkAll?: boolean;
}

export function NotificationHeader({
  activeFilter,
  onFilterChange,
  onMarkAllAsRead,
  isMarkingAll = false,
  canMarkAll = false,
}: NotificationHeaderProps) {
  return (
    <header className="mb-8 sm:mb-12">
      {/* Display / H1 — escala oficial (Inter, sem italic) */}
      <h1 className="mb-5 text-3xl font-black tracking-tighter text-foreground sm:mb-6 sm:text-4xl lg:text-5xl">
        Notificações
      </h1>

      <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Filtros */}
        <nav
          className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-2.5"
          aria-label="Filtrar notificações"
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 sm:px-6 sm:text-xs",
                  isActive
                    ? "bg-primary text-on-primary-fixed"
                    : "bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </nav>

        {/* Ações */}
        <div className="flex w-full items-center justify-start gap-4 text-[11px] font-black uppercase tracking-[0.16em] text-primary sm:w-auto sm:tracking-[0.2em]">
          <button
            onClick={onMarkAllAsRead}
            disabled={!canMarkAll || isMarkingAll}
            className="inline-flex items-center gap-2 transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMarkingAll && <Loader2 className="size-3.5 animate-spin" />}
            Marcar todas como lidas
          </button>
        </div>
      </div>
    </header>
  );
}
