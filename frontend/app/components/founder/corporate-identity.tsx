import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StartupCascataSelect } from "~/components/startup/startup-cascata-select";
import { formatCnpj, getAlphanumeric, isCnpjComplete } from "~/lib/cnpj-format";
import {
  ESTAGIO_OPTIONS,
  type AreaAtuacao,
  type EstagioStartup,
} from "~/lib/startup-enums";
import type { EditSectionProps } from "./_section-props";

interface CorporateIdentityForm {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  anoFundacao: string;
  estagio: EstagioStartup | "";
  areaAtuacao: AreaAtuacao | "";
  areaAtuacaoCustom: string;
  categoryId: number | null;
  areaAtuacaoIds: number[];
}

const defaults: CorporateIdentityForm = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  anoFundacao: "",
  estagio: "",
  areaAtuacao: "",
  areaAtuacaoCustom: "",
  categoryId: null,
  areaAtuacaoIds: [],
};

const SECTION_ID = "corporate-identity";
const TOTAL = 6;

export interface CnpjLookupResponse {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  anoFundacao?: number;
  situacaoCadastral?: string;
  ativa?: boolean;
  cidade?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cnaeDescricao?: string;
  porte?: string;
  cached?: boolean;
}

interface CorporateIdentityProps extends Partial<EditSectionProps> {
  /** Modo de uso do componente.
   * - "edit"   (padrão): usa formulário local com `useForm` (fluxo de edição).
   * - "create": usa o `form` passado via prop (wizard de criação sem provider).
   */
  mode?: "create" | "edit";
  /** Formulário RHF — obrigatório quando `mode="create"`. Ignorado em `mode="edit"`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any>;
  /** Dados reais da startup para popular o form no modo edit. */
  startup?: any;
  /** Callback chamado após CNPJ lookup bem-sucedido — permite ao parent preencher campos extras (endereço, etc). */
  onLookup?: (data: CnpjLookupResponse) => void;
}

