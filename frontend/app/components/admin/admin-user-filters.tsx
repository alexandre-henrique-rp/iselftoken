import {
  Calendar,
  ChevronDown,
  ListFilter,
  RefreshCcw,
  Search,
} from "lucide-react";
import { useRef, type SyntheticEvent } from "react";
import { Form, useNavigate, useSubmit } from "react-router";

interface AdminUserFiltersProps {
  filters?: { search?: string; status?: string; createdFrom?: string };
}

/**
 * Filtros da Gestão de Usuários. É um `<Form method="get">`: ao submeter,
 * os campos viram query params na URL e a listagem recebe os dados filtrados.
 * Status e data submetem imediatamente; pesquisa submete com Enter.
 */
export function AdminUserFilters({ filters = {} }: AdminUserFiltersProps) {
  const submit = useSubmit();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const submitForm = () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") continue;
      const normalizedValue = value.trim();
      if (normalizedValue) params.set(key, normalizedValue);
    }

    submit(params, { method: "get", replace: true });
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitForm();
  };

  return (
    <Form
      ref={formRef}
      method="get"
      onSubmit={handleSubmit}
      className="mb-4 grid grid-cols-1 items-end gap-3 rounded-2xl border border-white/10 bg-card/70 p-4 shadow-lg backdrop-blur-xl sm:grid-cols-2 md:gap-4 md:p-5 lg:grid-cols-12"
    >
      <div className="relative space-y-1.5 sm:col-span-2 lg:col-span-5">
        <label
          htmlFor="admin-users-search"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Pesquisa direta
        </label>
        <div className="group relative">
          <Search
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden
          />
          <input
            id="admin-users-search"
            name="search"
            defaultValue={filters.search ?? ""}
            className="h-11 w-full rounded-xl border border-white/10 bg-card/80 pl-11 pr-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="Pesquisar por nome ou e-mail..."
            type="search"
          />
        </div>
      </div>

      <div className="relative space-y-1.5 lg:col-span-3">
        <label
          htmlFor="admin-users-status"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Status da conta
        </label>
        <div className="group relative">
          <ListFilter
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden
          />
          <select
            id="admin-users-status"
            name="status"
            defaultValue={filters.status ?? ""}
            onChange={submitForm}
            className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-card/80 pl-11 pr-10 text-sm font-medium text-foreground outline-none transition focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option className="bg-black" value="">
              Todos os status
            </option>
            <option className="bg-black" value="active">
              Ativo
            </option>
            <option className="bg-black" value="suspended">
              Suspenso
            </option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
            aria-hidden
          />
        </div>
      </div>

      <div className="relative space-y-1.5 lg:col-span-3">
        <label
          htmlFor="admin-users-created-from"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Cadastro a partir de
        </label>
        <div className="group relative">
          <Calendar
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden
          />
          <input
            id="admin-users-created-from"
            name="createdFrom"
            defaultValue={filters.createdFrom ?? ""}
            onChange={submitForm}
            className="h-11 w-full rounded-xl border border-white/10 bg-card/80 pl-11 pr-4 text-sm font-medium text-foreground outline-none transition scheme-dark focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            type="date"
          />
        </div>
      </div>

      <div className="flex sm:col-span-2 lg:col-span-1">
        <button
          type="button"
          title="Limpar filtros"
          aria-label="Limpar filtros"
          onClick={() => navigate("/admin/users", { replace: true })}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-accent/40 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition hover:border-primary/30 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] lg:aspect-square lg:px-0"
        >
          <RefreshCcw
            className="h-4 w-4 transition-transform duration-700 group-hover:rotate-180"
            aria-hidden
          />
          <span className="lg:sr-only">Limpar</span>
        </button>
      </div>
    </Form>
  );
}
