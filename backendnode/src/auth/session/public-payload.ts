/**
 * Sessão pública do usuário.
 *
 * Contrato único do payload armazenado em Redis (chave `session:{sessionId}`)
 * e devolvido por `GET /users/me`. Apenas os campos explicitamente
 * autorizados pela equipe de produto são incluídos.
 *
 * Qualquer adição de campo aqui DEVE ser combinada com o time
 * (Regra 7 — exponha conflitos, não faça a média).
 */

export interface PublicProfileDocument {
  id: number;
  url: string;
  url_sm: string | null;
  url_md: string | null;
  url_web: string | null;
  url_lg: string | null;
  status: string;
}

export interface PublicCountry {
  id: number | null;
  iso3: string;
  nome: string;
  emoji: string;
}

/** Slot do KYCProfile que pode ter sido rejeitado / pedir reenvio. */
export type KycDocSlot = 'avatar' | 'documento' | 'biofacial' | 'comprovante';

/** Dados de perfil/KYC necessários para a própria página de Perfil. */
export interface PublicProfilePayload {
  telefone: string | null;
  data_nascimento: Date | null;
  genero: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  pais: PublicCountry | null;
  bandeira: string | null;
  tipo_documento: string | null;
  reg_documento: string | null;
  avatar: PublicProfileDocument | null;
  comprovante: PublicProfileDocument | null;
  documento: PublicProfileDocument | null;
  biofacial: PublicProfileDocument | null;
  // BUG-FT-005: última rejeição admin de KYC. Populado quando admin REJETA
  // ou pede reenvio (limpo quando admin APROVA nova versão). Permite ao
  // frontend /profile exibir "Faça upload novamente" mesmo após o KYCProfile
  // ter sido deletado pelo cleanup (CASE.md:884).
  lastKycRejectionAt: string | null;
  lastKycRejectionReason: string | null;
  lastKycRejectionSlot: KycDocSlot | null;
}

/** Seleção Prisma compartilhada para o perfil do usuário autenticado. */
export const publicSessionProfileSelect = {
  telefone: true,
  data_nascimento: true,
  genero: true,
  endereco: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  cep: true,
  pais: true,
  bandeira: true,
  paisCountry: {
    select: {
      id: true,
      name: true,
      iso3: true,
      emoji: true,
    },
  },
  tipo_documento: true,
  reg_documento: true,
  avatar: {
    select: {
      id: true,
      url: true,
      url_sm: true,
      url_md: true,
      url_web: true,
      url_lg: true,
      status: true,
    },
  },
  comprovante: {
    select: {
      id: true,
      url: true,
      url_sm: true,
      url_md: true,
      url_web: true,
      url_lg: true,
      status: true,
    },
  },
  documento: {
    select: {
      id: true,
      url: true,
      url_sm: true,
      url_md: true,
      url_web: true,
      url_lg: true,
      status: true,
    },
  },
  biofacial: {
    select: {
      id: true,
      url: true,
      url_sm: true,
      url_md: true,
      url_web: true,
      url_lg: true,
      status: true,
    },
  },
  lastKycRejectionAt: true,
  lastKycRejectionReason: true,
  lastKycRejectionSlot: true,
} as const;

export interface PublicSessionPayload extends PublicProfilePayload {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  wallet: { id: number; updatedAt: Date } | null;
  subscriptions: PublicSubscription[];
  startups: { id: number }[];
}

/** Subscription resumida (apenas o que o front precisa para exibir). */
export interface PublicSubscription {
  id: number;
  userId: number;
  planId: number;
  status: string;
  startedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: number;
    nome: string;
    slug: string;
    descricao: string | null;
    preco: string;
    periodoMeses: number;
    periodo: string;
  };
}

/** Startup resumida (apenas o id para contagem/listagem rápida). */
export interface PublicStartupRef {
  id: number;
}

/**
 * Helper puro — projeta um usuário (vindo do Prisma com relations carregadas)
 * para o payload de sessão pública.
 *
 * Use este helper em:
 *  - `AuthService.login` antes de `createSession`
 *  - `AuthService.create` antes de `createSession`
 *  - `AuthService.createDevAdmin` antes de `createSession`
 *
 * O retorno é seguro de serializar em JSON (sem campos sensíveis).
 */
export function pickPublicProfilePayload(user: any): PublicProfilePayload {
  return {
    telefone: user.telefone ?? null,
    data_nascimento: user.data_nascimento ?? null,
    genero: user.genero ?? null,
    endereco: user.endereco ?? null,
    numero: user.numero ?? null,
    complemento: user.complemento ?? null,
    bairro: user.bairro ?? null,
    cidade: user.cidade ?? null,
    uf: user.uf ?? null,
    cep: user.cep ?? null,
    pais: normalizePais(user.paisCountry ?? user.pais),
    bandeira: normalizeBandeira(user.bandeira, user.paisCountry ?? user.pais),
    tipo_documento: user.tipo_documento ?? null,
    reg_documento: user.reg_documento ?? null,
    avatar: normalizeProfileDocument(user.avatar),
    comprovante: normalizeProfileDocument(user.comprovante),
    documento: normalizeProfileDocument(user.documento),
    biofacial: normalizeProfileDocument(user.biofacial),
    lastKycRejectionAt:
      user.lastKycRejectionAt instanceof Date
        ? user.lastKycRejectionAt.toISOString()
        : typeof user.lastKycRejectionAt === 'string'
          ? user.lastKycRejectionAt
          : null,
    lastKycRejectionReason:
      typeof user.lastKycRejectionReason === 'string'
        ? user.lastKycRejectionReason
        : null,
    lastKycRejectionSlot: normalizeRejectionSlot(user.lastKycRejectionSlot),
  };
}

