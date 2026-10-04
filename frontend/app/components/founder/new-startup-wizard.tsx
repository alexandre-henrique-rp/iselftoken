import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useUploadMutation } from "~/hooks/use-upload";
import { formatCnpj, getAlphanumeric, isCnpjComplete } from "~/lib/cnpj-format";
import {
  formatCurrencyAmount,
  parseCurrencyInputToNumber,
} from "~/lib/currency-format";
import {
  createNewStartupSchema,
  newStartupDefaults,
  STEP_FIELDS,
  type NewStartupFormData,
} from "~/lib/new-startup-schema";
import {
  countriesQueryOptions,
  DEFAULT_FOUNDER_FUNDRAISING_CONFIG,
  founderFundraisingConfigQueryOptions,
  startupsQueryOptions,
  type Country,
} from "~/lib/queries";
import {
  deleteDraft,
  loadDraft,
  useAutoSaveDraft,
} from "~/lib/use-auto-save-draft";
import { NewStartupActionBar } from "./new-startup-action-bar";
import { NewStartupHeader } from "./new-startup-header";
import { NewStartupSidebar } from "./new-startup-sidebar";
import { NewStartupStep1Identity } from "./new-startup-step-1-identity";
import { NewStartupStep2Banking } from "./new-startup-step-2-banking";
import { NewStartupStep3Fundraising } from "./new-startup-step-3-fundraising";
import { NewStartupStepper } from "./new-startup-stepper";
import type { SubmitProgress } from "./new-startup-types";
import { computeRoundMetrics } from "./new-startup-wizard.metrics";

const TOTAL_STEPS = 3;

function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function showStartupSuccessToast(message: string) {
  toast(message, {
    className: "border-primary/30 bg-primary/10 text-foreground",
    icon: <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />,
  });
}

