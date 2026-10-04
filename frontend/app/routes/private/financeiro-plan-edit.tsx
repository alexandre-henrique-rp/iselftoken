import type { Route } from "./+types/financeiro-plan-edit";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye } from "lucide-react";
import {
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useAdminPlanStatsQuery,
  type PlanPayload,
} from "~/hooks/use-plans-admin";
import { PlanEditForm } from "~/components/financeiro/plan-edit-form";
import { PlanPreview } from "~/components/financeiro/plan-preview";
import { PlanStatsCard } from "~/components/financeiro/plan-stats-card";
import type { PlanItem } from "~/lib/plan-types";

export function meta({ params }: Route.MetaArgs) {
  const isNew = params.id === undefined || params.id === "new";
  return [
    {
      title: isNew
        ? "Novo Plano | Financeiro | iSelfToken"
        : `Plano #${params.id} | Financeiro | iSelfToken`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const id = params.id;
  if (!id || id === "new") {
    return { plan: null as PlanItem | null, id: null as string | null };
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const res = await fetch(`${BACKEND_URL}/plans/${id}`, {
    headers: {
      accept: "application/json",
      cookie: cookieHeader,
    },
  });
  const json = await res.json().catch(() => null);
  return {
    plan: (json?.data ?? null) as PlanItem | null,
    id,
  };
}

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

export default function FinanceiroPlanEditPage({
  loaderData,
}: Route.ComponentProps) {
  const { plan, id } = loaderData;
  const isNew = plan === null;
  const navigate = useNavigate();
  const create = useCreatePlanMutation();
  const update = useUpdatePlanMutation();
  const statsQuery = useAdminPlanStatsQuery(isNew ? undefined : Number(id));

  // Estado do preview ao vivo (espelha o form)
  const [previewState, setPreviewState] = useState<PlanPayload>(
    plan
      ? toPayload(plan)
      : {
          nome: "",
          slug: "",
          descricao: undefined,
          preco: 0,
          periodoMeses: 12,
          periodo: "/ano",
          icon: "star",
          beneficios: [],
          textoBotao: undefined,
          visivel: true,
          isActive: true,
          recomendado: false,
        },
  );

  useEffect(() => {
    if (plan) setPreviewState(toPayload(plan));
  }, [plan]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(payload: PlanPayload) {
    setSubmitError(null);
    setPreviewState(payload);
    try {
      if (plan?.id) {
        await update.mutateAsync({ id: plan.id, ...payload });
        toast.success("Plano atualizado!");
        navigate(`/financeiro/plans/${plan.id}`);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success("Plano criado!");
        navigate(`/financeiro/plans/${created.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar plano";
      setSubmitError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="relative max-w-[1400px] mx-auto space-y-8">
      <Link
        to="/financeiro/plans"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar à lista
      </Link>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Financeiro · {isNew ? "Novo" : "Editar"}
          </span>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            {plan?.nome ?? "Novo plano"}
          </h1>
        </div>
      </header>

      {!isNew && statsQuery.data && <PlanStatsCard stats={statsQuery.data} loading={statsQuery.isLoading} />}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
        <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-6">
          <PlanEditForm
            initial={plan ?? undefined}
            editingId={plan?.id}
            onSubmit={onSubmit}
            onCancel={() => navigate("/financeiro/plans")}
            submitting={create.isPending || update.isPending}
            error={submitError}
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
            <Eye className="w-3.5 h-3.5" /> Preview ao vivo
          </div>
          <PlanPreview
            plan={{
              id: plan?.id ?? 0,
              ...previewState,
              activeSubscribers: plan?.activeSubscribers,
              createdAt: plan?.createdAt ?? new Date().toISOString(),
              updatedAt: plan?.updatedAt ?? new Date().toISOString(),
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function toPayload(plan: PlanItem): PlanPayload {
  return {
    nome: plan.nome,
    slug: plan.slug,
    descricao: plan.descricao ?? undefined,
    preco: Number(plan.preco ?? 0),
    periodoMeses: plan.periodoMeses ?? 12,
    periodo: plan.periodo ?? "/ano",
    icon: plan.icon ?? "star",
    beneficios: plan.beneficios ?? [],
    textoBotao: plan.textoBotao ?? undefined,
    visivel: Boolean(plan.visivel),
    isActive: Boolean(plan.isActive),
    recomendado: Boolean(plan.recomendado),
  };
}
