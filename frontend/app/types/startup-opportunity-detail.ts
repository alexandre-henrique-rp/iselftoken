/** Sócio (do JSON `socios` no banco). */
export interface StartupSeal {
  id: number;
  slug: string;
  name: string;
  description?: string;
  imagePath: string;
  category: string;
}

export interface StartupSocio {
  nome: string;
  cargo: string;
  percentual?: number;
  fotoUrl?: string;
}

/** Membro do time fundador (do JSON `teams` no banco). */
export interface StartupTeamMember {
  nome: string;
  cargo: string;
  fotoUrl?: string;
}

export interface StartupSocialLinks {
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
}

export interface StartupResourceAllocation {
  category?: string;
  descricao?: string;
  percentual?: number;
}

export interface StartupAreaAtuacao {
  id: number;
  slug: string;
  nome: string;
  descricao?: string | null;
  ordem?: number;
  categoryId?: number;
}

export interface StartupOpportunityBase {
  slug: string;
  name: string;
  logo: string;
  cover: string;
  description: string;
  category: string;
  stage: string;
  areaAtuacaoIds?: number[] | null;
  areasAtuacao?: StartupAreaAtuacao[] | null;
  website?: string | null;
  socialLinks?: StartupSocialLinks | null;
  youtubeUrl: string | null;
  /** Vídeo de pitch enviado (mp4/webm) — exibe via `<video controls>`. */
  pitchVideoUrl: string | null;
  /** PDF do pitch deck — exibe link de download / embed. */
  pitchDeckUrl: string | null;
  problema: string | null;
  solucao: string | null;
  descritivoBasico?: string | null;
  modeloReceita?: string | null;
  diferencial?: string | null;
  mercadoAlvo?: string | null;
  esperaAlcancar?: string | null;
  dedicacao?: string | null;
  compradores?: string | null;
  investimentoPrevio?: string | null;
  concorrencia?: string | null;
  usoRecursos?: StartupResourceAllocation[] | null;
  objetivoCaptacao?: string | null;
  sociosCount?: number | null;
  participacaoLucros?: boolean | null;
  faturamentoMinimoLucros?: number | string | null;
  politicaLucros?: string | null;
  beneficiosAdicionais?: boolean | null;
  beneficiosDescricao?: string | null;
  affiliateCommissionPct?: number | string | null;
  seals?: StartupSeal[];
  /** Sócios da startup (capital social). */
  socios: StartupSocio[];
  /** Time fundador / equipe. */
  teams: StartupTeamMember[];
}

export interface StartupPublicOpportunity extends StartupOpportunityBase {
  campaign: {
    raised: number;
    goal: number;
    valuation: number;
    percentage: number;
    equity: number | null;
  };
}

export interface StartupPrivateOpportunity extends StartupOpportunityBase {
  /** Presente somente no endpoint owner/admin usado pelo preview. */
  id?: number;
  metrics: {
    valuation: string;
    tokenPrice: string;
    tokensAvailable: string;
    investors: string;
  };
  campaign: {
    title: string;
    raised: string;
    goal: string;
    percentage: number;
    equity: string;
    minInvestment: string;
    remainingDays: number;
    deadline: string;
  };
  investment: {
    campaignId: number;
    tokenPrice: number;
    /** Preço base por token (repasse à startup). Null em campanhas legadas. */
    tokenBasePrice?: number | null;
    /** Alíquota da taxa da plataforma (ex.: 0.05 = 5%). Null em legadas. */
    platformFeePct?: number | null;
    minInvestment: number;
    tokensAvailable: number;
  };
}

export type StartupOpportunityMode = "public" | "private" | "preview";
