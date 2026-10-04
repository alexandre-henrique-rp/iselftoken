import { Form, Link } from "react-router";
import { Search, Filter } from "lucide-react";

interface Facet {
  value: string;
  total: number;
}

interface AdminHistoryFiltersProps {
  qs: string;
  facets?: { byCategory: Facet[]; byRole: Facet[]; byStatus: Facet[] };
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options?: Facet[];
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">
        {label}
      </label>
      <select
        name={name}
        defaultValue={value}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
      >
        <option value="">Todos</option>
        {(options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({o.total})
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminHistoryFilters({ qs, facets }: AdminHistoryFiltersProps) {
  const params = new URLSearchParams(qs);
  const cur = (k: string) => params.get(k) ?? "";

  return (
    <Form
      method="get"
      className="glass-panel rounded-2xl p-5 border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
    >
      <div className="lg:col-span-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">
          Busca
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            name="search"
            defaultValue={cur("search")}
            placeholder="ator, startup, ação…"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <SelectFilter
        name="category"
        label="Categoria"
        value={cur("category")}
        options={facets?.byCategory}
      />
      <SelectFilter
        name="role"
        label="Papel"
        value={cur("role")}
        options={facets?.byRole}
      />
      <SelectFilter
        name="status"
        label="Status"
        value={cur("status")}
        options={facets?.byStatus}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-primary text-black hover:opacity-90 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" /> Filtrar
        </button>
        <Link
          to="/admin/history"
          className="py-2.5 px-3 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest flex items-center"
        >
          Limpar
        </Link>
      </div>
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">
          De
        </label>
        <input
          type="date"
          name="from"
          defaultValue={cur("from")}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">
          Até
        </label>
        <input
          type="date"
          name="to"
          defaultValue={cur("to")}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
        />
      </div>
    </Form>
  );
}
