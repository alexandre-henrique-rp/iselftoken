import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Brain } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRevalidator, useRouteLoaderData } from "react-router";
import { toast } from "sonner";

import { CaptacaoProgressRail } from "~/components/founder/captacao-progress-rail";
import { startupInputClass } from "~/components/founder/new-startup-form-field";
import type { CaptacaoLayoutData } from "./edit-startup-captacao-layout";
import {
  CAMPAIGN_RESOLVE_ERROR_MESSAGE,
  governancaDefaults,
  governancaSchema,
  mapGovernancaToCampaignPayload,
  patchCampaign,
  resolveCampaignId,
  type GovernancaFormData,
} from "~/lib/captacao-shared";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";

export default function EditStartupCaptacaoGovernancaPage() {
  const data = useRouteLoaderData<CaptacaoLayoutData>(
    "routes/private/edit-startup-captacao-layout",
  );
  const campaign = data?.campaign;
  const revalidator = useRevalidator();
  const params = useParams();
  const { setDirtyCount, registerHandlers } = useEditStartupForm();

  const campaignId = campaign?.id;
  const defaultValues = useMemo(
    () => governancaDefaults(campaign ?? null),
    [campaign],
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { errors, dirtyFields },
  } = useForm<GovernancaFormData>({
    resolver: zodResolver(governancaSchema),
    defaultValues,
    mode: "onChange",
  });

  const watchedFields = watch();

  const numDirty = Object.keys(dirtyFields).length;
  useEffect(() => {
    setDirtyCount(numDirty);
  }, [numDirty, setDirtyCount]);

  useEffect(() => {
    const save = async (values: GovernancaFormData) => {
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
        await patchCampaign(id, mapGovernancaToCampaignPayload(values));
        toast.success("Governança e operação salvas com sucesso!");
        reset(values);
        revalidator.revalidate();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao salvar governança.",
        );
        throw err;
      }
    };
    const invalid = (fieldErrors: Record<string, { message?: string }>) => {
      const labels: Record<string, string> = {
        socios: "Quantidade de sócios/fundadores",
        dedicacao: "Tempo de dedicação dos fundadores",
        compradores: "Potenciais compradores",
        investimentoPrevio: "Investimento prévio",
        concorrencia: "Concorrência",
      };
      const invalidFields = Object.keys(fieldErrors).filter((name) => labels[name]);
      const firstInvalid = invalidFields[0];
      if (firstInvalid) setFocus(firstInvalid as keyof GovernancaFormData);

      toast.error("Não foi possível salvar Governança e operação.", {
        description: invalidFields.length
          ? invalidFields
              .map((name) => `${labels[name]}: ${fieldErrors[name]?.message ?? "campo inválido"}`)
              .join(" ")
          : "Revise os campos obrigatórios antes de salvar.",
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
    setFocus,
    defaultValues,
    campaignId,
    revalidator,
    params.id,
  ]);

  if (!campaign) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <form onSubmit={(e) => e.preventDefault()} className="min-w-0 space-y-6">
        <section className="space-y-6 rounded-2xl border border-border bg-card p-4 md:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground uppercase">
              Governança &amp; Operação
            </h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sócios */}
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground">
                  8. Quantidade de sócios/fundadores
                </label>
                <input
                  id="socios"
                  type="number"
                  {...register("socios", { valueAsNumber: true })}
                  className={`${startupInputClass} font-bold ${errors.socios ? "border-rose-500/50" : ""}`}
                />
                {errors.socios && (
                  <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.socios.message}
                  </p>
                )}
              </div>

              {/* Tempo dedicação */}
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground">
                  9. Tempo de dedicação dos fundadores
                </label>
                <input
                  id="dedicacao"
                  type="text"
                  {...register("dedicacao")}
                  maxLength={200}
                  placeholder="Ex: Tempo integral / 40h semanais"
                  className={`${startupInputClass} font-bold ${errors.dedicacao ? "border-rose-500/50" : ""}`}
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                  <span>
                    {200 - (watchedFields.dedicacao?.length || 0)} caracteres
                    restantes
                  </span>
                </div>
                {errors.dedicacao && (
                  <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.dedicacao.message}
                  </p>
                )}
              </div>
            </div>

            {/* Compradores */}
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-snug text-muted-foreground">
                10. Potenciais compradores da sua startup
              </label>
              <textarea
                id="compradores"
                {...register("compradores")}
                rows={2}
                maxLength={2000}
                placeholder="Quais corporações ou concorrentes maiores poderiam fazer M&A de saída..."
                className={`${startupInputClass} min-h-[60px] w-full resize-none ${errors.compradores ? "border-rose-500/50" : ""}`}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>
                  {2000 - (watchedFields.compradores?.length || 0)} caracteres
                  restantes
                </span>
              </div>
              {errors.compradores && (
                <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.compradores.message}
                </p>
              )}
            </div>

            {/* Investimento prévio */}
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-snug text-muted-foreground flex items-center gap-2">
                11. Já recebeu investimento? (DESCRIÇÃO)
                <span className="text-[9px] font-bold text-muted-foreground/60">
                  (Opcional)
                </span>
              </label>
              <textarea
                id="investimentoPrevio"
                {...register("investimentoPrevio")}
                rows={2}
                maxLength={2000}
                placeholder="Ex: Anjo de R$ 150k em 2024 ou Subvenção Finep. Deixe em branco se não houver."
                className={`${startupInputClass} min-h-[60px] w-full resize-none`}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>
                  {2000 - (watchedFields.investimentoPrevio?.length || 0)}{" "}
                  caracteres restantes
                </span>
              </div>
            </div>

            {/* Concorrência */}
            <div className="space-y-2">
              <label className="text-sm font-semibold leading-snug text-muted-foreground">
                12. Concorrência (DESCRIÇÃO)
              </label>
              <textarea
                id="concorrencia"
                {...register("concorrencia")}
                rows={2}
                maxLength={2000}
                placeholder="Descreva quem são os principais players do mercado e suas fraquezas..."
                className={`${startupInputClass} min-h-[60px] w-full resize-none ${errors.concorrencia ? "border-rose-500/50" : ""}`}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                <span>
                  {2000 - (watchedFields.concorrencia?.length || 0)} caracteres
                  restantes
                </span>
              </div>
              {errors.concorrencia && (
                <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.concorrencia.message}
                </p>
              )}
            </div>
          </div>
        </section>
      </form>

      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-[260px]">
        <CaptacaoProgressRail campaign={campaign} />
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary block">
              Governança e operação
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Informe a composição societária, a dedicação dos fundadores,
              potenciais compradores, investimentos prévios e o cenário
              competitivo.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
