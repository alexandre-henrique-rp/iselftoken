import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { startupInputClass } from "~/components/founder/new-startup-form-field";

/**
 * S18.6 — Fallback de campaignId para os handlers de save das abas de
 * captação (recursos/tese/governança/retornos).
 *
 * O `campaignId` vem do `useRouteLoaderData` do layout pai. Quando a
 * navegação cacheia dados stale (ex.: founder cria nova startup e o layout
 * mantém dados da anterior) ou o backend retorna `{ campaign: null }`
 * temporariamente, o handler de save aborta com "Não foi possível
 * identificar a campanha." — erro intermitente.
 *
 * Esta helper refaz o fetch via BFF para garantir o `campaignId` correto
 * antes de chamar o PATCH. É chamada apenas quando o `campaignId` do
 * closure é undefined, então não adiciona round-trip no caminho feliz.
 *
 * @param startupId - ID da startup (do useParams da URL)
 * @returns campaignId válido ou null (se realmente não existir)
 */
export async function resolveCampaignId(
  startupId: string | number,
): Promise<number | string | null> {
  try {
    const res = await fetch(
      `/api/founder/startups/${encodeURIComponent(String(startupId))}/captacao`,
      { credentials: "include" },
    );
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.campaign?.id ?? null;
  } catch {
    return null;
  }
}

/** Mensagem amigável exibida quando o campaignId não pôde ser resolvido. */
export const CAMPAIGN_RESOLVE_ERROR_MESSAGE =
  "Não foi possível identificar a campanha. Recarregue a página e tente novamente.";

// ==========================================
// SCHEMA DE VALIDAÇÃO ZOD (completo — reusado por sub-schemas via .pick())
// ==========================================
// O schema completo mantém as regras cruzadas (superRefine) da soma de
// recursos e das descrições condicionais. Cada subrota deriva um sub-schema
// com apenas os campos daquela aba (ver *_SCHEMA abaixo), preservando as
// regras cruzadas relevantes.

export const RESERVA_MIN = 0;

/**
 * Limite máximo de alocação para a categoria `FUNDADOR` (CASE.md [Captação]
 * — Alocação de Recursos). Replicado no backend em
 * `backendnode/src/api/campaigns/service/campaign-resource.service.ts:MAX_FUNDADOR_PERCENTUAL`.
 * Mudou aqui → mudar lá (e vice-versa).
 */
export const MAX_FUNDADOR_PERCENTUAL = 20;

// ----- Sub-schema: RECURSOS (esperaAlcancar + 7 alocações) -----
export const recursosSchema = z
  .object({
    esperaAlcancar: z
      .string()
      .min(
        10,
        "Escreva pelo menos 10 caracteres sobre as metas pós-investimento",
      )
      .max(2000, "As metas devem ter no máximo 2000 caracteres"),
    recursosFundador: z
      .number()
      .min(0)
      .max(
        MAX_FUNDADOR_PERCENTUAL,
        `A alocação para o Fundador não pode ultrapassar ${MAX_FUNDADOR_PERCENTUAL}%`,
      ),
    recursosDesenvolvimento: z.number().min(0).max(100),
    recursosComercial: z.number().min(0).max(100),
    recursosMarketing: z.number().min(0).max(100),
    recursosNuvem: z.number().min(0).max(100),
    recursosJuridico: z.number().min(0).max(100),
    recursosCaixa: z.number().min(0).max(100),
  })
  .superRefine((data, ctx) => {
    const total =
      data.recursosFundador +
      data.recursosDesenvolvimento +
      data.recursosComercial +
      data.recursosMarketing +
      data.recursosNuvem +
      data.recursosJuridico +
      data.recursosCaixa;

    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        path: ["recursosFundador"],
        code: z.ZodIssueCode.custom,
        message: `A soma das alocações deve ser exatamente 100% (atual: ${total}%)`,
      });
    }
  });

export type RecursosFormData = z.infer<typeof recursosSchema>;

