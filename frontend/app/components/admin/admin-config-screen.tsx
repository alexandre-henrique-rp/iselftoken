import { useState } from "react";
import {
  AlertCircle,
  Clock,
  History,
  Percent,
  DollarSign,
  Hash,
  ToggleRight,
  Save,
  RefreshCcw,
} from "lucide-react";
import { useAdminConfigQuery } from "~/hooks/use-admin-config";
import { useUpdateConfigMutation } from "~/hooks/use-update-config-mutation";
import type { AdminConfigParam } from "~/lib/queries";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { AdminConfigHeader } from "./admin-config-header";
import { AdminConfigSkeleton } from "./admin-config-skeleton";
import { AdminConfigHistoryPanel } from "./admin-config-history";
import { AdminConfigForm } from "./admin-config-form";
import { AdminTaxonomyPanel } from "./admin-taxonomy-panel";
import { AdminInstallmentPanel } from "./admin-installment-panel";

type Unit = AdminConfigParam["unit"];
type ParamVersion = AdminConfigParam["history"][number];

const dataBr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const isEpoch = (iso: string | null) =>
  !!iso && new Date(iso).getFullYear() <= 1970;

function fmt(value: number, unit: Unit): string {
  if (unit === "BOOL") return value !== 0 ? "Sim" : "Não";
  if (unit === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
  if (unit === "FRACTION") {
    return `${(value * 100).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })}%`;
  }
  if (unit === "PERCENT" || unit === "INT") {
    return `${value.toLocaleString("pt-BR")}%`;
  }
  return String(value);
}

function unitIcon(unit: Unit) {
  return unit === "BRL"
    ? DollarSign
    : unit === "INT"
      ? Hash
      : unit === "BOOL"
        ? ToggleRight
        : Percent;
}

export function AdminConfigScreen() {
  const { data, isLoading, isError, refetch } = useAdminConfigQuery();
  const params = data ?? [];
  const groups = [...new Set(params.map((param) => param.group))];

  return (
    <main className="min-h-screen bg-background px-1.5 pb-6 pt-3 font-sans text-foreground md:px-0 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-7xl xl:max-w-[1400px]">
        <DashboardBackgroundWatermark />
        <AdminConfigHeader />

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <AdminConfigSkeleton />
        ) : params.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group} className="space-y-4" aria-labelledby={`config-group-${group}`}>
                <h2
                  id={`config-group-${group}`}
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60"
                >
                  <Save className="h-3 w-3 text-primary" aria-hidden="true" />
                  {group}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
                  {params
                    .filter((param) => param.group === group)
                    .map((param) => (
                      <ParamCard key={param.key} param={param} />
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 border-t border-white/10 pt-10">
          <AdminTaxonomyPanel />
        </div>

        <div className="mt-12 border-t border-white/10 pt-10">
          <AdminInstallmentPanel />
        </div>
      </div>
    </main>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="glass-panel space-y-4 rounded-3xl p-10 text-center" role="alert">
      <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
      <p className="text-sm font-bold text-destructive">
        Não foi possível carregar as configurações do banco de dados.
      </p>
      <p className="text-xs text-muted-foreground">
        Verifique a conexão com o backend e tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-panel space-y-3 rounded-3xl p-12 text-center" role="status">
      <Save className="mx-auto h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
      <p className="text-sm font-bold text-foreground">Nenhuma configuração cadastrada.</p>
      <p className="mx-auto max-w-md text-xs text-muted-foreground">
        Quando os parâmetros do sistema forem criados, aparecerão aqui.
      </p>
    </div>
  );
}

function ParamCard({ param }: { param: AdminConfigParam }) {
  const [openHist, setOpenHist] = useState(false);
  const mutation = useUpdateConfigMutation();
  const Icon = unitIcon(param.unit);

  return (
    <article className="glass-panel space-y-4 rounded-3xl border border-white/5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-foreground">{param.label}</h3>
          {param.help && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{param.help}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-end justify-between rounded-2xl border border-white/5 bg-accent/20 px-4 py-3">
        <div>
          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            Vigente hoje
          </p>
          <p className="text-2xl font-black leading-none tracking-tighter text-foreground">
            {fmt(param.currentValue, param.unit)}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          {param.currentEffectiveFrom && !isEpoch(param.currentEffectiveFrom)
            ? `desde ${dataBr(param.currentEffectiveFrom)}`
            : "valor base"}
        </p>
      </div>

      {param.scheduled && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Clock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-[11px] text-amber-200/90">
            Agendado: <span className="font-black text-amber-100">{fmt(param.scheduled.value, param.unit)}</span>{" "}
            a partir de {dataBr(param.scheduled.effectiveFrom)}
          </p>
        </div>
      )}

      <AdminConfigForm
        fieldId={param.key}
        unit={param.unit}
        currentValue={param.currentValue}
        isPending={mutation.isPending}
        onSubmit={(value, effectiveFrom, note) =>
          mutation.mutate({ key: param.key, value, effectiveFrom, note })
        }
      />

      {param.history.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenHist(true)}
            aria-expanded={openHist}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Histórico ({param.history.length})
          </button>
        </div>
      )}

      <AdminConfigHistoryPanel
        open={openHist}
        onClose={() => setOpenHist(false)}
        title={param.label}
        history={param.history as ParamVersion[]}
        formatValue={(value) => fmt(value, param.unit)}
        formatDate={dataBr}
      />
    </article>
  );
}
