import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Target } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRevalidator, useRouteLoaderData } from "react-router";
import { toast } from "sonner";

import { CaptacaoProgressRail } from "~/components/founder/captacao-progress-rail";
import { startupInputClass } from "~/components/founder/new-startup-form-field";
import type { CaptacaoLayoutData } from "./edit-startup-captacao-layout";
import {
  CAMPAIGN_RESOLVE_ERROR_MESSAGE,
  mapTeseToCampaignPayload,
  patchCampaign,
  resolveCampaignId,
  teseDefaults,
  teseSchema,
  type TeseFormData,
} from "~/lib/captacao-shared";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";

const FIELDS: Array<{
  name: keyof TeseFormData;
  step: number;
  label: string;
  placeholder: string;
}> = [
  {
    name: "problema",
    step: 3,
    label: "Problema que resolve",
    placeholder: "Descreva a dor do mercado que sua startup resolve...",
  },
  {
    name: "solucao",
    step: 4,
    label: "Solução proposta",
    placeholder: "Como sua startup resolve essa dor de forma eficaz...",
  },
  {
    name: "diferencial",
    step: 5,
    label: "Diferencial competitivo",
    placeholder:
      "O que diferencia você das alternativas existentes e seus concorrentes...",
  },
  {
    name: "modeloReceita",
    step: 6,
    label: "Modelo de receita",
    placeholder:
      "SaaS, Transacional, Marketplace, etc. Como a empresa gera faturamento...",
  },
  {
    name: "mercadoAlvo",
    step: 7,
    label: "Mercado-alvo",
    placeholder:
      "Tamanho do mercado (TAM, SAM, SOM) e perfil do cliente ideal...",
  },
];

export default function EditStartupCaptacaoTesePage() {
  const data = useRouteLoaderData<CaptacaoLayoutData>(
    "routes/private/edit-startup-captacao-layout",
  );
  const campaign = data?.campaign;
  const revalidator = useRevalidator();
  const params = useParams();
  const { setDirtyCount, registerHandlers } = useEditStartupForm();

  const campaignId = campaign?.id;
  const defaultValues = useMemo(
    () => teseDefaults(campaign ?? null),
    [campaign],
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { errors, dirtyFields },
  } = useForm<TeseFormData>({
    resolver: zodResolver(teseSchema),
    defaultValues,
    mode: "onChange",
  });

  const watchedFields = watch();

  const numDirty = Object.keys(dirtyFields).length;
  useEffect(() => {
    setDirtyCount(numDirty);
  }, [numDirty, setDirtyCount]);

  useEffect(() => {
    const save = async (values: TeseFormData) => {
      // S18.6 — fallback: se `campaignId` estiver ausente no loader pai
      // (cache stale, navegação entre startups, etc.), refaz o fetch via
      // BFF antes de abortar. Corrige o erro intermitente "Não foi
      // possível identificar a campanha." quando o fundador cria uma
      // nova startup e o layout mantém dados da anterior.
      let id: string | number | null | undefined = campaignId;
      if (!id && params.id) {
        id = await resolveCampaignId(params.id);
      }
      if (!id) {
        toast.error(CAMPAIGN_RESOLVE_ERROR_MESSAGE);
        return;
      }
      try {
        await patchCampaign(id, mapTeseToCampaignPayload(values));
        toast.success("Tese de negócios salva com sucesso!");
        reset(values);
        revalidator.revalidate();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao salvar a tese.",
        );
        throw err;
      }
    };
    const invalid = (fieldErrors: Record<string, { message?: string }>) => {
      const invalidFields = FIELDS.filter((field) => fieldErrors[field.name]);
      const firstInvalid = invalidFields[0];
      if (firstInvalid) {
        setFocus(firstInvalid.name);
      }

      const labels = invalidFields.map((field) => field.label);
      toast.error("Não foi possível salvar a Tese de negócios.", {
        description: labels.length
          ? `${labels.join(", ")}. Cada campo deve ter pelo menos 10 caracteres.`
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
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground uppercase">
              Tese de Negócios &amp; Mercado
            </h2>
          </div>

          <div className="space-y-6">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground">
                  {f.step}. {f.label}
                </label>
                <textarea
                  id={f.name}
                  {...register(f.name)}
                  rows={3}
                  maxLength={2000}
                  placeholder={f.placeholder}
                  className={`${startupInputClass} min-h-[80px] w-full resize-none ${errors[f.name] ? "border-rose-500/50" : ""}`}
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                  <span>
                    {2000 - ((watchedFields[f.name] as string)?.length || 0)}{" "}
                    caracteres restantes
                  </span>
                </div>
                {errors[f.name] && (
                  <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors[f.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </form>

      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-[260px]">
        <CaptacaoProgressRail campaign={campaign} />
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary block">
              Tese de negócios
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Descreva com clareza problema, solução, diferencial, modelo de
              receita e mercado-alvo. Estas informações compõem o MIE exigido
              pela CVM.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
