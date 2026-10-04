import { z } from "zod";
import { getAlphanumeric } from "~/lib/cnpj-format";
import { ESTAGIO_VALUES as STARTUP_ESTAGIO_VALUES } from "~/lib/startup-enums";
import { isOfficialSocialUrl, socialUrlMessage } from "~/lib/social-url";

/** Limite máximo para a categoria FUNDADOR (CASE.md [Captação] Alocação de
 *  Recursos) — alinhado com o backend em `MAX_FUNDADOR_PERCENTUAL`
 *  (campaign-resource.service.ts). */
export const MAX_FUNDADOR_PERCENTUAL = 20;

/**
 * Regex para CNPJ alfanumérico (IN RFB 2.229/2024).
 * Radical (12 chars): letras maiúsculas A-Z e dígitos 0-9.
 * DV (2 últimos): apenas dígitos numéricos.
 * Aceita tanto CNPJ numérico legado quanto alfanumérico novo.
 */
const CNPJ_REGEX = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;

const URL_OR_EMPTY = z.string().url("URL inválida").or(z.literal(""));

/**
 * Calcula os 2 dígitos verificadores de um CNPJ dado o radical de 12 chars
 * alfanuméricos conforme algoritmo oficial RFB/serpro (IN RFB 2.229/2024,
 * Manual de Cálculo do DV do CNPJ Alfanumérico, junho 2026).
 *
 * @param radical12 String de 12 chars alfanuméricos [A-Z0-9]
 * @returns String de 2 dígitos (concatenação DV1 + DV2)
 * @example
 * computeDv("12ABC34501DE") // → "35"
 */
export function computeDv(radical12: string): string {
  if (radical12.length !== 12) {
    throw new Error("radical deve ter 12 caracteres");
  }

  // Valor numérico do char: '0'-'9' → 0-9, 'A'-'Z' → 17-36
  const charValue = (ch: string): number => ch.charCodeAt(0) - 48;

  // Pesos cíclicos [2..9] aplicados da direita para a esquerda
  const PESOS_CICLO = [2, 3, 4, 5, 6, 7, 8, 9] as const;

  const pesoParaDireitaEsquerda = (idx: number, totalChars: number): number => {
    const idxRight = totalChars - 1 - idx;
    return PESOS_CICLO[idxRight % PESOS_CICLO.length];
  };

  const calcDv = (chars: string): number => {
    const soma = chars
      .split("")
      .reduce(
        (acc, ch, idx) =>
          acc + charValue(ch) * pesoParaDireitaEsquerda(idx, chars.length),
        0,
      );
    const resto = soma % 11;
    return resto <= 1 ? 0 : 11 - resto;
  };

  // DV1: usa os 12 chars radicais
  const dv1 = calcDv(radical12);
  // DV2: usa os 13 chars (radical + dv1)
  const dv2 = calcDv(radical12 + String(dv1));
  return `${dv1}${dv2}`;
}

/**
 * Validador de CNPJ alfanumérico conforme IN RFB 2.229/2024.
 * Aceita CNPJ numérico legado (DV válido pelo mesmo algoritmo) e
 * CNPJ alfanumérico novo com DV calculado pelo manual oficial.
 *
 * @param value CNPJ formatado (XX.XXX.XXX/XXXX-YY)
 * @param ctx Contexto de refinement Zod
 */
export function cnpjAlfanumericoValidator(
  value: string,
  ctx: z.RefinementCtx,
): void {
  const normalized = getAlphanumeric(value);

  if (normalized.length !== 14) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "CNPJ deve conter 14 caracteres no formato XX.XXX.XXX/XXXX-YY",
    });
    return;
  }

  const dvInformado = normalized.slice(12, 14);
  const radical12 = normalized.slice(0, 12);

  // CNPJ numérico legado: aceita direto (DV válido via mesmo algoritmo)
  if (/^\d{14}$/.test(normalized)) {
    const dvCalculado = computeDv(radical12);
    if (dvInformado !== dvCalculado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cnpj"],
        message: `Dígito verificador incorreto. Esperado ${dvCalculado} para o radical fornecido.`,
      });
    }
    return;
  }

  // CNPJ alfanumérico: validação completa do DV
  const dvCalculado = computeDv(radical12);
  if (dvInformado !== dvCalculado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: `Dígito verificador incorreto. Esperado ${dvCalculado.slice(0, 1)}${dvCalculado.slice(1, 2)} para o radical fornecido.`,
    });
  }
}

