import type { Route } from "./+types/financeiro-plans";
import { Form, useActionData, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import {
  useAdminPlansQuery,
  useDeletePlanMutation,
} from "~/hooks/use-plans-admin";
import { PlanCard } from "~/components/financeiro/plan-card";
import type { PlanItem } from "~/lib/plan-types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Planos | Financeiro | iSelfToken" },
    { name: "description", content: "Gestão de planos SaaS." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  return { search };
}

export async function action({ request }: Route.ActionArgs) {
  // A action de DELETE é local (handler via hook); aqui fica apenas o proxy
  // para o BFF se necessário no futuro.
  return { ok: true };
}

export default function FinanceiroPlansPage({
  loaderData,
}: Route.ComponentProps) {
  const { search } = loaderData;
  const [searchInput, setSearchInput] = useState(search);
  const nav = useNavigation();
  const plansQuery = useAdminPlansQuery({ search });
  const deleteMutation = useDeletePlanMutation();
  const actionData = useActionData<typeof action>();
  const ultimo = useRef<unknown>(null);

  useEffect(() => {
    if (!actionData || actionData === ultimo.current) return;
    ultimo.current = actionData;
    if ("success" in actionData && actionData.success) toast.success("Operação concluída");
  }, [actionData]);

  const plans: PlanItem[] = plansQuery.data?.data ?? [];
  const total = plansQuery.data?.total ?? 0;
  const ativos = plans.filter((p) => p.isActive).length;
  const inativos = plans.length - ativos;
  const totalSubs = plans.reduce(
    (s, p) => s + (p.activeSubscribers ?? 0),
    0,
  );

  async function handleDelete(plan: PlanItem) {
    const ok = confirm(
      `Desativar o plano "${plan.nome}"?\n\nAssinaturas existentes permanecem ativas até a expiração.`,
    );
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(plan.id);
      toast.success("Plano desativado");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao desativar plano",
      );
    }
  }

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Financeiro
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
            Planos <span className="text-primary italic">SaaS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Crie, edite e desative planos exibidos no{" "}
            <code className="text-[11px] font-mono text-primary">/pricing</code>. O
            percentual de cada categoria é gerenciado em{" "}
            <code className="text-[11px] font-mono text-primary">
              /financeiro/config
            </code>
            .
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <span className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
            {ativos} ativo{ativos !== 1 ? "s" : ""}
          </span>
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-xs font-black uppercase tracking-widest">
            {inativos} inativo{inativos !== 1 ? "s" : ""}
          </span>
          <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
            {totalSubs} assinantes
          </span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <form method="get" className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            name="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou slug…"
            className="w-full bg-accent/30 border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
          />
        </form>
        <a
          href="/financeiro/plans/new"
          className="px-5 py-2.5 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-1.5 justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Plano
        </a>
      </div>

      {plansQuery.isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Carregando planos…
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center space-y-3">
          <p className="text-lg font-black text-foreground">
            {search ? "Nenhum plano encontrado" : "Nenhum plano cadastrado"}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {search
              ? `Sem resultados para "${search}". Limpe o filtro e tente de novo.`
              : "Crie seu primeiro plano pelo botão acima."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="relative group">
              <PlanCard plan={plan} adminActions />
              {plan.isActive && (
                <button
                  type="button"
                  onClick={() => handleDelete(plan)}
                  disabled={deleteMutation.isPending}
                  className="absolute top-4 right-4 px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                  title="Desativar plano (soft delete)"
                >
                  Desativar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {plansQuery.isFetching && nav.state !== "idle" && (
        <div className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Atualizando…
        </div>
      )}
    </div>
  );
}