// ----- Sub-schema: TESE -----
export const teseSchema = z.object({
  problema: z
    .string()
    .min(10, "Descreva o problema com pelo menos 10 caracteres")
    .max(2000, "A descrição do problema deve ter no máximo 2000 caracteres"),
  solucao: z
    .string()
    .min(10, "Descreva a solução com pelo menos 10 caracteres")
    .max(2000, "A descrição da solução deve ter no máximo 2000 caracteres"),
  diferencial: z
    .string()
    .min(10, "Descreva o diferencial competitivo com pelo menos 10 caracteres")
    .max(2000, "O diferencial competitivo deve ter no máximo 2000 caracteres"),
  modeloReceita: z
    .string()
    .min(10, "Descreva o modelo de receita com pelo menos 10 caracteres")
    .max(2000, "O modelo de receita deve ter no máximo 2000 caracteres"),
  mercadoAlvo: z
    .string()
    .min(10, "Descreva o mercado-alvo com pelo menos 10 caracteres")
    .max(2000, "O mercado-alvo deve ter no máximo 2000 caracteres"),
});

export type TeseFormData = z.infer<typeof teseSchema>;

// ----- Sub-schema: GOVERNANÇA -----
export const governancaSchema = z.object({
  socios: z.number().min(1, "Mínimo de 1 sócio/fundador"),
  dedicacao: z
    .string()
    .min(
      2,
      "Descreva o tempo de dedicação dos fundadores (mínimo 2 caracteres)",
    )
    .max(200, "O tempo de dedicação deve ter no máximo 200 caracteres"),
  compradores: z
    .string()
    .min(10, "Descreva os potenciais compradores com pelo menos 10 caracteres")
    .max(2000, "Os potenciais compradores devem ter no máximo 2000 caracteres"),
  investimentoPrevio: z
    .string()
    .max(2000, "O investimento prévio deve ter no máximo 2000 caracteres")
    .optional(),
  concorrencia: z
    .string()
    .min(10, "Descreva a concorrência com pelo menos 10 caracteres")
    .max(2000, "A descrição da concorrência deve ter no máximo 2000 caracteres"),
});

export type GovernancaFormData = z.infer<typeof governancaSchema>;

// ----- Sub-schema: RETORNOS -----
export const retornosSchema = z
  .object({
    ofereceLucros: z.boolean(),
    lucrosDescricao: z.string().optional(),
    ofereceBeneficios: z.boolean(),
    beneficiosDescricao: z.string().optional(),
    aceitaAfiliados: z.boolean(),
    affiliateCommissionPct: z.number().min(5).max(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ofereceLucros && !data.lucrosDescricao?.trim()) {
      ctx.addIssue({
        path: ["lucrosDescricao"],
        code: z.ZodIssueCode.custom,
        message:
          "A descrição da política de participação nos lucros é obrigatória caso a opção Sim esteja selecionada",
      });
    } else if (
      data.ofereceLucros &&
      data.lucrosDescricao &&
      data.lucrosDescricao.length > 2000
    ) {
      ctx.addIssue({
        path: ["lucrosDescricao"],
        code: z.ZodIssueCode.custom,
        message: "A descrição da política deve ter no máximo 2000 caracteres",
      });
    } else if (
      data.ofereceLucros &&
      data.lucrosDescricao &&
      data.lucrosDescricao.trim().length < 10
    ) {
      ctx.addIssue({
        path: ["lucrosDescricao"],
        code: z.ZodIssueCode.custom,
        message: "A descrição da política deve ter pelo menos 10 caracteres",
      });
    }

    if (data.ofereceBeneficios && !data.beneficiosDescricao?.trim()) {
      ctx.addIssue({
        path: ["beneficiosDescricao"],
        code: z.ZodIssueCode.custom,
        message:
          "A descrição dos benefícios adicionais é obrigatória caso a opção Sim esteja selecionada",
      });
    } else if (
      data.ofereceBeneficios &&
      data.beneficiosDescricao &&
      data.beneficiosDescricao.length > 4000
    ) {
      ctx.addIssue({
        path: ["beneficiosDescricao"],
        code: z.ZodIssueCode.custom,
        message: "A descrição dos benefícios deve ter no máximo 4000 caracteres",
      });
    }
  });