export function NewStartupWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: countries = [] } = useQuery<Country[]>(countriesQueryOptions);
  const { data: config = DEFAULT_FOUNDER_FUNDRAISING_CONFIG } = useQuery(
    founderFundraisingConfigQueryOptions,
  );
  const {
    tokenPrice,
    authFeePerToken,
    equityMin,
    equityMax,
    minCampaign,
    maxCampaign,
    fastTrackFee = 2500,
  } = config;
  const form = useForm<NewStartupFormData>({
    resolver: zodResolver(
      createNewStartupSchema({
        minCampaign,
        maxCampaign,
        equityMin,
        equityMax,
      }),
    ) as never,
    mode: "onChange",
    defaultValues: {
      ...newStartupDefaults,
      metaCaptacao: minCampaign,
      equityOferecido: equityMin,
    } as NewStartupFormData,
    shouldUnregister: false,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<SubmitProgress>(null);
  const [isLookingCnpj, setIsLookingCnpj] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [pitchDeckFileName, setPitchDeckFileName] = useState<string | null>(
    null,
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [pitchDeckUploading, setPitchDeckUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [pitchDeckUploadError, setPitchDeckUploadError] = useState<
    string | null
  >(null);
  const values = useWatch({ control: form.control });
  const valuesKey = JSON.stringify(values ?? {});
  const { saveOnStepChange } = useAutoSaveDraft(
    currentStep,
    form.getValues as () => Record<string, unknown>,
    !isSubmitting,
    valuesKey,
  );
  const uploadMutation = useUploadMutation();

  useEffect(() => {
    let cancelled = false;
    loadDraft().then((draft) => {
      if (cancelled || !draft?.data) return;
      Object.entries(draft.data).forEach(([key, value]) => {
        if (key !== "step" && value !== undefined && value !== null)
          form.setValue(key as keyof NewStartupFormData, value as never, {
            shouldDirty: false,
          });
      });
      if (draft.step && draft.step >= 1 && draft.step <= TOTAL_STEPS)
        setCurrentStep(draft.step);
      toast.info("Rascunho restaurado", {
        description: `Dados salvos automaticamente foram recuperados (etapa ${draft.step || 1}).`,
        duration: 4000,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [form]);

  const upload = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: "logo" | "pitchDeck",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isLogo = kind === "logo";
    // P3-LOGO-RESTRICT: logo agora so aceita JPG ou PNG (remove webp/gif).
    const allowed = isLogo ? ["image/jpeg", "image/png"] : ["application/pdf"];
    const maxSize = isLogo ? 5 * 1024 * 1024 : 15 * 1024 * 1024;
    const label = isLogo ? "logo" : "Pitch Deck";
    if (!allowed.includes(file.type)) {
      const message = isLogo
        ? "Use imagens JPG ou PNG."
        : "O Pitch Deck precisa ser um arquivo PDF.";
      isLogo ? setLogoUploadError(message) : setPitchDeckUploadError(message);
      toast.error(message);
      return;
    }
    if (file.size > maxSize) {
      const message = `${label} excede o tamanho máximo de ${isLogo ? "5MB" : "15MB"}.`;
      isLogo ? setLogoUploadError(message) : setPitchDeckUploadError(message);
      toast.error(message);
      return;
    }
    isLogo ? setLogoUploadError(null) : setPitchDeckUploadError(null);
    isLogo ? setLogoUploading(true) : setPitchDeckUploading(true);
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        filename: file.name,
        kind: isLogo ? "startup-logo" : "pitch-deck",
      });
      form.setValue(kind, result.id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (isLogo) setLogoPreviewUrl(result.url || URL.createObjectURL(file));
      else setPitchDeckFileName(file.name);
      showStartupSuccessToast(`${label} enviado com sucesso!`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Erro ao enviar ${label}.`;
      isLogo ? setLogoUploadError(message) : setPitchDeckUploadError(message);
      toast.error(message);
    } finally {
      isLogo ? setLogoUploading(false) : setPitchDeckUploading(false);
    }
  };

  const handleCnpjLookup = async () => {
    const cnpj = form.getValues("cnpj");
    if (!isCnpjComplete(cnpj)) {
      toast.error("CNPJ deve ter 14 caracteres alfanuméricos para a busca.");
      return;
    }
    setIsLookingCnpj(true);
    try {
      const response = await fetch(`/api/geral/cnpj/${getAlphanumeric(cnpj)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.error) {
        toast.error(
          data?.message ??
            "CNPJ não encontrado. Preencha os dados manualmente.",
        );
        return;
      }
      if (data.ativa === false) {
        toast.error("Apenas empresas ativas podem cadastrar startups.");
        return;
      }
      form.setValue("razaoSocial", data.razaoSocial, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("nomeFantasia", data.nomeFantasia, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (data.anoFundacao)
        form.setValue("dataAbertura", String(data.anoFundacao), {
          shouldDirty: true,
          shouldValidate: true,
        });
      showStartupSuccessToast("Dados do CNPJ importados com sucesso!");
    } catch {
      toast.error("Erro ao buscar CNPJ. Preencha os dados manualmente.");
    } finally {
      setIsLookingCnpj(false);
    }
  };

  const [metaCaptacaoFormatted, setMetaCaptacaoFormatted] = useState("");
  const [isMetaCaptacaoFocused, setIsMetaCaptacaoFocused] = useState(false);
  const metaCaptacaoInputRef = useRef<HTMLInputElement>(null);
  const [equityFormatted, setEquityFormatted] = useState("");

  useEffect(() => {
    // Enquanto o usuário digita, não reescrever o valor: isso preserva o
    // cursor e permite editar qualquer parte da quantia sem a máscara saltar.
    if (isMetaCaptacaoFocused) return;

    const current = Number(form.getValues("metaCaptacao"));
    const baseValue =
      Number.isFinite(current) && current > 0 ? current : minCampaign;
    const value = clampToRange(baseValue, minCampaign, maxCampaign);
    if (value !== current) {
      form.setValue("metaCaptacao", value, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    setMetaCaptacaoFormatted(formatCurrencyAmount(value));
  }, [
    form,
    isMetaCaptacaoFocused,
    maxCampaign,
    minCampaign,
    values.metaCaptacao,
  ]);
  useEffect(() => {
    const current = Number(form.getValues("equityOferecido"));
    const baseValue =
      Number.isFinite(current) && current > 0 ? current : equityMin;
    const value = clampToRange(baseValue, equityMin, equityMax);
    if (value !== current) {
      form.setValue("equityOferecido", value, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    setEquityFormatted(String(value).replace(".", ","));
  }, [equityMax, equityMin, form]);

  const handleMetaFocus = () => {
    setIsMetaCaptacaoFocused(true);
    const current = Number(form.getValues("metaCaptacao"));
    setMetaCaptacaoFormatted(
      Number.isFinite(current) ? String(current).replace(".", ",") : "",
    );
    requestAnimationFrame(() => metaCaptacaoInputRef.current?.select());
  };
  const handleMetaChange = (event: ChangeEvent<HTMLInputElement>) => {
    // A entrada fica livre durante a edição. A formatação só acontece no blur,
    // evitando que separadores alterem a posição do cursor a cada tecla.
    const raw = event.target.value.replace(/[^\d.,]/g, "");
    setMetaCaptacaoFormatted(raw);
    form.setValue("metaCaptacao", parseCurrencyInputToNumber(raw), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const handleMetaBlur = () => {
    const typedValue = parseCurrencyInputToNumber(metaCaptacaoFormatted);
    const value = clampToRange(
      typedValue || minCampaign,
      minCampaign,
      maxCampaign,
    );
    if (typedValue > 0 && typedValue < minCampaign) {
      toast.warning(
        `Valor mínimo para captação é de R$ ${minCampaign.toLocaleString("pt-BR")}.`,
      );
    }
    form.setValue("metaCaptacao", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setMetaCaptacaoFormatted(formatCurrencyAmount(value));
    setIsMetaCaptacaoFocused(false);
  };
  const handleEquityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formatted = event.target.value
      .replace(/[^0-9,]/g, "")
      .split(",")
      .slice(0, 2)
      .join(",");
    const value = Math.min(equityMax, Number(formatted.replace(",", ".") || 0));
    setEquityFormatted(String(value).replace(".", ","));
    form.setValue("equityOferecido", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const handleEquityBlur = () => {
    const value = Math.min(
      equityMax,
      Math.max(equityMin, Number(form.getValues("equityOferecido") || 0)),
    );
    form.setValue("equityOferecido", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setEquityFormatted(String(value).replace(".", ","));
  };

  const metaCaptacaoValue = Number(form.watch("metaCaptacao") || 0);
  const equityValue = Number(form.watch("equityOferecido") || equityMin);
  // Calculos derivados da rodada. Source of truth em new-startup-wizard.metrics.ts
  // (testado unitariamente). Mantemos em sync com founder-new-round.tsx.
  const {
    valuationPreMoney,
    tokensCount,
    tokenReservationFee,
    equityPerToken,
  } = computeRoundMetrics({
    targetAmount: metaCaptacaoValue,
    equityPercent: equityValue,
    tokenPrice,
    authFeePerToken,
  });
  const filledFieldsCount = Object.keys(newStartupDefaults).filter((key) => {
    const value = values[key as keyof NewStartupFormData];
    return typeof value === "string"
      ? value.trim().length > 0
      : typeof value === "number"
        ? value > 0
        : typeof value === "boolean"
          ? true
          : Boolean(value);
  }).length;
  const progressPercent = Math.round(
    (filledFieldsCount / Object.keys(newStartupDefaults).length) * 100,
  );

  const validateAndAdvance = useCallback(async () => {
    const fields = [
      ...STEP_FIELDS[currentStep as 1 | 2 | 3],
    ] as (keyof NewStartupFormData)[];
    if (!(await form.trigger(fields))) {
      const firstError = Object.values(form.formState.errors)[0];
      toast.error(
        String(
          firstError?.message ??
            "Preencha os campos obrigatórios da etapa atual.",
        ),
      );
      return;
    }
    setCompletedSteps((previous) => [...new Set([...previous, currentStep])]);
    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS));
    saveOnStepChange();
  }, [currentStep, form, saveOnStepChange]);
  const handlePrev = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 1));
    saveOnStepChange();
  }, [saveOnStepChange]);
  const handleSubmit = useCallback(async () => {
    if (!(await form.trigger())) {
      const firstError = Object.values(form.formState.errors)[0];
      toast.error(
        String(
          firstError?.message ??
            "Existem campos inválidos. Revise os passos anteriores.",
        ),
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitProgress("creating");
    try {
      const values = form.getValues();
      const payload: Record<string, unknown> = {
        ...values,
        cnpj: getAlphanumeric(values.cnpj),
      };
      if (values.logo && values.logo > 0) payload.logoFileId = values.logo;
      if (values.pitchDeck && values.pitchDeck > 0)
        payload.pitchDeckFileId = values.pitchDeck;
      delete payload.logo;
      delete payload.pitchDeck;
      if (!values.videoPitch?.trim()) delete payload.videoPitch;
      if (!values.website?.trim()) delete payload.website;
      if (!values.linkedin?.trim()) delete payload.linkedin;
      if (!values.instagram?.trim()) delete payload.instagram;
      if (!values.twitter?.trim()) delete payload.twitter;
      const response = await fetch("/api/payment/startup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payload,
          amount:
            tokenReservationFee +
            (values.wantsFastTrackReview ? fastTrackFee : 0),
          method: "PIX",
        }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        if (response.status === 409) {
          toast.error(
            Array.isArray(json.message)
              ? json.message.join("; ")
              : json.message ||
                  "Já existe um cadastro de startup ou pagamento pendente.",
          );
          setCurrentStep(1);
          return;
        }
        if (response.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(
          Array.isArray(json.message)
            ? json.message.join("; ")
            : json.message || json.error || "Falha ao criar rascunho",
        );
      }
      const paymentId = json.data?.paymentId;
      if (!paymentId)
        throw new Error("Checkout criado sem identificador de pagamento.");
      setSubmitProgress("checkout");
      await deleteDraft();
      await queryClient.invalidateQueries({
        queryKey: startupsQueryOptions.queryKey,
      });
      showStartupSuccessToast(
        "Cadastro salvo! Redirecionando para o pagamento...",
      );
      navigate(`/checkout/payment/${paymentId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  }, [fastTrackFee, form, navigate, queryClient, tokenReservationFee]);

  return (
    <div className="isolate -mx-6 min-h-screen overflow-x-clip bg-background pb-28 text-foreground lg:-mx-12">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:px-8 lg:max-w-[1400px] lg:pt-6">
        <NewStartupHeader />
        <NewStartupStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            if (completedSteps.includes(step) || step === currentStep)
              setCurrentStep(step);
          }}
        />
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
          <main className="min-w-0">
            {currentStep === 1 && (
              <NewStartupStep1Identity
                form={form}
                countries={countries}
                isLookingCnpj={isLookingCnpj}
                onCnpjChange={(value) =>
                  form.setValue("cnpj", formatCnpj(value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onCnpjLookup={handleCnpjLookup}
                onLogoUpload={(event) => upload(event, "logo")}
                onPitchDeckUpload={(event) => upload(event, "pitchDeck")}
                logoPreviewUrl={logoPreviewUrl}
                pitchDeckFileName={pitchDeckFileName}
                logoUploading={logoUploading}
                pitchDeckUploading={pitchDeckUploading}
                logoUploadError={logoUploadError}
                pitchDeckUploadError={pitchDeckUploadError}
              />
            )}
            {currentStep === 2 && <NewStartupStep2Banking form={form} />}
            {currentStep === 3 && (
              <NewStartupStep3Fundraising
                form={form}
                tokenPrice={tokenPrice}
                equityMin={equityMin}
                equityMax={equityMax}
                minCampaign={minCampaign}
                maxCampaign={maxCampaign}
                fastTrackReview={fastTrackFee}
                authFeePerToken={authFeePerToken}
                metaCaptacaoFormatted={metaCaptacaoFormatted}
                equityFormatted={equityFormatted}
                metaCaptacaoInputRef={metaCaptacaoInputRef}
                onMetaFocus={handleMetaFocus}
                onMetaChange={handleMetaChange}
                onMetaBlur={handleMetaBlur}
                onEquityChange={handleEquityChange}
                onEquityBlur={handleEquityBlur}
                valuationPreMoney={valuationPreMoney}
                tokensCount={tokensCount}
                tokenReservationFee={tokenReservationFee}
                equityPerToken={equityPerToken}
              />
            )}
          </main>
          <NewStartupSidebar
            currentStep={currentStep}
            progressPercent={progressPercent}
          />
        </div>
      </div>
      <NewStartupActionBar
        currentStep={currentStep}
        isSubmitting={isSubmitting}
        submitProgress={submitProgress}
        onBack={
          currentStep === 1 ? () => navigate("/founder/dashboard") : handlePrev
        }
        onNext={validateAndAdvance}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
