import { Form, useSubmit, useNavigate, useSearchParams } from "react-router";
import { useRef } from "react";
import { Search, ShieldCheck, ChevronDown, RefreshCcw } from "lucide-react";

type KycStatus =
  | "aprovado"
  | "pendente"
  | "rejeitado"
  | "reenvio"
  | "nao_enviado";

interface AdminKycListFiltersProps {
  filters?: { search?: string; kycStatus?: string };
}

const STATUS_OPTIONS: { value: KycStatus | ""; label: string }[] = [
  { value: "", label: "Todos os Status" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "reenvio", label: "Reenvio" },
  { value: "nao_enviado", label: "Sem documentos" },
];

/**
 * Filtros da fila KYC: pesquisa + status. Submetem no onChange (status) ou
 * no Enter (search). Voltar à página 1 ao filtrar evita cair em página
 * inexistente.
 *
 * Layout responsivo: empilhado no mobile (`flex-col`), lado-a-lado no
 * desktop (`sm:flex-row sm:flex-wrap`).
 */
export function AdminKycListFilters({
  filters = {},
}: AdminKycListFiltersProps) {
  const submit = useSubmit();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [params] = useSearchParams();

  const submitForm = () => {
    if (formRef.current) submit(formRef.current, { replace: true });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.kycStatus) ||
    params.has("search") ||
    params.has("kycStatus");

  return (
    <Form
      ref={formRef}
      method="get"
      className="glass-panel p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 border border-white/5 shadow-inner backdrop-blur-xl"
    >
      <input type="hidden" name="page" value="1" />

      <div className="flex-1 min-w-0 sm:min-w-[280px] space-y-2">
        <label
          htmlFor="kyc-search"
          className="block text-[9px] font-black text-primary uppercase tracking-[0.2em] ml-1"
        >
          Pesquisa
        </label>
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5"
            aria-hidden
          />
          <input
            id="kyc-search"
            name="search"
            defaultValue={filters.search ?? ""}
            className="w-full bg-accent/40 border-none rounded-xl pl-12 pr-4 py-3.5 sm:py-4 text-foreground focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/50 font-medium text-sm"
            placeholder="Pesquisar por nome, e-mail ou documento..."
            type="search"
          />
        </div>
      </div>

      <div className="w-full sm:w-56 space-y-2">
        <label
          htmlFor="kyc-status"
          className="block text-[9px] font-black text-primary uppercase tracking-[0.2em] ml-1"
        >
          Status do KYC
        </label>
        <div className="relative group">
          <ShieldCheck
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none group-focus-within:text-primary"
            aria-hidden
          />
          <select
            id="kyc-status"
            name="kycStatus"
            defaultValue={filters.kycStatus ?? ""}
            onChange={submitForm}
            className="w-full bg-accent/40 border-none rounded-xl px-5 py-3.5 sm:py-4 text-foreground focus:ring-1 focus:ring-primary/40 appearance-none font-bold text-[10px] uppercase tracking-widest cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option
                key={o.value || "all"}
                className="bg-black"
                value={o.value}
              >
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4 pointer-events-none opacity-50"
            aria-hidden
          />
        </div>
      </div>

      <div className="flex items-stretch gap-3 sm:contents">
        {hasActiveFilters ? (
          <button
            type="button"
            title="Limpar filtros"
            onClick={() => navigate("/admin/kyc", { replace: true })}
            className="bg-accent/60 hover:bg-primary hover:text-black transition-all rounded-full p-4 shadow-lg active:scale-95 group shrink-0"
            aria-label="Limpar filtros"
          >
            <RefreshCcw
              className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700"
              aria-hidden
            />
          </button>
        ) : (
          <span className="hidden sm:inline-block" aria-hidden />
        )}
      </div>
    </Form>
  );
}
