import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Coins, HelpCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRevalidator, useRouteLoaderData } from "react-router";
import { toast } from "sonner";

import { CaptacaoProgressRail } from "~/components/founder/captacao-progress-rail";
import { startupInputClass } from "~/components/founder/new-startup-form-field";
import type { CaptacaoLayoutData } from "./edit-startup-captacao-layout";
import {
  CAMPAIGN_RESOLVE_ERROR_MESSAGE,
  RECURSO_FIELDS,
  RecursoField,
  mapRecursosToCampaignPayload,
  mapRecursosToResourceAllocations,
  patchCampaign,
  putResources,
  recursosDefaults,
  recursosSchema,
  resolveCampaignId,
  type RecursosFormData,
} from "~/lib/captacao-shared";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";

export default function EditStartupCaptacaoRecursosPage() {
  const data = useRouteLoaderData<CaptacaoLayoutData>(
    "routes/private/edit-startup-captacao-layout",
  );
  const campaign = data?.campaign;
  const revalidator = useRevalidator();
  const params = useParams();
  const { setDirtyCount, registerHandlers } = useEditStartupForm();

  const campaignId = campaign?.id;
  const defaultValues = useMemo(
    () => recursosDefaults(campaign ?? null),
    [campaign],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    clearErrors,
    formState: { errors, dirtyFields },
  } = useForm<RecursosFormData>({
    resolver: zodResolver(recursosSchema),
    defaultValues,
    mode: "onChange",
  });

  // `defaultValues` só é aplicado na primeira montagem do RHF. Quando o
  // layout é revalidado após o save, sincronizamos a campanha persistida para
  // que voltar à aba não restaure valores antigos do formulário.
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchedFields = watch();
  const totalRecursos =
    (Number(watchedFields.recursosFundador) || 0) +
    (Number(watchedFields.recursosDesenvolvimento) || 0) +
    (Number(watchedFields.recursosComercial) || 0) +
    (Number(watchedFields.recursosMarketing) || 0) +
    (Number(watchedFields.recursosNuvem) || 0) +
    (Number(watchedFields.recursosJuridico) || 0) +
    (Number(watchedFields.recursosCaixa) || 0);
  const totalIsValid = Math.abs(totalRecursos - 100) < 0.01;

  useEffect(() => {
    if (totalIsValid && errors.recursosFundador) {
      clearErrors("recursosFundador");
    }
  }, [totalIsValid, errors.recursosFundador, clearErrors]);

  const numDirty = Object.keys(dirtyFields).length;
  useEffect(() => {
    setDirtyCount(numDirty);
  }, [numDirty, setDirtyCount]);

  useEffect(() => {
    const save = async (values: RecursosFormData) => {
      // S18.6 — fallback: refaz o fetch via BFF se o campaignId do
      // loader pai estiver ausente (cache stale / navegação entre startups).
      let id: string | number | null | undefined = campaignId;
      if (!id && params.id) {
        id = await resolveCampaignId(params.id);
      }
      if (!id) {
        toast.error(CAMPAIGN_RESOLVE_ERROR_MESSAGE);
        return;
      }
      try {
        await Promise.all([
          patchCampaign(id, mapRecursosToCampaignPayload(values)),
          putResources(id, mapRecursosToResourceAllocations(values)),
        ]);
        toast.success("Destinação de recursos salva com sucesso!");
        reset(values);
        revalidator.revalidate();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao salvar recursos.",
        );
        throw err;
      }
    };

    const invalid = () => {
      toast.error("Corrija os erros antes de salvar.", {
        description:
          !totalIsValid
            ? `A soma das alocações deve ser exatamente 100% (atual: ${totalRecursos.toFixed(0)}%).`
            : undefined,
      });
    };

    registerHandlers({
      onSave: handleSubmit(save, invalid),
      onDiscard: () => {
        reset(defaultValues);
        toast.info("Alterações descartadas.");
      },
    });
  }, [
    registerHandlers,
    handleSubmit,
    reset,
    defaultValues,
    campaignId,
    revalidator,
    totalIsValid,
    totalRecursos,
    params.id,
  ]);

  if (!campaign) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <form onSubmit={(e) => e.preventDefault()} className="min-w-0 space-y-6">
        <section className="relative space-y-6 overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5 lg:p-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Coins className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground uppercase">
              Destinação de Recursos &amp; Metas
            </h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-snug text-muted-foreground flex items-center gap-2">
                1. O QUE A STARTUP ESPERA ALCANÇAR APÓS O INVESTIMENTO?
                <span title="Defina metas claras como novos clientes, faturamento ou expansão geográfica">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                </span>
              </label>
              <textarea
                id="esperaAlcancar"
                {...register("esperaAlcancar")}
                rows={4}
                maxLength={2000}
                placeholder="Ex: Expandir a operação comercial para mais 3 estados, triplicar o volume de transações na plataforma e contratar engenheiros para finalizar a versão 2.0 do core financeiro..."
                className={`${startupInputClass} min-h-[100px] w-full resize-none ${errors.esperaAlcancar ? "border-rose-500/50" : ""}`}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>
                  {2000 - (watchedFields.esperaAlcancar?.length || 0)} caracteres
                  restantes
                </span>
              </div>
              {errors.esperaAlcancar && (
                <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.esperaAlcancar.message}
                </p>
              )}
            </div>

            {/* Recursos Distribuição — Sprint S34-j (refator visual)
                Layout 2 colunas em md+ (antes era 3 colunas em lg).
                Cada campo com label + input number + "%" à direita.
                Soma total no rodapé (vermelho quando != 100).
                Inputs CLAMPAM para nao passar 100% (ver maxBySum). */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <label className="text-sm font-semibold leading-snug text-muted-foreground flex items-center gap-2">
                2. COMO OS RECURSOS SERÃO USADOS? (%)
                <span title="Distribua o valor captado entre as categorias listadas. A soma total deve ser exatamente 100%.">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                </span>
              </label>

              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
                data-locked={totalIsValid}
              >
                {RECURSO_FIELDS.map((f) => (
                  <RecursoField
                    key={f.name}
                    name={f.name}
                    label={f.label}
                    control={control}
                    watchedFields={watchedFields}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/60 mt-4">
                <span className="text-sm font-semibold leading-snug text-muted-foreground">
                  Soma total
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`text-lg font-semibold italic ${totalIsValid ? "text-primary" : "text-rose-400"}`}
                    data-testid="captacao-recursos-total"
                  >
                    {totalRecursos.toFixed(0)}%
                  </span>
                  {totalIsValid ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />
                  )}
                </div>
              </div>
              {!totalIsValid && (
                <p
                  className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1"
                  data-testid="captacao-recursos-warning"
                >
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  A soma das alocações deve ser exatamente 100% (atual:{" "}
                  {totalRecursos.toFixed(0)}%)
                </p>
              )}
            </div>
          </div>
        </section>
      </form>

      {/* Aside: composição dos recursos */}
      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-[260px]">
        <CaptacaoProgressRail campaign={campaign} />
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary">
              Composição dos Recursos
            </span>
            <span
              className={`text-xs font-mono font-bold ${totalIsValid ? "text-primary" : "text-rose-400"}`}
            >
              Total: {totalRecursos}%
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: "Fundador",
                pct: Number(watchedFields.recursosFundador) || 0,
                color: "bg-primary",
              },
              {
                name: "Desenvolvimento",
                pct: Number(watchedFields.recursosDesenvolvimento) || 0,
                color: "bg-primary/80",
              },
              {
                name: "Comercial",
                pct: Number(watchedFields.recursosComercial) || 0,
                color: "bg-primary/70",
              },
              {
                name: "Marketing",
                pct: Number(watchedFields.recursosMarketing) || 0,
                color: "bg-primary/60",
              },
              {
                name: "Nuvem",
                pct: Number(watchedFields.recursosNuvem) || 0,
                color: "bg-muted-foreground",
              },
              {
                name: "Jurídico",
                pct: Number(watchedFields.recursosJuridico) || 0,
                color: "bg-muted-foreground/80",
              },
              {
                name: "Reserva Caixa",
                pct: Number(watchedFields.recursosCaixa) || 0,
                color: "bg-muted-foreground/60",
              },
            ].map((rec) => {
              if (rec.pct === 0) return null;
              return (
                <div key={rec.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                    <span>{rec.name}</span>
                    <span>{rec.pct}%</span>
                  </div>
                  <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${rec.color}`}
                      style={{ width: `${rec.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {totalRecursos === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                Nenhum recurso alocado ainda.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
