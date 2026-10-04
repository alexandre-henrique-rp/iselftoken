import { Columns3, LayoutGrid, List, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  parseSearchState,
  updateSearch,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatusFilter,
  type DashboardView,
  type PlatformStatusFilter,
} from "./dashboard-state";
import { cn } from "~/lib/utils";

interface FounderFiltersProps {
  totalCount: number;
  approvedCount: number;
  analyzingCount: number;
  campaignCounts: Record<Exclude<CampaignStatusFilter, "all">, number>;
}

export function FounderFilters({
  totalCount,
  approvedCount,
  analyzingCount,
  campaignCounts,
}: FounderFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseSearchState(searchParams);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Resync input value if URL changes externally (back/forward, "Limpar filtros").
  // Skipped when the input already matches — i.e. the URL change came from this input's own debounce.
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== state.q) {
      inputRef.current.value = state.q;
    }
  }, [state.q]);

  const setPlatformStatus = (status: PlatformStatusFilter) => {
    updateSearch(setSearchParams, { status: status === "all" ? "" : status }, { resetPage: true });
  };

  const setCampaignStatus = (status: CampaignStatusFilter) => {
    updateSearch(
      setSearchParams,
      { campaignStatus: status === "all" ? "" : status },
      { resetPage: true },
    );
  };

  const setView = (view: DashboardView) => {
    updateSearch(setSearchParams, { view: view === "list" ? "" : view }, { resetPage: true });
  };

  const setQuery = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSearch(setSearchParams, { q: value }, { resetPage: true, replace: true });
    }, 250);
  };

  return (
    <section className="flex flex-col items-stretch gap-3 mb-6 lg:flex-row lg:items-center">
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/5 bg-accent/20 p-1">
          <FilterChip active={state.platformStatus === "all"} onClick={() => setPlatformStatus("all")} count={totalCount} tone="primary">
            Todas
          </FilterChip>
          <FilterChip active={state.platformStatus === "approved"} onClick={() => setPlatformStatus("approved")} count={approvedCount} tone="approved">
            Aprovadas
          </FilterChip>
          <FilterChip active={state.platformStatus === "analyzing"} onClick={() => setPlatformStatus("analyzing")} count={analyzingCount} tone="amber">
            Análise
          </FilterChip>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/5 bg-accent/20 p-1">
          <FilterChip active={state.campaignStatus === "all"} onClick={() => setCampaignStatus("all")} count={totalCount} tone="primary">
            Captações
          </FilterChip>
          {(Object.entries(CAMPAIGN_STATUS_LABELS) as Array<[Exclude<CampaignStatusFilter, "all">, string]>).map(
            ([status, label]) => (
              <FilterChip
                key={status}
                active={state.campaignStatus === status}
                onClick={() => setCampaignStatus(status)}
                count={campaignCounts[status]}
                tone="default"
              >
                {label}
              </FilterChip>
            ),
          )}
        </div>
      </div>



      <div className="flex items-center gap-1 bg-accent/20 p-1 rounded-xl border border-white/5 self-start lg:self-center">
        <ViewToggle active={state.view === "list"} onClick={() => setView("list")} label="Lista">
          <List className="w-3.5 h-3.5" />
        </ViewToggle>
        <ViewToggle active={state.view === "grid"} onClick={() => setView("grid")} label="Grade">
          <LayoutGrid className="w-3.5 h-3.5" />
        </ViewToggle>
        <ViewToggle active={state.view === "kanban"} onClick={() => setView("kanban")} label="Kanban">
          <Columns3 className="w-3.5 h-3.5" />
        </ViewToggle>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  tone: "primary" | "approved" | "amber" | "default";
  children: React.ReactNode;
}) {
  const toneActive = "bg-primary text-black";
  const toneIdle = "text-muted-foreground hover:text-foreground hover:bg-accent/40";
  const countBg =
    tone === "primary"
      ? "bg-black/20 text-current"
      : tone === "approved"
        ? "bg-primary/15 text-primary"
        : tone === "amber"
          ? "bg-amber-500/10 text-amber-400"
          : "bg-white/10 text-muted-foreground";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-lg transition-colors font-black uppercase tracking-widest text-[10px] flex items-center gap-2",
        active ? toneActive : toneIdle
      )}
    >
      {children}
      <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] tabular-nums", countBg)}>
        {count}
      </span>
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      )}
    >
      {children}
    </button>
  );
}