export const STEP_FIELDS = {
  1: [
    "razaoSocial",
    "nomeFantasia",
    "cnpj",
    "dataAbertura",
    "paisIso3",
    "categoryId",
    "areaAtuacaoIds",
    "estagio",
    "descricao",
    "logo",
    "pitchDeck",
    "videoPitch",
    "website",
    "linkedin",
    "instagram",
    "twitter",
  ],
  2: ["titular", "banco", "agencia", "conta", "digito"],
  3: ["metaCaptacao", "equityOferecido", "wantsFastTrackReview"],
} as const;

export const AREA_VALUES = [
  "fintech",
  "tecnologia_saas",
  "healthtech",
  "edtech",
  "biotech",
  "agrotech",
  "retail",
  "outro",
] as const;

// Estágios atualizados conforme requisitos do cliente
export const ESTAGIO_VALUES = STARTUP_ESTAGIO_VALUES;

export interface NewStartupSchemaLimits {
  minCampaign: number;
  maxCampaign: number;
  equityMin: number;
  equityMax: number;
}

/**
 * Defaults de fallback APENAS para testes unitários / fixtures onde
 * `useFounderFundraisingConfig` não está disponível. Em produção, o wizard
 * SEMPRE lê os limites oficiais via `founderFundraisingConfigQueryOptions`
 * (`frontend/app/lib/queries.ts`) — o admin configura em /financeiro/config.
 *
 * Manter este objeto pequeno e conservador: nunca deve ser a fonte de
 * verdade em runtime.
 */
export const NEW_STARTUP_SCHEMA_FALLBACK_LIMITS: NewStartupSchemaLimits = {
  minCampaign: 300_000,
  maxCampaign: 12_000_000,
  equityMin: 5,
  equityMax: 20,
};

interface NewStartupSchemaOptions {
  /**
   * Mantém compatibilidade com payloads anteriores que ainda não possuíam as
   * FKs de categoria e área. O wizard sempre usa o modo estrito (padrão).
   */
  requireTaxonomy?: boolean;
}