export type RetornosFormData = z.infer<typeof retornosSchema>;

// ==========================================
// TIPO DA CAMPANHA (loader)
// ==========================================
export interface CaptacaoCampaign {
  id?: string | number;
  startupId?: string | number;
  status?: string;
  targetAmount?: number;
  valuation?: number;
  tokenPrice?: number;
  totalTokens?: number;
  reservationFeePaid?: boolean;
  payments?: Array<Record<string, unknown>>;
  resources?: Array<{ categoria: string; percentual: number }>;
  oQueEsperaAlcancar?: string;
  problema?: string;
  solucao?: string;
  diferencial?: string;
  modeloReceita?: string;
  mercadoAlvo?: string;
  sociosCount?: number | string | null;
  dedicacao?: string;
  compradores?: string;
  investimentoPrevio?: string;
  concorrencia?: string;
  participacaoLucros?: boolean | string;
  politicaLucros?: string;
  beneficiosAdicionais?: boolean | string;
  beneficiosDescricao?: string;
  affiliateCommissionPct?: number | string | null;
  startup?: { id?: string | number; statusCampanha?: string };
  // S35 — última decisão da Fase 3 (Detalhes de Captação). Quando
  // `phase3Rejected=true`, exibe banner rosa com a justificativa e CTA
  // de ressubmissão em `/founder/startups/:id/captacao`.
  phase3Rejected?: boolean;
  phase3RejectedJustification?: string | null;
  phase3RejectedAt?: string | null;
  [key: string]: unknown;
}

// ==========================================
// DEFAULT VALUES POR ABA (a partir da campaign do loader)
// ==========================================
export function recursosDefaults(
  campaign: CaptacaoCampaign | null,
): RecursosFormData {
  const safe = campaign ?? ({} as CaptacaoCampaign);
  const resources = safe.resources ?? [];
  const getRecurso = (cat: string) =>
    Number(resources.find((r) => r.categoria === cat)?.percentual ?? 0);
  return {
    esperaAlcancar: safe.oQueEsperaAlcancar || "",
    // Dados legados podem conter mais de 20%; normalizar na entrada impede
    // que o formulário reexiba ou envie um valor acima do limite vigente.
    recursosFundador: Math.min(
      MAX_FUNDADOR_PERCENTUAL,
      getRecurso("FUNDADOR"),
    ),
    recursosDesenvolvimento: getRecurso("DESENVOLVIMENTO"),
    recursosComercial: getRecurso("COMERCIAL"),
    recursosMarketing: getRecurso("MARKETING"),
    recursosNuvem: getRecurso("NUVEM"),
    recursosJuridico: getRecurso("JURIDICO"),
    recursosCaixa: getRecurso("RESERVA_CAIXA"),
  };
}

export function teseDefaults(
  campaign: CaptacaoCampaign | null,
): TeseFormData {
  const safe = campaign ?? ({} as CaptacaoCampaign);
  return {
    problema: safe.problema || "",
    solucao: safe.solucao || "",
    diferencial: safe.diferencial || "",
    modeloReceita: safe.modeloReceita || "",
    mercadoAlvo: safe.mercadoAlvo || "",
  };
}

export function governancaDefaults(
  campaign: CaptacaoCampaign | null,
): GovernancaFormData {
  const safe = campaign ?? ({} as CaptacaoCampaign);
  return {
    socios:
      safe.sociosCount !== undefined && safe.sociosCount !== null
        ? Number(safe.sociosCount)
        : 1,
    dedicacao: safe.dedicacao || "",
    compradores: safe.compradores || "",
    investimentoPrevio: safe.investimentoPrevio || "",
    concorrencia: safe.concorrencia || "",
  };
}

