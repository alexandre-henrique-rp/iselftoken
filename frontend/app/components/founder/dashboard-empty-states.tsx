/**
 * Estados vazios da dashboard do fundador.
 *
 * - EmptyNoStartups: founder sem nenhuma startup cadastrada.
 * - EmptyNoMatch: há startups mas filtros não retornaram nada.
 *
 * Ambos tratam UX consistente: ícone ausente + copy amigável + CTA primário.
 */
import { Link } from "react-router";

export function EmptyNoStartups() {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-white/10 bg-accent/10">
      <p className="text-lg font-black text-foreground tracking-tight">
        Você ainda não possui startups cadastradas.
      </p>
      <p className="text-sm mt-2 text-muted-foreground">
        Clique em{" "}
        <Link
          to="/founder/startups/new"
          className="text-primary hover:underline font-bold"
        >
          Nova Startup
        </Link>{" "}
        para começar.
      </p>
    </div>
  );
}

export function EmptyNoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-white/10 bg-accent/10">
      <p className="text-lg font-black text-foreground tracking-tight">
        Nenhuma startup corresponde aos filtros aplicados.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
      >
        Limpar filtros
      </button>
    </div>
  );
}

/** Skeleton estrutural para o estado de loading (lista de cards). */
export function DashboardStartupGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando startups"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-accent/15 border border-white/5 p-5 space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-accent/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-accent/40" />
              <div className="h-2 w-1/2 rounded bg-accent/30" />
            </div>
          </div>
          <div className="h-2 w-full rounded bg-accent/30" />
          <div className="h-2 w-2/3 rounded bg-accent/30" />
        </div>
      ))}
    </div>
  );
}

/** Erro amigável com botão de retry. */
export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-destructive/30 bg-destructive/5">
      <p className="text-lg font-black text-foreground tracking-tight">
        Não foi possível carregar suas startups.
      </p>
      <p className="text-sm mt-2 text-muted-foreground">
        Verifique sua conexão e tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
      >
        Tentar novamente
      </button>
    </div>
  );
}
