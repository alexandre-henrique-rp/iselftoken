import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Handshake, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useParams, useRevalidator, useRouteLoaderData } from "react-router";
import { toast } from "sonner";

import { CaptacaoProgressRail } from "~/components/founder/captacao-progress-rail";
import { FastDeployDialog } from "~/components/founder/fast-deploy-dialog";
import { startupInputClass } from "~/components/founder/new-startup-form-field";
import { useRequestComplianceFee } from "~/hooks/use-founder-service-requests";
import { useFounderServices } from "~/hooks/use-founder-services";
import type { CaptacaoLayoutData } from "./edit-startup-captacao-layout";
import {
  CAMPAIGN_RESOLVE_ERROR_MESSAGE,
  mapRetornosToCampaignPayload,
  patchCampaign,
  resolveCampaignId,
  retornosDefaults,
  retornosSchema,
  type RetornosFormData,
} from "~/lib/captacao-shared";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import { cn } from "~/lib/utils";

export default function EditStartupCaptacaoRetornosPage() {
  const data = useRouteLoaderData<CaptacaoLayoutData>(
    "routes/private/edit-startup-captacao-layout",
  );
  const campaign = data?.campaign;
  const revalidator = useRevalidator();
  const params = useParams();
  const requestComplianceFee = useRequestComplianceFee();
  const { data: services } = useFounderServices();
  const {
    setDirtyCount,
    setActionBarConfig,
    registerHandlers,
  } = useEditStartupForm();

  // Gate do diálogo "Publicação Rápida": só é oferecido quando a Taxa de
  // Compliance ainda NÃO foi paga (campo exposto pelo loader da captação).
  const complianceFeePaid = Boolean(
    (campaign as { complianceFeePaid?: boolean } | null | undefined)
      ?.complianceFeePaid,
  );
  const fastDeployService = (services ?? []).find(
    (s) => s.slug === "fast-deploy",
  );
  const fastDeployPrice =
    typeof fastDeployService?.price === "number"
      ? fastDeployService.price
      : 1000;

  // Guarda o id da campanha resolvido para o diálogo finalizar o checkout.
  const [pendingCampaignId, setPendingCampaignId] = useState<
    number | null
  >(null);
  const [showFastDeployDialog, setShowFastDeployDialog] = useState(false);

  // Finaliza: dispara a cobrança (opcionalmente com FAST_DEPLOY) e redireciona.
  const finalizeCheckout = (id: number, wantsFastDeploy: boolean) => {
    setShowFastDeployDialog(false);
    void requestComplianceFee.mutateAsync({
      campaignId: id,
      wantsFastDeploy,
    });
  };

  const campaignId = campaign?.id;
  const defaultValues = useMemo(
    () => retornosDefaults(campaign ?? null),
    [campaign],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setFocus,
    formState: { errors, dirtyFields },
  } = useForm<RetornosFormData>({
    resolver: zodResolver(retornosSchema),
    defaultValues,
    mode: "onChange",
  });

  const watchedFields = watch();

  useEffect(() => {
    setActionBarConfig({
      saveLabel: "Finalizar",
      alwaysVisible: true,
      showDiscard: false,
    });
    return () => {
      setActionBarConfig({
        saveLabel: "Salvar alterações",
        alwaysVisible: false,
        showDiscard: true,
      });
    };
  }, [setActionBarConfig]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const numDirty = Object.keys(dirtyFields).length;
  useEffect(() => {
    setDirtyCount(numDirty);
  }, [numDirty, setDirtyCount]);

  useEffect(() => {
    const save = async (values: RetornosFormData) => {
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
      if (numDirty > 0) {
        try {
          await patchCampaign(id, mapRetornosToCampaignPayload(values));
          reset(values);
          revalidator.revalidate();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Falha ao salvar retornos.",
          );
          throw err;
        }
      }

      // O hook é idempotente: recupera a cobrança PENDING/PAID existente
      // e redireciona para o checkout após a finalização.
      //
      // Diálogo "Publicação Rápida" (FAST_DEPLOY): só é oferecido quando a
      // Taxa de Compliance ainda NÃO foi paga. Se já paga, finaliza direto.
      if (complianceFeePaid) {
        await requestComplianceFee.mutateAsync({
          campaignId: Number(id),
          wantsFastDeploy: false,
        });
      } else {
        setPendingCampaignId(Number(id));
        setShowFastDeployDialog(true);
      }
    };
    const invalid = (fieldErrors: Record<string, { message?: string }>) => {
      const labels: Record<string, string> = {
        ofereceLucros: "Participação nos lucros",
        lucrosDescricao: "Descrição da participação nos lucros",
        ofereceBeneficios: "Benefícios adicionais",
        beneficiosDescricao: "Descrição dos benefícios adicionais",
        aceitaAfiliados: "Programa de afiliados",
        affiliateCommissionPct: "Comissão do afiliado",
      };
      const invalidFields = Object.keys(fieldErrors).filter((name) => labels[name]);
      const firstInvalid = invalidFields[0];
      if (firstInvalid) setFocus(firstInvalid as keyof RetornosFormData);

      toast.error("Não foi possível salvar Benefícios e participação.", {
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
    numDirty,
    revalidator,
    params.id,
    requestComplianceFee.mutateAsync,
    complianceFeePaid,
  ]);

  if (!campaign) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <form onSubmit={(e) => e.preventDefault()} className="min-w-0 space-y-6">
        <section className="space-y-6 rounded-2xl border border-border bg-card p-4 md:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground uppercase">
              Benefícios e Participação de Lucro
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>
              ℹ️ <strong>Informação Importante:</strong> Por padrão de mercado,
              um investidor só tem ROI quando a startup realiza um EXIT (venda da
              startup), faz um IPO ou se consolida no mercado.
            </p>
            <p>
              Em qualquer dos casos anteriores, os tokens são convertidos em
              participação societária.
            </p>
          </div>

          <div className="space-y-6">
            {/* Lucros */}
            <div className="space-y-4">
              <Controller
                name="ofereceLucros"
                control={control}
                render={({ field }) => (
                  <label
                    id="ofereceLucros"
                    className="flex items-start gap-3 cursor-pointer group select-none"
                  >
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-1 h-4.5 w-4.5 rounded border-input text-primary focus:ring-0 bg-surface-container cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                        Desejo oferecer aos investidores participação nos lucros
                        (dividendos)
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Marque para declarar formalmente na oferta a distribuição
                        proporcional de lucros/dividendos aos detentores do token
                        de captação.
                      </p>
                    </div>
                  </label>
                )}
              />

              {watchedFields.ofereceLucros && (
                <div className="space-y-2 mt-4 animate-fade-in pl-7.5">
                  <label className="text-[10px] font-bold text-primary uppercase">
                    Descreva a política e termos de distribuição de
                    dividendos/participação nos lucros (máx. 2000 caracteres):
                  </label>
                  <textarea
                    id="lucrosDescricao"
                    {...register("lucrosDescricao")}
                    rows={4}
                    maxLength={2000}
                    placeholder="Estabeleça aqui a partir de que faturamento anual você começará a pagar a antecipação de lucros."
                    className={`${startupInputClass} min-h-[100px] w-full resize-none ${errors.lucrosDescricao ? "border-rose-500/50" : ""}`}
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                    <span>
                      {2000 - (watchedFields.lucrosDescricao?.length || 0)}{" "}
                      caracteres restantes
                    </span>
                  </div>
                  {errors.lucrosDescricao && (
                    <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.lucrosDescricao.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Benefícios adicionais */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <Controller
                name="ofereceBeneficios"
                control={control}
                render={({ field }) => (
                  <label
                    id="ofereceBeneficios"
                    className="flex items-start gap-3 cursor-pointer group select-none"
                  >
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-1 h-4.5 w-4.5 rounded border-input text-primary focus:ring-0 bg-surface-container cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                        Desejo oferecer benefícios adicionais atrelados à
                        aquisição de tokens
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Marque para disponibilizar vantagens exclusivas (ex:
                        descontos, acessos VIP) para investidores que atingirem
                        certa quantidade de tokens.
                      </p>
                    </div>
                  </label>
                )}
              />

              {watchedFields.ofereceBeneficios && (
                <div className="space-y-2 mt-4 animate-fade-in">
                  <label className="text-[10px] font-bold text-primary uppercase">
                    Descreva na caixa abaixo a quantidade de tokens e quais os
                    benefícios adicionais oferecidos:
                  </label>
                  <textarea
                    id="beneficiosDescricao"
                    {...register("beneficiosDescricao")}
                    rows={4}
                    maxLength={4000}
                    placeholder="Ex: Investidores com mais de 5.000 tokens ganham acesso VIP perpétuo à ferramenta e 1h de consultoria. Acima de 10.000 ganham convite para o conselho estratégico..."
                    className={`${startupInputClass} min-h-[100px] w-full resize-none ${errors.beneficiosDescricao ? "border-rose-500/50" : ""}`}
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                    <span>
                      {4000 - (watchedFields.beneficiosDescricao?.length || 0)}{" "}
                      caracteres restantes
                    </span>
                  </div>
                  {errors.beneficiosDescricao && (
                    <p className="text-rose-400 text-xs flex items-center gap-1 font-bold mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.beneficiosDescricao.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Programa de Afiliados */}
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Handshake className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Programa de Afiliados
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground/80">
                Ao aceitar afiliados, outros usuários poderão indicar
                investidores para sua captação e receberão comissão sobre cada
                investimento confirmado.
              </p>

              <Controller
                name="aceitaAfiliados"
                control={control}
                render={({ field }) => (
                  <label
                    id="aceitaAfiliados"
                    className="flex items-start gap-3 cursor-pointer group select-none"
                  >
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mt-0.5 accent-primary w-4 h-4 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                        Aceitar afiliados nesta captação
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Afiliados poderão se candidatar para divulgar sua rodada.
                        Você aprova cada solicitação.
                      </p>
                    </div>
                  </label>
                )}
              />

              {watchedFields.aceitaAfiliados && (
                <div className="space-y-3 mt-4 animate-fade-in pl-7.5">
                  <label className="text-[10px] font-bold text-primary uppercase">
                    Comissão do afiliado por investimento confirmado:
                  </label>
                  <Controller
                    name="affiliateCommissionPct"
                    control={control}
                    render={({ field }) => (
                      <div className="flex gap-3">
                        {[5, 10].map((pct) => (
                          <label
                            key={pct}
                            className={cn(
                              "flex-1 text-center py-3 rounded-xl border cursor-pointer transition-all text-sm font-semibold",
                              field.value === pct
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-muted/40 text-muted-foreground hover:border-border",
                            )}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              checked={field.value === pct}
                              onChange={() => field.onChange(pct)}
                            />
                            {pct}%
                          </label>
                        ))}
                      </div>
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    Valor pago ao afiliado sobre cada investimento atribuído à
                    indicação dele. Congelado após ativação da campanha.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </form>

      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-[260px]">
        <CaptacaoProgressRail campaign={campaign} />
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary block">
              Recomendação CVM
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              As declarações de participação nos lucros e benefícios integram o
              Material Informativo Essencial (MIE). Seja claro e verdadeiro para
              evitar sanções regulatórias.
            </p>
          </div>
        </div>
      </aside>

      {showFastDeployDialog && pendingCampaignId != null && (
        <FastDeployDialog
          price={fastDeployPrice}
          loading={requestComplianceFee.isPending}
          onDecline={() => finalizeCheckout(pendingCampaignId, false)}
          onAccept={() => finalizeCheckout(pendingCampaignId, true)}
        />
      )}
    </div>
  );
}