export function CorporateIdentity({
  reportStatus,
  registerReset,
  registerGetValues,
  mode = "edit",
  form: formProp,
  startup,
  onLookup,
}: CorporateIdentityProps) {
  // useForm é sempre chamado (regras dos hooks) mas só é usado quando mode="edit".
  const localForm = useForm<CorporateIdentityForm>({
    defaultValues: defaults,
    mode: "onChange",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rhf: UseFormReturn<any> =
    mode === "create" && formProp
      ? formProp
      : (localForm as UseFormReturn<any>);
  const { register, watch, setValue, formState, reset, getValues } = rhf;

  // Popula com dados reais da startup quando disponíveis (modo edit)
  useEffect(() => {
    if (mode !== "edit" || !startup) return;
    const realData: Partial<CorporateIdentityForm> = {};
    if (startup.razao_social || startup.razaoSocial)
      realData.razaoSocial = startup.razao_social || startup.razaoSocial;
    if (startup.nome || startup.nomeFantasia)
      realData.nomeFantasia = startup.nome || startup.nomeFantasia;
    if (startup.cnpj) realData.cnpj = formatCnpj(startup.cnpj);
    if (startup.data_fundacao)
      realData.anoFundacao = String(
        new Date(startup.data_fundacao).getFullYear(),
      );
    if (startup.estagio) realData.estagio = startup.estagio as EstagioStartup;
    if (startup.area_atuacao || startup.areaAtuacao)
      realData.areaAtuacao = (startup.area_atuacao ||
        startup.areaAtuacao) as AreaAtuacao;
    if (startup.categoryId) realData.categoryId = startup.categoryId;
    const areaIds = Array.isArray(startup.areaAtuacaoIds)
      ? startup.areaAtuacaoIds
      : Array.isArray(startup.areas_atuacao)
        ? startup.areas_atuacao
        : startup.areaAtuacaoId
          ? [startup.areaAtuacaoId]
          : [];
    realData.areaAtuacaoIds = areaIds.filter((id: unknown): id is number => typeof id === "number");
    if (Object.keys(realData).length > 0) {
      reset({ ...defaults, ...realData });
    }
  }, [startup, mode, reset]);

  // STATE-02D — TanStack Mutation para consulta de CNPJ (substitui fetch inline).
  const cnpjLookupMutation = useMutation<CnpjLookupResponse, Error, string>({
    mutationFn: async (cnpjAlphanumeric) => {
      const res = await fetch(`/api/geral/cnpj/${cnpjAlphanumeric}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            body?.message ?? "CNPJ não encontrado na Receita Federal.",
          );
        }
        throw new Error(
          body?.message ??
            "Não foi possível buscar o CNPJ. Preencha manualmente.",
        );
      }
      return body as CnpjLookupResponse;
    },
    onSuccess: (data) => {
      if (data.ativa === false) {
        toast.error(
          `Empresa com situação cadastral "${data.situacaoCadastral ?? "desconhecida"}". Apenas empresas ATIVAS podem cadastrar startups.`,
        );
        return;
      }
      setValue("razaoSocial", data.razaoSocial, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("nomeFantasia", data.nomeFantasia, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (data.anoFundacao && data.anoFundacao >= 1900) {
        setValue("anoFundacao", String(data.anoFundacao), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      onLookup?.(data);

      const extras: string[] = [];
      if (data.cidade && data.uf) extras.push(`${data.cidade}/${data.uf}`);
      if (data.porte && data.porte !== "DEMAIS")
        extras.push(`Porte: ${data.porte}`);
      toast.success(
        extras.length > 0
          ? `Dados preenchidos. ${extras.join(" · ")}`
          : "Dados do CNPJ preenchidos com sucesso.",
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const values = watch();
  const dirty = Object.keys(formState.dirtyFields).length;

  // For `filled`, count fields with meaningful content.
  // "outros" requires areaAtuacaoCustom; otherwise the enum value suffices.
  const filled = (() => {
    let n = 0;
    if (values.razaoSocial) n++;
    if (values.nomeFantasia) n++;
    if (values.cnpj) n++;
    if (values.anoFundacao) n++;
    if (values.estagio) n++;
    if (values.areaAtuacao) {
      if (values.areaAtuacao === "outro") {
        if (values.areaAtuacaoCustom) n++;
      } else {
        n++;
      }
    }
    return n;
  })();

  useEffect(() => {
    reportStatus?.({ id: SECTION_ID, dirty, filled, total: TOTAL });
  }, [dirty, filled, reportStatus]);

  useEffect(() => {
    if (!registerReset) return;
    registerReset(SECTION_ID, () => reset(defaults));
  }, [registerReset, reset]);

  useEffect(() => {
    if (!registerGetValues) return;
    registerGetValues(SECTION_ID, () => ({
      values: getValues(),
      dirtyFields: rhf.formState.dirtyFields,
    }));
  }, [registerGetValues, getValues, rhf]);

  const handleCnpjLookup = () => {
    const chars = getAlphanumeric(values.cnpj);
    if (!isCnpjComplete(values.cnpj)) {
      toast.error("CNPJ deve ter 14 caracteres alfanuméricos para a busca.");
      return;
    }
    cnpjLookupMutation.mutate(chars);
  };

  const isLookingCnpjMutation = cnpjLookupMutation.isPending;

  const handleCnpjChange = (raw: string) => {
    const formatted = formatCnpj(raw);
    setValue("cnpj", formatted, { shouldDirty: true, shouldValidate: true });
  };

  const isEdit = mode === "edit";
  // Campos só travam se tiver campanha ativa (OPEN/FUNDED)
  const hasCampaignActive =
    startup?.campaignStatus === "open" || startup?.campaignStatus === "funded";
  const isCnpjLocked = isEdit && hasCampaignActive;
  const isRazaoSocialLocked = isEdit && hasCampaignActive;
  const isNomeFantasiaLocked = isEdit && hasCampaignActive;
  const isAnoFundacaoLocked = isEdit && hasCampaignActive;
  const isEstagioLocked = isEdit && hasCampaignActive;

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">
            Identidade Legal
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Dados oficiais que constam no CNPJ
          </p>
        </div>
        <span className="pill">
          {filled}/{TOTAL} campos
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* CNPJ — full width */}
        <div className="space-y-2 md:col-span-6">
          <label className="label-tag" htmlFor="cnpj">
            CNPJ
          </label>
          {isCnpjLocked ? (
            <input
              id="cnpj"
              disabled
              className="input-field opacity-60 cursor-not-allowed"
              value={values.cnpj}
              readOnly
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="cnpj"
                className="input-field"
                value={values.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              <button
                type="button"
                onClick={handleCnpjLookup}
                disabled={isLookingCnpjMutation || !isCnpjComplete(values.cnpj)}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLookingCnpjMutation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Buscar</span>
              </button>
            </div>
          )}
        </div>

        {/* Razão Social — 3 cols */}
        <div className="space-y-2 md:col-span-3">
          <label className="label-tag" htmlFor="razaoSocial">
            Razão Social
          </label>
          <input
            id="razaoSocial"
            disabled={isRazaoSocialLocked}
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            {...register("razaoSocial")}
          />
        </div>

        {/* Nome Fantasia — 3 cols */}
        <div className="space-y-2 md:col-span-3">
          <label className="label-tag" htmlFor="nomeFantasia">
            Nome Fantasia
          </label>
          <input
            id="nomeFantasia"
            disabled={isNomeFantasiaLocked}
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            {...register("nomeFantasia")}
          />
        </div>

        {/* Ano Fundação — 3 cols */}
        <div className="space-y-2 md:col-span-3">
          <label className="label-tag" htmlFor="anoFundacao">
            Ano de Fundação
          </label>
          <input
            id="anoFundacao"
            disabled={isAnoFundacaoLocked}
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            type="number"
            min="1900"
            max="2100"
            {...register("anoFundacao")}
          />
        </div>

        {/* Estágio — 3 cols */}
        <div className="space-y-2 md:col-span-3">
          <label className="label-tag" htmlFor="estagio">
            Estágio
          </label>
          <select
            id="estagio"
            disabled={isEstagioLocked}
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            {...register("estagio")}
          >
            <option value="" disabled>
              Selecione o estágio
            </option>
            {ESTAGIO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Startup (Cascata) — full width */}
        <div className="space-y-2 md:col-span-6">
          <label className="label-tag">Tipo de Startup</label>
          <StartupCascataSelect
            value={{
              categoryId: values.categoryId ?? null,
              areaAtuacaoIds: values.areaAtuacaoIds ?? [],
            }}
            onChange={(next) => {
              setValue("categoryId", next.categoryId ?? null, {
                shouldDirty: true,
              });
              setValue("areaAtuacaoIds", next.areaAtuacaoIds, {
                shouldDirty: true,
              });
            }}
          />
        </div>
      </div>
    </section>
  );
}
