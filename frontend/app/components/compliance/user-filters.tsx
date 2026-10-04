import { Calendar, ChevronDown, ListFilter, Search } from "lucide-react";
import { Form } from "react-router";

interface UserFiltersProps {
  search: string;
  role: string;
  kycStatus: string;
}

export function UserFilters({ search, role, kycStatus }: UserFiltersProps) {
  return (
    <Form
      method="get"
      className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-card/70 p-4 shadow-lg backdrop-blur-xl sm:grid-cols-2 md:mb-6 md:gap-4 md:p-5 lg:grid-cols-12"
    >
      <input type="hidden" name="page" value="1" />
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-5">
        <label
          htmlFor="compliance-users-search"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Pesquisa por nome ou e-mail
        </label>
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden
          />
          <input
            id="compliance-users-search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Digite nome ou e-mail..."
            className="h-11 w-full rounded-xl border border-white/10 bg-card/80 pl-11 pr-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>
      <div className="space-y-1.5 lg:col-span-3">
        <label
          htmlFor="compliance-users-role"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Perfil de acesso
        </label>
        <div className="group relative">
          <ListFilter
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <select
            id="compliance-users-role"
            name="role"
            defaultValue={role}
            className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-card/80 pl-11 pr-10 text-sm font-medium text-foreground outline-none transition focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="">Todas as roles</option>
            <option value="USER">Usuário</option>
            <option value="ADMIN">Admin</option>
            <option value="FINANCEIRO">Financeiro</option>
            <option value="COMPLIANCE">Compliance</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
            aria-hidden
          />
        </div>
      </div>
      <div className="space-y-1.5 lg:col-span-3">
        <label
          htmlFor="compliance-users-kyc"
          className="ml-1 text-xs font-semibold text-muted-foreground"
        >
          Status KYC
        </label>
        <div className="group relative">
          <ListFilter
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <select
            id="compliance-users-kyc"
            name="kycStatus"
            defaultValue={kycStatus}
            className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-card/80 pl-11 pr-10 text-sm font-medium text-foreground outline-none transition focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="">Todos os status</option>
            <option value="APPROVED">KYC aprovado</option>
            <option value="PENDING">KYC pendente</option>
            <option value="UNDER_REVIEW">KYC em análise</option>
            <option value="REJECTED">KYC reprovado</option>
            <option value="NEEDS_RESUBMISSION">KYC precisa reenviar</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
            aria-hidden
          />
        </div>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Filtrar
        </button>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-12">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>
            Os resultados são ordenados pelos cadastros mais recentes.
          </span>
        </div>
      </div>
    </Form>
  );
}