export function createNewStartupSchema(
  limits: Partial<NewStartupSchemaLimits> = {},
  options: NewStartupSchemaOptions = {},
) {
  const resolved = { ...NEW_STARTUP_SCHEMA_FALLBACK_LIMITS, ...limits };
  const requireTaxonomy = options.requireTaxonomy ?? true;

  return z.object({
    razaoSocial: z.string().min(3, "Mínimo 3 caracteres"),
    nomeFantasia: z.string().min(2, "Mínimo 2 caracteres"),
    cnpj: z
      .string()
      .regex(
        CNPJ_REGEX,
        "Formato: AB.12C.3DE/45F6-78 (letras maiúsculas e dígitos)",
      )
      .superRefine(cnpjAlfanumericoValidator),
    dataAbertura: z.string().min(4, "Data de abertura obrigatória"),
    paisIso3: z.string().length(3, "Selecione um país"),
    // ADR-007 §3.2: Categoria + Área de Atuação como FKs numéricas
    categoryId: requireTaxonomy
      ? z.number({ message: "Selecione uma categoria" })
      : z.number().optional(),
    areaAtuacaoIds: requireTaxonomy
      ? z.array(z.number().int().positive()).min(1, "Selecione ao menos uma área de atuação")
      : z.array(z.number().int().positive()).optional(),
    estagio: z.enum(ESTAGIO_VALUES, { error: "Selecione um estágio" }),
    descricao: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(1000, "Máximo 1000 caracteres"),

    // Mídia na fase rápida vira IDs de upload
    logo: z.number().nullable().optional(),
    pitchDeck: z.number().nullable().optional(),
    videoPitch: URL_OR_EMPTY.optional(),
    website: URL_OR_EMPTY.optional(),
    linkedin: z.string().superRefine((value, ctx) => {
      if (value && !isOfficialSocialUrl(value, "linkedin")) ctx.addIssue({ code: "custom", message: socialUrlMessage("LinkedIn") });
    }).or(z.literal("")).optional(),
    instagram: z.string().superRefine((value, ctx) => {
      if (value && !isOfficialSocialUrl(value, "instagram")) ctx.addIssue({ code: "custom", message: socialUrlMessage("Instagram") });
    }).or(z.literal("")).optional(),
    twitter: z.string().superRefine((value, ctx) => {
      if (value && !isOfficialSocialUrl(value, "twitter")) ctx.addIssue({ code: "custom", message: socialUrlMessage("X / Twitter") });
    }).or(z.literal("")).optional(),

    titular: z.string().min(3, "Titular obrigatório"),
    documentoTitular: z.string().optional(),
    banco: z.string().min(2, "Banco obrigatório"),
    tipoConta: z.enum(["corrente", "poupanca"]).optional(),
    agencia: z.string().min(1, "Agência obrigatória"),
    conta: z.string().min(1, "Conta obrigatória"),
    digito: z.string().min(1, "Dígito obrigatório"),
    chavePix: z.string().optional(),

    metaCaptacao: z
      .number()
      .min(
        resolved.minCampaign,
        `Valor mínimo: R$ ${resolved.minCampaign.toLocaleString("pt-BR")}`,
      )
      .max(
        resolved.maxCampaign,
        `Valor máximo: R$ ${resolved.maxCampaign.toLocaleString("pt-BR")}`,
      ),
    equityOferecido: z
      .number()
      .min(resolved.equityMin, `Mínimo ${resolved.equityMin}%`)
      .max(resolved.equityMax, `Máximo ${resolved.equityMax}%`),
    wantsFastTrackReview: z.boolean().default(false),
  });
}

// Export legado: aceita fixtures/payloads anteriores sem taxonomia FK e mantém
// os limites oficiais de equity (5–49%). O wizard usa createNewStartupSchema()
// diretamente e, portanto, continua exigindo categoryId e areaAtuacaoId.
export const newStartupSchema = createNewStartupSchema(
  {},
  { requireTaxonomy: false },
);

export type NewStartupFormData = z.infer<
  ReturnType<typeof createNewStartupSchema>
>;

export const newStartupDefaults: Partial<NewStartupFormData> = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  dataAbertura: "",
  paisIso3: "BRA",
  categoryId: undefined,
  areaAtuacaoIds: [],
  // S18.6 — `estagio` defaulta como undefined (placeholder visível no select
  // com option disabled). O schema zod exige um valor do enum no submit;
  // o wizard mostra toast se o founder tentar submeter sem selecionar.
  estagio: undefined,
  descricao: "",
  logo: undefined,
  pitchDeck: undefined,
  videoPitch: "",
  website: "",
  linkedin: "",
  instagram: "",
  twitter: "",
  titular: "",
  documentoTitular: "",
  banco: "",
  tipoConta: "corrente",
  agencia: "",
  conta: "",
  digito: "",
  chavePix: "",
  metaCaptacao: 300_000,
  equityOferecido: 10,
  wantsFastTrackReview: false,
};

// ==========================================
// SCHEMA DE DADOS COMPLEMENTARES (Pós-Pagamento)
// ==========================================