export function retornosDefaults(
  campaign: CaptacaoCampaign | null,
): RetornosFormData {
  const safe = campaign ?? ({} as CaptacaoCampaign);
  return {
    ofereceLucros:
      safe.participacaoLucros === true ||
      safe.participacaoLucros === "true",
    lucrosDescricao: safe.politicaLucros || "",
    ofereceBeneficios:
      safe.beneficiosAdicionais === true ||
      safe.beneficiosAdicionais === "true",
    beneficiosDescricao: safe.beneficiosDescricao || "",
    aceitaAfiliados:
      safe.affiliateCommissionPct != null &&
      Number(safe.affiliateCommissionPct) > 0,
    affiliateCommissionPct: Number(safe.affiliateCommissionPct || 5),
  };
}

// ==========================================
// MAPPERS: form → payload backend (por aba)
// ==========================================
// helper: string trimada ou undefined (omite campo no JSON.stringify)
const opt = (v: string | undefined | null): string | undefined => {
  if (v == null) return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
};

export function mapRecursosToCampaignPayload(data: RecursosFormData) {
  return { oQueEsperaAlcancar: data.esperaAlcancar };
}

export function mapRecursosToResourceAllocations(data: RecursosFormData) {
  return [
    { categoria: "FUNDADOR", percentual: Number(data.recursosFundador) },
    {
      categoria: "DESENVOLVIMENTO",
      percentual: Number(data.recursosDesenvolvimento),
    },
    { categoria: "COMERCIAL", percentual: Number(data.recursosComercial) },
    { categoria: "MARKETING", percentual: Number(data.recursosMarketing) },
    { categoria: "NUVEM", percentual: Number(data.recursosNuvem) },
    { categoria: "JURIDICO", percentual: Number(data.recursosJuridico) },
    { categoria: "RESERVA_CAIXA", percentual: Number(data.recursosCaixa) },
  ].filter((a) => Number.isFinite(a.percentual) && a.percentual >= 1);
}

export function mapTeseToCampaignPayload(data: TeseFormData) {
  return {
    problema: data.problema,
    solucao: data.solucao,
    modeloReceita: data.modeloReceita,
    diferencial: data.diferencial,
    mercadoAlvo: data.mercadoAlvo,
  };
}

export function mapGovernancaToCampaignPayload(data: GovernancaFormData) {
  return {
    sociosCount: data.socios,
    dedicacao: opt(data.dedicacao),
    compradores: data.compradores,
    investimentoPrevio: opt(data.investimentoPrevio),
    concorrencia: data.concorrencia,
  };
}

export function mapRetornosToCampaignPayload(data: RetornosFormData) {
  return {
    participacaoLucros: data.ofereceLucros,
    politicaLucros:
      data.ofereceLucros && data.lucrosDescricao
        ? data.lucrosDescricao
        : undefined,
    beneficiosAdicionais: data.ofereceBeneficios,
    beneficiosDescricao: data.ofereceBeneficios
      ? data.beneficiosDescricao
      : undefined,
    // aceitaAfiliados/affiliateCommissionPct: congelados após ativação —
    // enviados apenas em DRAFT via affiliateCommissionPct quando aceito.
    affiliateCommissionPct: data.aceitaAfiliados
      ? Number(data.affiliateCommissionPct ?? 5)
      : 0,
  };
}

// ==========================================
// SAVE HELPERS (chamada aos BFFs)
// ==========================================
export async function patchCampaign(
  campaignId: string | number | null | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/api/founder/campaigns/${campaignId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message =
      errBody?.message ||
      (res.status === 403
        ? "A campanha não está mais em DRAFT — apenas rascunhos podem ser editados. Use Ações para mudar status."
        : `Erro ao salvar dados da captação (${res.status})`);
    throw new Error(message);
  }
}

export async function putResources(
  campaignId: string | number,
  resourceAllocations: Array<{ categoria: string; percentual: number }>,
): Promise<void> {
  const res = await fetch(`/api/founder/campaigns/${campaignId}/resources`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ resourceAllocations }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message =
      errBody?.message ||
      `Erro ao salvar alocação de recursos (${res.status})`;
    throw new Error(message);
  }
}

