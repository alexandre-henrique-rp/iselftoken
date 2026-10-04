import { Search, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router";
import { cn } from "~/lib/utils";

const SECTOR_PILLS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "fintech", label: "FinTech" },
  { value: "agrotech", label: "AgroTech" },
  { value: "saas", label: "SaaS" },
  { value: "healthtech", label: "Saúde" },
  { value: "web3", label: "Web3" },
  { value: "deeptech", label: "DeepTech" },
  { value: "energytech", label: "EnergyTech" },
  { value: "edtech", label: "EdTech" },
  { value: "logtech", label: "Logística" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "industry", label: "Indústria 4.0" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "trending", label: "Em alta" },
  { value: "newest", label: "Mais recentes" },
];

export function StickyFilterBar() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "trending";
  const sector = params.get("sector") ?? "";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-white/5 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Buscar startup, setor, fundador..."
            aria-label="Buscar startup"
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            aria-label="Ordenar por"
            className="appearance-none bg-white/5 border border-white/10 rounded-full pl-4 pr-10 py-2.5 text-xs font-bold uppercase tracking-widest text-white cursor-pointer hover:border-primary/50 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-background">
                Ordenar: {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Filtrar por setor"
        className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {SECTOR_PILLS.map((pill) => {
          const active = sector === pill.value;
          return (
            <button
              key={pill.value || "all"}
              role="tab"
              aria-selected={active}
              onClick={() => update("sector", pill.value)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                active
                  ? "bg-primary text-black"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
