/**
 * Helpers de normalização para respostas do backend.
 *
 * Aplicam defaults seguros por campo quando o backend envia shape parcial
 * ou tipos inesperados. Eliminam o Pattern A (truthy data com campos faltantes)
 * nas loaders/queries do frontend.
 *
 * Convenção: nunca lançar — sempre devolver um valor utilizável (mesmo que
 * degradado) para a UI renderizar um estado vazio em vez de crashar.
 */

function asArray<T = unknown>(
  v: unknown,
  itemNormalizer?: (x: unknown) => T,
): T[] {
  if (!Array.isArray(v)) return [];
  if (!itemNormalizer) return v as T[];
  return v.map(itemNormalizer);
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

function asBoolean(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function asObject<T extends Record<string, unknown>>(
  v: unknown,
  normalizer: (x: Record<string, unknown>) => T,
): T | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  try {
    return normalizer(v as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Normaliza o detalhe de um usuário retornado pelo backend.
 * Nunca lança — devolve um objeto com defaults seguros.
 */
export interface NormalizedUserDetail {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: string;
  telefone: string | null;
  data_nascimento: string | null;
  genero: string | null;
  tipo_documento: string | null;
  reg_documento: string | null;
  isActive: boolean;
  createdAt: string;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  pais: { id: number | null; iso3: string; nome: string; emoji: string } | null;
  bandeira: string | null;
  avatar: { id: number; status: string; url: string } | null;
  comprovante: { id: number; status: string; url: string } | null;
  documento: { id: number; status: string; url: string } | null;
  biofacial: { id: number; status: string; url: string } | null;
  startups: Array<{
    id: number;
    nome: string;
    status: string;
    createdAt: string;
  }>;
  campaigns: Array<{
    id: number;
    startupId: number;
    startupNome: string;
    targetAmount: number;
    status: string;
    progress: number;
  }>;
  investments: Array<{
    id: number;
    startupNome: string;
    amount: number;
    tokensQty: number;
    status: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: number;
    content: string;
    createdAt: string;
    adminNome: string;
  }>;
  seals: string[];
  rating: number | null;
  auditLogs: Array<{
    id: number;
    action: string;
    entity: string;
    createdAt: string;
    ip: string;
    adminNome: string;
  }>;
}

export function normalizeUserDetail(
  d: Record<string, unknown>,
): NormalizedUserDetail {
  return {
    id: asNumber(d.id),
    publicId: asString(d.publicId),
    email: asString(d.email),
    nome: asString(d.nome, "—"),
    role: asString(d.role, "USER"),
    telefone: d.telefone == null ? null : asString(d.telefone),
    data_nascimento:
      d.data_nascimento == null ? null : asString(d.data_nascimento),
    genero: d.genero == null ? null : asString(d.genero),
    tipo_documento:
      d.tipo_documento == null ? null : asString(d.tipo_documento),
    reg_documento: d.reg_documento == null ? null : asString(d.reg_documento),
    isActive: asBoolean(d.isActive, true),
    createdAt: asString(d.createdAt),
    endereco: d.endereco == null ? null : asString(d.endereco),
    numero: d.numero == null ? null : asString(d.numero),
    complemento: d.complemento == null ? null : asString(d.complemento),
    bairro: d.bairro == null ? null : asString(d.bairro),
    cidade: d.cidade == null ? null : asString(d.cidade),
    uf: d.uf == null ? null : asString(d.uf),
    cep: d.cep == null ? null : asString(d.cep),
    pais: asObject<NormalizedUserDetail["pais"] & object>(
      d.pais && typeof d.pais === "object" ? d.pais : d.paisCountry,
      (p) => ({
        id: p.id == null ? null : asNumber(p.id),
        iso3: asString(p.iso3),
        nome: asString(p.nome ?? p.name),
        emoji: asString(p.emoji),
      }),
    ),
    bandeira: d.bandeira == null ? null : asString(d.bandeira),
    avatar: asObject<NormalizedUserDetail["avatar"] & object>(
      d.avatar,
      (p) => ({
        id: asNumber(p.id),
        status: asString(p.status),
        url: asString(p.url),
      }),
    ),
    comprovante: asObject<NormalizedUserDetail["comprovante"] & object>(
      d.comprovante,
      (p) => ({
        id: asNumber(p.id),
        status: asString(p.status),
        url: asString(p.url),
      }),
    ),
    documento: asObject<NormalizedUserDetail["documento"] & object>(
      d.documento,
      (p) => ({
        id: asNumber(p.id),
        status: asString(p.status),
        url: asString(p.url),
      }),
    ),
    biofacial: asObject<NormalizedUserDetail["biofacial"] & object>(
      d.biofacial,
      (p) => ({
        id: asNumber(p.id),
        status: asString(p.status),
        url: asString(p.url),
      }),
    ),
    startups: asArray<NormalizedUserDetail["startups"][number]>(
      d.startups,
      (x) => {
        const s = x as Record<string, unknown>;
        return {
          id: asNumber(s.id),
          nome: asString(s.nome),
          status: asString(s.status),
          createdAt: asString(s.createdAt),
        };
      },
    ),
    campaigns: asArray<NormalizedUserDetail["campaigns"][number]>(
      d.campaigns,
      (x) => {
        const s = x as Record<string, unknown>;
        return {
          id: asNumber(s.id),
          startupId: asNumber(s.startupId),
          startupNome: asString(s.startupNome),
          targetAmount: asNumber(s.targetAmount),
          status: asString(s.status),
          progress: asNumber(s.progress),
        };
      },
    ),
    investments: asArray<NormalizedUserDetail["investments"][number]>(
      d.investments,
      (x) => {
        const s = x as Record<string, unknown>;
        return {
          id: asNumber(s.id),
          startupNome: asString(s.startupNome),
          amount: asNumber(s.amount),
          tokensQty: asNumber(s.tokensQty),
          status: asString(s.status),
          createdAt: asString(s.createdAt),
        };
      },
    ),
    notes: asArray<NormalizedUserDetail["notes"][number]>(d.notes, (x) => {
      const s = x as Record<string, unknown>;
      return {
        id: asNumber(s.id),
        content: asString(s.content),
        createdAt: asString(s.createdAt),
        adminNome: asString(s.adminNome),
      };
    }),
    seals: asArray<string>(d.seals),
    rating: d.rating == null ? null : asNumber(d.rating),
    auditLogs: asArray<NormalizedUserDetail["auditLogs"][number]>(
      d.auditLogs,
      (x) => {
        const s = x as Record<string, unknown>;
        return {
          id: asNumber(s.id),
          action: asString(s.action),
          entity: asString(s.entity),
          createdAt: asString(s.createdAt),
          ip: asString(s.ip),
          adminNome: asString(s.adminNome),
        };
      },
    ),
  };
}

/**
 * Extrai e normaliza o payload `body.data` de uma resposta da API.
 * Retorna `null` se a resposta não tiver shape válido.
 */
export function extractData<T>(
  body: unknown,
  normalizer: (d: Record<string, unknown>) => T,
): T | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { data?: unknown; success?: boolean };
  if (b.data == null) return null;
  if (!b.data || typeof b.data !== "object" || Array.isArray(b.data))
    return null;
  try {
    return normalizer(b.data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Fetch seguro para loaders SSR. Propaga cookie, abort em 8s, e parseia
 * JSON com fallback. **Nunca lança.**
 */
export async function safeLoaderFetch(
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const cookie = request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${new URL(request.url).origin}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        cookie,
      },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