// ==========================================
// COMPONENTES DE RECURSOS (auto-cap %)
// ==========================================
export const RECURSO_FIELDS = [
  { name: "recursosFundador", label: "Fundador" },
  { name: "recursosDesenvolvimento", label: "Desenvolvimento" },
  { name: "recursosComercial", label: "Comercial (Equipe)" },
  { name: "recursosMarketing", label: "Marketing" },
  { name: "recursosNuvem", label: "Nuvem / Infra" },
  { name: "recursosJuridico", label: "Jurídico" },
  { name: "recursosCaixa", label: "Reserva de Caixa" },
] as const;

export type RecursoFieldName = (typeof RECURSO_FIELDS)[number]["name"];

export function RecursoField({
  name,
  label,
  control,
  watchedFields,
  containerClassName,
}: {
  name: RecursoFieldName;
  label: string;
  control: ReturnType<typeof useForm<RecursosFormData>>["control"];
  watchedFields: Partial<Record<RecursoFieldName, number | undefined>>;
  containerClassName?: string;
}) {
  const somaOutros = RECURSO_FIELDS.filter((f) => f.name !== name).reduce(
    (s, f) => s + (Number(watchedFields[f.name]) || 0),
    0,
  );
  const categoryMax =
    name === "recursosFundador" ? MAX_FUNDADOR_PERCENTUAL : 100;
  // Sprint S34-i v3 — quando a soma ja atingiu 100, o campo so permite
  // DIMINUIR (max = valor atual). Caso contrario, max = 100 - somaOutros.
  const currentValue = Number(watchedFields[name]) || 0;
  const totalAtual = somaOutros + currentValue;
  const somaJaAtingiu100 = totalAtual >= 100 - 0.01;
  const maxBySum = somaJaAtingiu100
    ? currentValue
    : Math.min(categoryMax, Math.max(0, 100 - somaOutros));

  return (
    <div className={`space-y-1.5 ${containerClassName ?? ""}`}>
      <label
        htmlFor={name}
        className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
      >
        {label}
      </label>
      <div className="relative">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <RecursoInput
              field={field}
              maxBySum={maxBySum}
              disabled={somaJaAtingiu100 && currentValue === 0}
            />
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
          %
        </span>
      </div>
    </div>
  );
}

export function RecursoInput({
  field,
  maxBySum,
  disabled = false,
}: {
  field: {
    name: RecursoFieldName;
    value: number | undefined;
    onChange: (v: number) => void;
    onBlur: () => void;
  };
  maxBySum: number;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState<string>(
    field.value === undefined || field.value === null
      ? ""
      : String(field.value),
  );

  useEffect(() => {
    const formStr =
      field.value === undefined || field.value === null
        ? ""
        : String(field.value);
    const localAsNum = localValue === "" ? 0 : Number(localValue);
    if (formStr !== localValue && field.value !== localAsNum) {
      setLocalValue(formStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  const applyCap = (raw: number): number => {
    if (!Number.isFinite(raw)) return 0;
    const safe = Math.max(0, Math.min(100, raw));
    return Math.min(safe, maxBySum);
  };

  return (
    <input
      id={field.name}
      type="number"
      min={0}
      max={maxBySum}
      step={1}
      disabled={disabled}
      value={localValue}
      onChange={(e) => {
        const str = e.target.value;
        setLocalValue(str);
        if (str === "" || str === "-") {
          field.onChange(0);
          return;
        }
        const num = Number(str);
        if (!Number.isFinite(num)) return;
        const capped = applyCap(num);
        field.onChange(capped);
        if (capped !== num) {
          setLocalValue(String(capped));
        }
      }}
      onBlur={() => {
        const num = localValue === "" ? 0 : Number(localValue);
        const capped = applyCap(num);
        const cappedStr = String(capped);
        if (cappedStr !== localValue) setLocalValue(cappedStr);
        field.onChange(capped);
      }}
      className={`${startupInputClass} pr-10 font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
      placeholder="0"
    />
  );
}