/** Aceita apenas os slots válidos; ignora valores fora do whitelist (defesa em profundidade). */
function normalizeRejectionSlot(raw: unknown): KycDocSlot | null {
  if (
    raw === 'avatar' ||
    raw === 'documento' ||
    raw === 'biofacial' ||
    raw === 'comprovante'
  ) {
    return raw;
  }
  return null;
}

export function pickPublicSessionPayload(user: any): PublicSessionPayload {
  return {
    id: user.id,
    publicId: user.publicId,
    email: user.email,
    nome: user.nome,
    role: user.role,
    ...pickPublicProfilePayload(user),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    wallet: normalizeWallet(user.wallet),
    subscriptions: Array.isArray(user.subscriptions)
      ? user.subscriptions.map(normalizeSubscription)
      : [],
    startups: Array.isArray(user.startups)
      ? user.startups.map(normalizeStartupRef)
      : [],
  };
}

/**
 * Projeta o payload de sessão (req.user) para o shape de resposta de
 * `GET /users/me`. Remove campos de controle do AuthGuard
 * (lastAccessAt, af2Verified, af2VerifiedAt) E qualquer campo extra
 * presente em sessões antigas (payments, tokens, kyc files, ...).
 *
 * Usado por `UsersService.getMe`. Cobertura: sessões novas (slim) e
 * sessões antigas pré-deploy (fat) — ambas produzem o mesmo output.
 */
export function pickPublicMePayload(sessionUser: any): PublicSessionPayload {
  // Pick explícito e defensivo: só emite os campos do whitelist,
  // mesmo que o input tenha outros (sessões legadas).
  return pickPublicSessionPayload(sessionUser);
}

/* ---------- normalizers (defensivos contra shape divergente) ---------- */

function normalizePais(raw: unknown): PublicCountry | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const iso3 =
    typeof p.iso3 === 'string'
      ? p.iso3
      : typeof p.iso_3 === 'string'
        ? p.iso_3
        : null;
  const nome =
    typeof p.nome === 'string'
      ? p.nome
      : typeof p.name === 'string'
        ? p.name
        : null;
  if (!iso3 || !nome) return null;
  return {
    id: typeof p.id === 'number' && Number.isInteger(p.id) ? p.id : null,
    iso3: iso3.toUpperCase(),
    nome,
    emoji: typeof p.emoji === 'string' ? p.emoji : '',
  };
}

function normalizeBandeira(raw: unknown, country: unknown): string | null {
  if (typeof raw === 'string' && raw) return raw;
  if (country && typeof country === 'object') {
    const emoji = (country as Record<string, unknown>).emoji;
    return typeof emoji === 'string' && emoji ? emoji : null;
  }
  return null;
}

function normalizeWallet(raw: any): PublicSessionPayload['wallet'] {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id,
    updatedAt: raw.updatedAt,
  };
}

function normalizeProfileDocument(raw: any): PublicProfileDocument | null {
  if (!raw || typeof raw !== 'object' || typeof raw.url !== 'string') {
    return null;
  }

  return {
    id: raw.id,
    url: raw.url,
    url_sm: typeof raw.url_sm === 'string' ? raw.url_sm : null,
    url_md: typeof raw.url_md === 'string' ? raw.url_md : null,
    url_web: typeof raw.url_web === 'string' ? raw.url_web : null,
    url_lg: typeof raw.url_lg === 'string' ? raw.url_lg : null,
    status: typeof raw.status === 'string' ? raw.status : 'PENDING',
  };
}

function normalizeSubscription(raw: any): PublicSubscription {
  return {
    id: raw.id,
    userId: raw.userId,
    planId: raw.planId,
    status: raw.status,
    startedAt: raw.startedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    plan: raw.plan
      ? {
          id: raw.plan.id,
          nome: raw.plan.nome,
          slug: raw.plan.slug,
          descricao: raw.plan.descricao ?? null,
          preco: raw.plan.preco == null ? '0' : String(raw.plan.preco),
          periodoMeses: raw.plan.periodoMeses ?? 1,
          periodo: raw.plan.periodo ?? '',
        }
      : {
          id: raw.planId,
          nome: '',
          slug: '',
          descricao: null,
          preco: '0',
          periodoMeses: 1,
          periodo: '',
        },
  };
}

function normalizeStartupRef(raw: any): PublicStartupRef {
  return { id: raw.id };
}
