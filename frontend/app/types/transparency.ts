/**
 * Tipos TypeScript para o modulo de Transparencia.
 *
 * Espelha os tipos do backend NestJS (backendnode/src/api/transparency).
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md
 */

export type TransparencyPostType =
  | "FINANCIAL_REPORT"
  | "PRODUCT_MILESTONE"
  | "CORPORATE_CHANGE"
  | "GENERAL";

export const TRANSPARENCY_POST_TYPES: TransparencyPostType[] = [
  "FINANCIAL_REPORT",
  "PRODUCT_MILESTONE",
  "CORPORATE_CHANGE",
  "GENERAL",
];

export const TRANSPARENCY_TYPE_LABELS: Record<TransparencyPostType, string> = {
  FINANCIAL_REPORT: "Relatorio Financeiro",
  PRODUCT_MILESTONE: "Marco de Produto",
  CORPORATE_CHANGE: "Mudanca Societaria",
  GENERAL: "Geral",
};

/**
 * Origem do post (FIN-09 + §8.2).
 * - `INSTALLMENT_REQUEST`: auto-gerado pelo backend ao aprovar/concluir
 *    uma InstallmentRequest. `sourceId` armazena o InstallmentRequest.id
 *    (string). Frontend usa esse par para:
 *    (a) criar a secao dedicada "Relatorios de Solicitacoes" em
 *        /founder/startups/:id/transparencia;
 *    (b) linkar de volta para `/founder/campaigns/:id/financeiro`.
 * - `DISCUSSION`: reservado para posts derivados de discussion (futuro).
 * - `MANUAL` ou `null`: post criado manualmente pelo founder via editor.
 *
 * LGPD: `sourceId` e um ID opaco, nunca PII.
 */
export type TransparencyPostSourceType =
  | "INSTALLMENT_REQUEST"
  | "DISCUSSION"
  | "MANUAL"
  | null;

export interface TransparencyAttachmentUpload {
  id: number;
  publicId: string;
  originalName: string | null;
  mimeType: string | null;
  url: string | null;
}

export interface TransparencyAttachment {
  uploadId: number;
  upload: TransparencyAttachmentUpload;
}

export interface TransparencyAuthor {
  id: number;
  nome: string | null;
  /**
   * UUID público do autor (NUNCA expor email/CPF/telefone).
   * LGPD: fix T-26 (2026-08-22) — substituiu campo `email` que vazava PII.
   * Espelha `backendnode/src/api/transparency/transparency.service.ts:findOne`.
   */
  publicId: string;
}

export interface TransparencyPost {
  id: number;
  startupId: number;
  authorId: number;
  type: TransparencyPostType;
  title: string;
  content: string;
  periodMonth: number | null;
  periodYear: number | null;
  publishedAt: string;
  updatedAt: string;
  deletedAt: string | null;
  attachments?: TransparencyAttachment[];
  author?: TransparencyAuthor;
  /**
   * Origem do post (FIN-09). Veja {@link TransparencyPostSourceType}.
   * Pode ser `null` para posts criados antes desta feature (legacy).
   */
  sourceType: TransparencyPostSourceType;
  /** ID opaco da origem (InstallmentRequest.id ou Discussion.id). `null` para posts manuais. */
  sourceId: string | null;
}

export interface TransparencyListResponse {
  data: TransparencyPost[];
  total: number;
  page: number;
  limit: number;
}

export interface TransparencyListFilters {
  type?: TransparencyPostType;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/*                     Discussao (TRANSP-03 / TRANSP-04)                       */
/* -------------------------------------------------------------------------- */

export type DiscussionCategory =
  | "GERAL"
  | "FINANCEIRO"
  | "PRODUTO"
  | "SOCIETARIO"
  | "DUVIDA";

export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  "GERAL",
  "FINANCEIRO",
  "PRODUTO",
  "SOCIETARIO",
  "DUVIDA",
];

export const DISCUSSION_CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  GERAL: "Geral",
  FINANCEIRO: "Financeiro",
  PRODUTO: "Produto",
  SOCIETARIO: "Societario",
  DUVIDA: "Duvida",
};

/**
 * Descricoes longas das categorias para tooltips/helper text no Chat
 * por Topicos. Usadas na DiscussionSearchBar e em badges explicativos.
 */
export const DISCUSSION_CATEGORY_DESCRIPTIONS: Record<DiscussionCategory, string> = {
  GERAL:
    "Conversas abertas com o fundador e outros investidores sobre a startup como um todo.",
  FINANCEIRO:
    "Sobre repasses, uso dos recursos captados, lucro, marcos financeiros e o relatorio do mes.",
  PRODUTO:
    "Funcionalidades, roadmap, metricas de produto, beta, feedback tecnico e UX.",
  SOCIETARIO:
    "Mudancas societarias, equipe, conselheiros, investidores entrando/saindo, governanca.",
  DUVIDA:
    "Perguntas sobre o funcionamento da plataforma, o repasse ou o uso dos tokens.",
};

export type DiscussionSort = "recent" | "oldest" | "top";

export const DISCUSSION_SORT_LABELS: Record<DiscussionSort, string> = {
  recent: "Recentes",
  oldest: "Mais antigos",
  top: "Mais votados",
};

export interface TransparencyDiscussion {
  id: string;
  startupId: number;
  authorId: number;
  title: string;
  content: string;
  category: DiscussionCategory;
  isAnonymous: boolean;
  upvotesCount: number;
  isPinned: boolean;
  pinnedAt: string | null;
  repliesCount: number;
  lastActivityAt: string;
  viewerHasUpvoted: boolean;
  /** Anonimo: "Nome U." / identificado: "Nome Completo". NUNCA cpf/email/phone. */
  authorPublicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransparencyReply {
  id: string;
  discussionId: string;
  authorId: number;
  content: string;
  /** Mesmo contrato de privacidade do authorPublicId do discussion. */
  authorPublicId: string;
  createdAt: string;
}

export interface DiscussionListResponse {
  items: TransparencyDiscussion[];
  total: number;
  page: number;
  limit: number;
}

export interface DiscussionListFilters {
  page?: number;
  limit?: number;
  q?: string;
  category?: DiscussionCategory;
  sort?: DiscussionSort;
}

export interface DiscussionDetailResponse {
  discussion: TransparencyDiscussion;
  replies: TransparencyReply[];
}