import { SelectPais } from "@/components/selectPais";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import type { ApiCnpj } from "~/types/api-cnpj";
import type { PaisType } from "~/types/paises";

type StartupStep = 1 | 2 | 3 | 4;

interface UploadResult {
  id: number;
  url: string;
}

interface StartupFormData {
  nome: string;
  razaoSocial: string;
  cnpj: string;
  paisIso3: string;
  areaAtuacao: string;
  estagio: string;
  descricao: string;
  metaCaptacao: string;
  equityOferecido: string;
  totalTokens: string;
  prazoCapitacao: string;
  videoPitch: string;
  redesSociais: {
    website: string;
    linkedin: string;
    instagram: string;
    twitter: string;
  };
  dadosBancarios: {
    banco: string;
    tipoConta: string;
    agencia: string;
    conta: string;
    digito: string;
    titular: string;
    documentoTitular: string;
    chavePix: string;
  };
}

const getOnlyDigits = (value: string): string => value.replace(/\D/g, "");

const formatCurrencyInput = (value: string): string => {
  const digits = getOnlyDigits(value).slice(0, 15);

  if (!digits) return "";

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyInputToNumber = (value: string): number => {
  if (!value) return 0;

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  return Number.isNaN(amount) ? 0 : amount;
};

const formatCnpj = (value: string): string => {
  const digits = getOnlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const INITIAL_FORM_DATA: StartupFormData = {
  nome: "",
  razaoSocial: "",
  cnpj: "",
  paisIso3: "BRA",
  areaAtuacao: "",
  estagio: "",
  descricao: "",
  metaCaptacao: "",
  equityOferecido: "",
  totalTokens: "",
  prazoCapitacao: "90",
  videoPitch: "",
  redesSociais: {
    website: "",
    linkedin: "",
    instagram: "",
    twitter: "",
  },
  dadosBancarios: {
    banco: "",
    tipoConta: "corrente",
    agencia: "",
    conta: "",
    digito: "",
    titular: "",
    documentoTitular: "",
    chavePix: "",
  },
};

/**
 * @name NewStartupPage
 * @description Renderiza fluxo wizard para criação de startup com upload e submissão final.
 */
export default function NewStartupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StartupStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPitchDeck, setIsUploadingPitchDeck] = useState(false);
  const [logoUpload, setLogoUpload] = useState<UploadResult | null>(null);
  const [pitchDeckUpload, setPitchDeckUpload] = useState<UploadResult | null>(
    null,
  );
  const [selectedPais, setSelectedPais] = useState<PaisType | undefined>(
    undefined,
  );
  const [customAreaAtuacao, setCustomAreaAtuacao] = useState("");
  const [formData, setFormData] = useState<StartupFormData>(INITIAL_FORM_DATA);
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [wantsFastTrackReview, setWantsFastTrackReview] = useState(false);
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);

  const targetAmount = useMemo(
    () => parseCurrencyInputToNumber(formData.metaCaptacao),
    [formData.metaCaptacao],
  );

  const tokenPrice = 200;

  const estimatedTokenCount = useMemo(() => {
    if (!targetAmount) return 0;
    return Math.ceil(targetAmount / tokenPrice);
  }, [targetAmount]);

  const adjustedTargetAmount = useMemo(
    () => estimatedTokenCount * tokenPrice,
    [estimatedTokenCount],
  );

  const valuation = useMemo(() => {
    const target = adjustedTargetAmount;
    const equity = Number(formData.equityOferecido);

    if (!target || !equity) return 0;
    return (target / equity) * 100;
  }, [adjustedTargetAmount, formData.equityOferecido]);

  const equityAmount = useMemo(() => {
    const equityPercent = Number(formData.equityOferecido);
    if (!adjustedTargetAmount || !equityPercent) return 0;
    return (adjustedTargetAmount * equityPercent) / 100;
  }, [adjustedTargetAmount, formData.equityOferecido]);

  const tokenReservationFee = useMemo(
    () => adjustedTargetAmount * 0.02,
    [adjustedTargetAmount],
  );

  const fastTrackFee = 500;

  const checkoutTotalAmount = useMemo(
    () => tokenReservationFee + (wantsFastTrackReview ? fastTrackFee : 0),
    [tokenReservationFee, wantsFastTrackReview],
  );

  const stepTitles = {
    1: "Informações básicas",
    2: "Captação e valuation",
    3: "Mídias e redes sociais",
    4: "Informações bancárias",
  } as const;

  const handleFieldChange = (field: keyof StartupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCnpjLookup = async (cnpjDigits: string) => {
    if (cnpjDigits.length !== 14) {
      toast.error("CNPJ inválido. Preencha os campos manualmente.");
      return;
    }

    setIsLoadingCnpj(true);

    try {
      const response = await fetch(`/api/geral/cnpj/${cnpjDigits}`);
      const data = (await response.json()) as ApiCnpj.Response;

      if (!response.ok || "type" in data) {
        toast.error("Erro ao buscar CNPJ. Preencha os campos manualmente.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || data.nome_fantasia || data.razao_social,
        razaoSocial: prev.razaoSocial || data.razao_social,
      }));
      toast.success("Dados do CNPJ preenchidos com sucesso.");
    } catch {
      toast.error("Erro ao buscar CNPJ. Preencha os campos manualmente.");
    } finally {
      setIsLoadingCnpj(false);
    }
  };

  const handleCnpjChange = (value: string) => {
    const formattedCnpj = formatCnpj(value);
    handleFieldChange("cnpj", formattedCnpj);
  };

  const handleCnpjSearch = () => {
    const normalizedCnpj = getOnlyDigits(formData.cnpj);
    void handleCnpjLookup(normalizedCnpj);
  };

  const handleMetaCaptacaoChange = (value: string) => {
    handleFieldChange("metaCaptacao", formatCurrencyInput(value));
  };

  const handleCampaignDeadlineChange = (value: string) => {
    handleFieldChange("prazoCapitacao", value);
  };

  const buildStartupPayload = () => ({
    nome: formData.nome,
    razaoSocial: formData.razaoSocial,
    cnpj: formData.cnpj.replace(/\D/g, ""),
    paisIso3: formData.paisIso3,
    areaAtuacao:
      formData.areaAtuacao === "outros"
        ? `(OUTRO) ${customAreaAtuacao.trim()}`
        : formData.areaAtuacao,
    estagio: formData.estagio,
    descricao: formData.descricao,
    metaCaptacao: adjustedTargetAmount,
    equityOferecido: Number(formData.equityOferecido),
    totalTokens: estimatedTokenCount,
    prazoCapitacao: Number(formData.prazoCapitacao),
    logo: logoUpload?.id,
    pitchDeck: pitchDeckUpload?.id,
    videoPitch: formData.videoPitch || undefined,
    redesSociais: formData.redesSociais,
    dadosBancarios: {
      ...formData.dadosBancarios,
      documentoTitular: formData.dadosBancarios.documentoTitular.replace(
        /\D/g,
        "",
      ),
    },
  });

  const createOrGetCampaignId = async (): Promise<number | null> => {
    if (campaignId) {
      return campaignId;
    }

    const startupPayload = buildStartupPayload();

    const startupResponse = await fetch("/api/startups/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(startupPayload),
    });

    const startupResult = await startupResponse.json();

    if (!startupResponse.ok || startupResult?.error) {
      toast.error(
        startupResult?.message ??
          startupResult?.error ??
          "Não foi possível preparar a campanha para checkout.",
      );
      return null;
    }

    const createdCampaignId = Number(
      startupResult?.data?.id ?? startupResult?.id ?? NaN,
    );

    if (!Number.isFinite(createdCampaignId) || createdCampaignId <= 0) {
      toast.error("Não foi possível identificar o ID da campanha criada.");
      return null;
    }

    setCampaignId(createdCampaignId);
    return createdCampaignId;
  };

  const handleAcquireNow = async () => {
    if (!targetAmount || !formData.equityOferecido) {
      toast.error("Preencha meta de captação e equity para continuar.");
      return;
    }

    const popupWindow = window.open(
      "",
      "startup-checkout",
      "width=860,height=720,menubar=no,toolbar=no,status=no",
    );

    if (!popupWindow) {
      toast.error(
        "Não foi possível abrir a janela de checkout. Libere pop-ups.",
      );
      return;
    }

    setIsPreparingCheckout(true);

    try {
      const resolvedCampaignId = await createOrGetCampaignId();

      if (!resolvedCampaignId) {
        popupWindow.close();
        return;
      }

      const response = await fetch("/api/payment/startup-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          campaignId: resolvedCampaignId,
          startupName: formData.nome || formData.razaoSocial,
          adjustedTargetAmount,
          estimatedTokenCount,
          tokenPrice,
          tokenReservationFee,
          fastTrackFee,
          wantsFastTrackReview,
          equityPercent: Number(formData.equityOferecido || 0),
          equityAmount,
          campaignDurationDays: Number(formData.prazoCapitacao || 90),
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload?.error || !payload?.token) {
        popupWindow.close();
        toast.error(payload?.message ?? "Não foi possível iniciar o checkout.");
        return;
      }

      popupWindow.location.href = `/payment/checkout/${encodeURIComponent(payload.token)}`;
    } catch {
      popupWindow.close();
      toast.error("Erro ao preparar checkout. Tente novamente.");
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  const handleSocialChange = (
    field: keyof StartupFormData["redesSociais"],
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      redesSociais: {
        ...prev.redesSociais,
        [field]: value,
      },
    }));
  };

  const handleBankChange = (
    field: keyof StartupFormData["dadosBancarios"],
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      dadosBancarios: {
        ...prev.dadosBancarios,
        [field]: value,
      },
    }));
  };

  const uploadDocument = async (
    file: File,
    tipo: "logo" | "pitchDeck",
  ): Promise<UploadResult | null> => {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("tipo", tipo);

    const response = await fetch("/api/document/upload", {
      method: "POST",
      body: payload,
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      toast.error(data?.error ?? "Erro ao enviar documento");
      return null;
    }

    return {
      id: Number(data?.data?.id ?? data?.id),
      url: String(data?.data?.url ?? data?.url ?? ""),
    };
  };

  const validateCurrentStep = (): boolean => {
    if (step === 1) {
      if (
        !formData.nome ||
        !formData.razaoSocial ||
        !formData.cnpj ||
        !formData.paisIso3 ||
        !formData.areaAtuacao ||
        (formData.areaAtuacao === "outros" && !customAreaAtuacao.trim()) ||
        !formData.estagio ||
        formData.descricao.length < 50
      ) {
        toast.error(
          "Preencha os campos obrigatórios da etapa 1 (descrição mínima 50).",
        );
        return false;
      }
    }

    if (step === 2) {
      if (
        !formData.metaCaptacao ||
        !formData.equityOferecido ||
        !formData.prazoCapitacao
      ) {
        toast.error("Preencha meta, equity e prazo da campanha.");
        return false;
      }
    }

    if (step === 3) {
      if (!logoUpload?.id) {
        toast.error("Upload de logo é obrigatório.");
        return false;
      }
    }

    if (step === 4) {
      const bank = formData.dadosBancarios;
      if (
        !bank.banco ||
        !bank.tipoConta ||
        !bank.agencia ||
        !bank.conta ||
        !bank.digito ||
        !bank.titular ||
        !bank.documentoTitular
      ) {
        toast.error("Preencha os dados bancários obrigatórios.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(4, prev + 1) as StartupStep);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    const payload = buildStartupPayload();
    const startupEndpoint = campaignId
      ? "/api/startups/update"
      : "/api/startups/post";
    const requestPayload = campaignId
      ? { ...payload, id: campaignId }
      : payload;

    try {
      const response = await fetch(startupEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();

      if (!response.ok || result?.error) {
        toast.error(
          result?.message ?? result?.error ?? "Não foi possível criar startup",
        );
        return;
      }

      toast.success("Startup criada com sucesso!");
      navigate("/startups/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-6 text-stone-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <Link
            className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200"
            to="/startups/dashboard"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para startups
          </Link>
          <h1 className="text-2xl font-bold">Nova Startup</h1>
          <p className="text-sm text-stone-400">
            Etapa {step}/4 - {stepTitles[step]}
          </p>
        </header>

        <Card className="border-stone-800 bg-stone-900">
          <CardHeader>
            <CardTitle className="text-stone-50">{stepTitles[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="CNPJ*">
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      className="bg-stone-800 border-stone-700"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCnpjSearch}
                      disabled={isLoadingCnpj}
                      className="shrink-0"
                    >
                      {isLoadingCnpj ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Buscar
                    </Button>
                  </div>
                  {isLoadingCnpj ? (
                    <p className="mt-1 text-xs text-stone-400">
                      Consultando CNPJ...
                    </p>
                  ) : null}
                </Field>
                <Field label="Nome da startup*">
                  <Input
                    value={formData.nome}
                    onChange={(e) => handleFieldChange("nome", e.target.value)}
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Razão social*">
                  <Input
                    value={formData.razaoSocial}
                    onChange={(e) =>
                      handleFieldChange("razaoSocial", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="País*">
                  <SelectPais
                    value={selectedPais}
                    onChange={(pais) => {
                      setSelectedPais(pais);
                      handleFieldChange("paisIso3", pais.iso3);
                    }}
                  />
                </Field>
                <Field label="Área de atuação*">
                  <div className="space-y-2">
                    <Select
                      value={formData.areaAtuacao}
                      onValueChange={(value) =>
                        handleFieldChange("areaAtuacao", value)
                      }
                    >
                      <SelectTrigger className="h-10 w-full border-stone-700 bg-stone-800 text-stone-100">
                        <SelectValue placeholder="Selecione a área de atuação" />
                      </SelectTrigger>
                      <SelectContent className="border-stone-700 bg-stone-800 text-stone-100">
                        <SelectItem value="tecnologia_saas">
                          Tecnologia / SaaS
                        </SelectItem>
                        <SelectItem value="fintech">Fintech</SelectItem>
                        <SelectItem value="healthtech">HealthTech</SelectItem>
                        <SelectItem value="edtech">EdTech</SelectItem>
                        <SelectItem value="agritech">AgriTech</SelectItem>
                        <SelectItem value="cleantech">CleanTech</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="logistica">Logística</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>

                    {formData.areaAtuacao === "outros" ? (
                      <Input
                        value={customAreaAtuacao}
                        onChange={(e) => setCustomAreaAtuacao(e.target.value)}
                        placeholder="Descreva a área de atuação"
                        className="bg-stone-800 border-stone-700"
                      />
                    ) : null}
                  </div>
                </Field>
                <Field label="Estágio*">
                  <Select
                    value={formData.estagio}
                    onValueChange={(value) =>
                      handleFieldChange("estagio", value)
                    }
                  >
                    <SelectTrigger className="h-10 w-full border-stone-700 bg-stone-800 text-stone-100">
                      <SelectValue placeholder="Selecione o estágio" />
                    </SelectTrigger>
                    <SelectContent className="w-(--radix-select-trigger-width) border-stone-700 bg-stone-800 text-stone-100">
                      <SelectItem value="ideacao">Ideação</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="tracao">Tração</SelectItem>
                      <SelectItem value="escala">Escala</SelectItem>
                      <SelectItem value="expansao">Expansão</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="md:col-span-2">
                  <Label className="mb-2 block text-stone-300">
                    Descrição*
                  </Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) =>
                      handleFieldChange("descricao", e.target.value)
                    }
                    className="min-h-32 bg-stone-800 border-stone-700"
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Mínimo 50 caracteres ({formData.descricao.length})
                  </p>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Meta captação*">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.metaCaptacao}
                    onChange={(e) => handleMetaCaptacaoChange(e.target.value)}
                    placeholder="0,00"
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>

                <Field label="Equity oferecido (%)*">
                  <Input
                    type="number"
                    value={formData.equityOferecido}
                    onChange={(e) =>
                      handleFieldChange("equityOferecido", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>

                <Field label="Prazo captação (dias)">
                  <Select
                    value={formData.prazoCapitacao}
                    onValueChange={handleCampaignDeadlineChange}
                  >
                    <SelectTrigger className="h-10 w-full border-stone-700 bg-stone-800 text-stone-100">
                      <SelectValue placeholder="Selecione o prazo" />
                    </SelectTrigger>
                    <SelectContent className="border-stone-700 bg-stone-800 text-stone-100">
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="120">120 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="md:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
                  <div className="rounded-xl border border-blue-700/40 bg-linear-to-br from-blue-950/40 to-stone-900 p-5 text-sm text-blue-100">
                    <p className="text-base font-semibold text-blue-50">
                      Resumo da oferta
                    </p>

                    <div className="mt-4 space-y-2">
                      <p>
                        Valuation estimado:{" "}
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(valuation)}
                        </strong>
                      </p>
                      <p>
                        Meta solicitada:{" "}
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(targetAmount)}
                        </strong>
                      </p>
                      <p>
                        Meta ajustada:{" "}
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(adjustedTargetAmount)}
                        </strong>
                      </p>
                      <p>
                        Equity ofertado:{" "}
                        <strong>
                          {Number(formData.equityOferecido || 0).toFixed(2)}%
                        </strong>{" "}
                        (
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(equityAmount)}
                        )
                      </p>
                      <p>
                        Tokens gerados:{" "}
                        <strong>
                          {estimatedTokenCount.toLocaleString("pt-BR")}
                        </strong>
                      </p>
                      <p>
                        Preço por token:{" "}
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(tokenPrice)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-700 bg-stone-950 p-5 text-sm text-stone-200">
                    <p className="text-base font-semibold text-stone-50">
                      Checkout da campanha
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Reserva de tokens (2%)</span>
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(tokenReservationFee)}
                        </strong>
                      </div>

                      <div className="rounded-md border border-amber-700/40 bg-amber-900/20 p-3 text-amber-100">
                        <p className="font-medium">Acesso antecipado</p>
                        <p className="mt-1 text-xs">
                          Análise padrão em até 30 dias. Com{" "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(fastTrackFee)}
                          , reduz para até 24h (cadastro 100% concluído).
                        </p>
                        <label className="mt-2 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={wantsFastTrackReview}
                            onChange={(event) =>
                              setWantsFastTrackReview(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-stone-600 bg-stone-800"
                          />
                          Adicionar avaliação acelerada
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Acesso antecipado</span>
                        <strong>
                          {wantsFastTrackReview
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(fastTrackFee)
                            : "R$ 0,00"}
                        </strong>
                      </div>

                      <div className="border-t border-stone-700 pt-3">
                        <div className="flex items-center justify-between text-base">
                          <span className="font-semibold text-stone-50">
                            Total
                          </span>
                          <strong className="text-green-400">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(checkoutTotalAmount)}
                          </strong>
                        </div>

                        <p className="mt-2 text-xs text-stone-400">
                          Mesmo com a campanha aprovada, o início só ocorre após
                          o pagamento da reserva de tokens.
                        </p>

                        <Button
                          type="button"
                          onClick={handleAcquireNow}
                          disabled={isPreparingCheckout}
                          className="mt-3 w-full bg-green-600 hover:bg-green-500"
                        >
                          {isPreparingCheckout ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Preparando checkout...
                            </>
                          ) : (
                            "Adquirir agora"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FileField
                  label="Logo*"
                  loading={isUploadingLogo}
                  onChange={async (file) => {
                    if (!file) return;
                    setIsUploadingLogo(true);
                    const upload = await uploadDocument(file, "logo");
                    if (upload) {
                      setLogoUpload(upload);
                      toast.success("Logo enviada");
                    }
                    setIsUploadingLogo(false);
                  }}
                  successLabel={logoUpload ? `ID ${logoUpload.id}` : undefined}
                />
                <FileField
                  label="Pitch Deck"
                  loading={isUploadingPitchDeck}
                  onChange={async (file) => {
                    if (!file) return;
                    setIsUploadingPitchDeck(true);
                    const upload = await uploadDocument(file, "pitchDeck");
                    if (upload) {
                      setPitchDeckUpload(upload);
                      toast.success("Pitch deck enviado");
                    }
                    setIsUploadingPitchDeck(false);
                  }}
                  successLabel={
                    pitchDeckUpload ? `ID ${pitchDeckUpload.id}` : undefined
                  }
                />
                <Field label="Vídeo pitch">
                  <Input
                    value={formData.videoPitch}
                    onChange={(e) =>
                      handleFieldChange("videoPitch", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={formData.redesSociais.website}
                    onChange={(e) =>
                      handleSocialChange("website", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Linkedin">
                  <Input
                    value={formData.redesSociais.linkedin}
                    onChange={(e) =>
                      handleSocialChange("linkedin", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Instagram">
                  <Input
                    value={formData.redesSociais.instagram}
                    onChange={(e) =>
                      handleSocialChange("instagram", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Twitter/X">
                  <Input
                    value={formData.redesSociais.twitter}
                    onChange={(e) =>
                      handleSocialChange("twitter", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Banco*">
                  <Input
                    value={formData.dadosBancarios.banco}
                    onChange={(e) => handleBankChange("banco", e.target.value)}
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Tipo conta*">
                  <Input
                    value={formData.dadosBancarios.tipoConta}
                    onChange={(e) =>
                      handleBankChange("tipoConta", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Agência*">
                  <Input
                    value={formData.dadosBancarios.agencia}
                    onChange={(e) =>
                      handleBankChange("agencia", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Conta*">
                  <Input
                    value={formData.dadosBancarios.conta}
                    onChange={(e) => handleBankChange("conta", e.target.value)}
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Dígito*">
                  <Input
                    value={formData.dadosBancarios.digito}
                    onChange={(e) => handleBankChange("digito", e.target.value)}
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Titular*">
                  <Input
                    value={formData.dadosBancarios.titular}
                    onChange={(e) =>
                      handleBankChange("titular", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Documento titular*">
                  <Input
                    value={formData.dadosBancarios.documentoTitular}
                    onChange={(e) =>
                      handleBankChange("documentoTitular", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
                <Field label="Chave PIX">
                  <Input
                    value={formData.dadosBancarios.chavePix}
                    onChange={(e) =>
                      handleBankChange("chavePix", e.target.value)
                    }
                    className="bg-stone-800 border-stone-700"
                  />
                </Field>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-stone-800 pt-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setStep((prev) => Math.max(1, prev - 1) as StartupStep)
                  }
                  className="border-stone-700 bg-stone-800 hover:bg-stone-700"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  Próximo <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-500"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}{" "}
                  Salvar e Criar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <Label className="mb-2 block text-stone-300">{label}</Label>
      {children}
    </div>
  );
}

interface FileFieldProps {
  label: string;
  loading: boolean;
  successLabel?: string;
  onChange: (file: File | null) => Promise<void>;
}

function FileField({ label, loading, successLabel, onChange }: FileFieldProps) {
  return (
    <div>
      <Label className="mb-2 block text-stone-300">{label}</Label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-200 hover:bg-stone-700">
        <Upload className="h-4 w-4" />
        <span>{loading ? "Enviando..." : "Selecionar arquivo"}</span>
        <input
          type="file"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
      {successLabel ? (
        <p className="mt-1 text-xs text-green-400">
          Upload concluído ({successLabel})
        </p>
      ) : null}
    </div>
  );
}