export const complementaryStartupSchema = z
  .object({
    dataLancamentoRodada: z
      .string()
      .min(10, "Data de lançamento inválida (dd/mm/aaaa)"),
    logoFileId: z.number({
      message: "Upload do arquivo da logo é obrigatório",
    }),
    descricaoBreve: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .max(150, "Máximo 150 caracteres"),
    objetivoCaptacao: z
      .string()
      .min(20, "Objetivo de captação obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    esperaAlcancar: z
      .string()
      .min(20, "Campo obrigatório")
      .max(2000, "Máximo 2000 caracteres"),

    // Como os recursos serão usados (%) — CASE.md [Captação] Alocação de
    // Recursos: o campo FUNDADOR não pode passar de 20% (proteção ao
    // investidor; limite alinhado com o backend em
    // `MAX_FUNDADOR_PERCENTUAL` — campaign-resource.service.ts).
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

    // Tese de negócio
    problema: z
      .string()
      .min(20, "Problema obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    solucao: z
      .string()
      .min(20, "Solução obrigatória")
      .max(2000, "Máximo 2000 caracteres"),
    diferencial: z
      .string()
      .min(20, "Diferencial competitivo obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    modeloReceita: z
      .string()
      .min(20, "Modelo de receita obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    mercadoAlvo: z
      .string()
      .min(20, "Mercado-alvo obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    compradores: z
      .string()
      .min(20, "Compradores potenciais obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    socios: z.number().min(1, "Mínimo 1 sócio/fundador"),
    dedicacao: z
      .string()
      .min(10, "Tempo de dedicação obrigatório (mínimo 10 caracteres)")
      .max(200, "Máximo 200 caracteres"),
    investimentoPrevio: z
      .string()
      .max(2000, "Máximo 2000 caracteres")
      .optional(),
    concorrencia: z
      .string()
      .min(10, "Campo concorrentes obrigatório")
      .max(2000, "Máximo 2000 caracteres"),
    videoApresentacao: URL_OR_EMPTY.optional(),

    // Endereço (postergado da primeira fase)
    cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido (00000-000)"),
    logradouro: z.string().min(2, "Logradouro obrigatório"),
    numero: z.string().min(1, "Número obrigatório"),
    complemento: z.string().optional(),
    bairro: z.string().min(2, "Bairro obrigatório"),
    cidade: z.string().min(2, "Cidade obrigatória"),
    uf: z.string().length(2, "UF inválida (2 letras)"),

    // Dividendos e Benefícios
    ofereceLucros: z.boolean(),
    faturamentoLucros: z.string().optional(),
    ofereceBeneficios: z.boolean(),
    beneficiosDescricao: z
      .string()
      .max(4000, "Máximo 4000 caracteres")
      .optional(),

    // Termos e Contratos
    aceiteParceiros: z.literal(true, {
      message: "Obrigatório aceitar o Termo de Parceiros",
    }),
    aceiteUso: z.literal(true, {
      message: "Obrigatório aceitar o Termo de Uso",
    }),
    aceiteRepasse: z.literal(true, {
      message: "Obrigatório aceitar o Termo de Repasse Vinculado",
    }),
    declaracaoVeracidade: z.literal(true, {
      message: "Obrigatório declarar a veracidade das informações",
    }),
  })
  .superRefine((data, ctx) => {
    // Somando os percentuais de distribuição de recursos para garantir 100%
    const total =
      data.recursosFundador +
      data.recursosDesenvolvimento +
      data.recursosComercial +
      data.recursosMarketing +
      data.recursosNuvem +
      data.recursosJuridico +
      data.recursosCaixa;

    if (total !== 100) {
      ctx.addIssue({
        path: ["recursosFundador"],
        code: z.ZodIssueCode.custom,
        message: `A soma dos recursos deve ser exatamente 100%. Total atual: ${total}%`,
      });
    }

    if (data.ofereceLucros && !data.faturamentoLucros?.trim()) {
      ctx.addIssue({
        path: ["faturamentoLucros"],
        code: z.ZodIssueCode.custom,
        message:
          "Especifique o faturamento anual mínimo para divisão de lucros",
      });
    }

    if (data.ofereceBeneficios && !data.beneficiosDescricao?.trim()) {
      ctx.addIssue({
        path: ["beneficiosDescricao"],
        code: z.ZodIssueCode.custom,
        message: "Descreva a quantidade de tokens e benefícios oferecidos",
      });
    }
  });

export type ComplementaryStartupFormData = z.infer<
  typeof complementaryStartupSchema
>;
