import { ChevronDown, ListFilter, RefreshCcw, Search } from "lucide-react";
import { useRef } from "react";
import { Form, useNavigate, useSubmit } from "react-router";

interface AdminStartupFiltersProps {
  filters?: { search?: string; status?: string; segmento?: string };
}

const SEGMENTOS = [
  "Fintech",
  "Inteligência Artificial",
  "SaaS",
  "Healthtech",
  "EdTech",
  "Biotech",
  "Agritech",
  "Logística",
  "Energia",
  "Varejo",
  "Entretenimento",
  "IoT",
];

/** Filtros GET da fila de startups, com submissão rápida para selects. */
export function AdminStartupFilters({
  filters = {},
}: AdminStartupFiltersProps) {
  const submit = useSubmit();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const submitForm = () => {
    const form = formRef.current;
    if (!form) return;
    // Trim defensivo no search antes de submeter: evita URL com leading/trailing
    // spaces (ex.: ?search=+FintechPro) que poluem o histórico e fazem o input
    // herdar espaços em navegações seguintes.
    const searchInput = form.querySelector<HTMLInputElement>(
      "input[name='search']",
    );
    if (searchInput) searchInput.value = searchInput.value.trim();
    submit(form, { replace: true });
  };

  return (
    <Form
      ref={formRef}
      method="get"
      className="bg-card border border-white/10 p-3 sm:p-5 rounded-2xl mb-6 md:mb-8 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:flex-wrap md:gap-4 shadow-lg"
    >
      <input type="hidden" name="page" value="1" />

      <div className="w-full md:flex-1 md:min-w-[240px] space-y-2">
        <label
          htmlFor="admin-startup-search"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Pesquisa
        </label>
        <div className="relative group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors"
            aria-hidden="true"
          />
          <input
            id="admin-startup-search"
            name="search"
            defaultValue={filters.search ?? ""}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 placeholder:text-muted-foreground/50 font-medium transition-all text-sm"
            placeholder="Nome, segmento ou estágio"
            type="search"
          />
        </div>
      </div>

      <div className="w-full md:w-auto md:min-w-[160px] space-y-2">
        <label
          htmlFor="admin-startup-status"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="admin-startup-status"
            name="status"
            defaultValue={filters.status ?? ""}
            onChange={submitForm}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 appearance-none font-semibold text-xs cursor-pointer"
          >
            <option className="bg-black" value="">
              Todos
            </option>
            <option className="bg-black" value="em_analise">
              Em análise
            </option>
            <option className="bg-black" value="aprovada">
              Aprovada
            </option>
            <option className="bg-black" value="rejeitada">
              Rejeitada
            </option>
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary w-4 h-4 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="w-full md:w-auto md:min-w-[180px] space-y-2">
        <label
          htmlFor="admin-startup-segmento"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Segmento
        </label>
        <div className="relative">
          <select
            id="admin-startup-segmento"
            name="segmento"
            defaultValue={filters.segmento ?? ""}
            onChange={submitForm}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 appearance-none font-semibold text-xs cursor-pointer"
          >
            <option className="bg-black" value="">
              Todos
            </option>
            {SEGMENTOS.map((segmento) => (
              <option key={segmento} className="bg-black" value={segmento}>
                {segmento}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary w-4 h-4 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex w-full md:w-auto md:shrink-0 items-stretch gap-2 pt-1 md:pt-0">
        <button
          type="submit"
          className="flex-1 md:flex-none min-h-11 bg-primary text-black font-bold px-5 py-3 rounded-full hover:shadow-[0_0_18px_rgba(213,0,249,0.25)] transition-all flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <ListFilter className="w-4 h-4" aria-hidden="true" />
          Aplicar
        </button>
        <button
          type="button"
          title="Limpar filtros"
          aria-label="Limpar filtros"
          onClick={() => navigate("/admin/startups", { replace: true })}
          className="size-11 bg-black/30 border border-white/10 hover:bg-primary hover:text-black transition-all rounded-full p-3 shadow-lg active:scale-95 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <RefreshCcw
            className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700"
            aria-hidden="true"
          />
        </button>
      </div>
    </Form>
  );
}
