/**
 * Tipos e constantes visuais compartilhadas pelos sub-componentes de
 * Transparencia (Post + Discussion). Mantem PT-BR na UI.
 */
import type {
  DiscussionCategory,
  TransparencyPostType,
} from "~/types/transparency";

export const TYPE_LABELS_PT: Record<TransparencyPostType, string> = {
  FINANCIAL_REPORT: "Relatorio Financeiro",
  PRODUCT_MILESTONE: "Marco de Produto",
  CORPORATE_CHANGE: "Mudanca Societaria",
  GENERAL: "Geral",
};

export const TYPE_COLORS: Record<TransparencyPostType, string> = {
  FINANCIAL_REPORT: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  PRODUCT_MILESTONE: "bg-blue-500/10 text-blue-700 border-blue-200",
  CORPORATE_CHANGE: "bg-amber-500/10 text-amber-700 border-amber-200",
  GENERAL: "bg-slate-500/10 text-slate-700 border-slate-200",
};

export const CATEGORY_LABELS_PT: Record<DiscussionCategory, string> = {
  GERAL: "Geral",
  FINANCEIRO: "Financeiro",
  PRODUTO: "Produto",
  SOCIETARIO: "Societario",
  DUVIDA: "Duvida",
};

export const CATEGORY_COLORS: Record<DiscussionCategory, string> = {
  GERAL: "bg-slate-500/10 text-slate-700 border-slate-200",
  FINANCEIRO: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  PRODUTO: "bg-blue-500/10 text-blue-700 border-blue-200",
  SOCIETARIO: "bg-amber-500/10 text-amber-700 border-amber-200",
  DUVIDA: "bg-violet-500/10 text-violet-700 border-violet-200",
};

export const PERIOD_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatPeriod(
  month: number | null | undefined,
  year: number | null | undefined,
): string | null {
  if (!month || !year) return null;
  return `${PERIOD_LABELS[month - 1] || month}/${year}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** "Há 1d", "Há 15d", "Há 2h", "agora". Para datas relativas curtas. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `Há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Há ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Há ${months}mes`;
  const years = Math.floor(months / 12);
  return `Há ${years}a`;
}

/** Contagem regressiva ate 24h para editar/deletar thread. Retorna "XhYm" ou expirado. */
export function countdownTo24h(
  isoCreatedAt: string | null | undefined,
): string | null {
  if (!isoCreatedAt) return null;
  const created = new Date(isoCreatedAt).getTime();
  const expire = created + 24 * 60 * 60 * 1000;
  const remaining = expire - Date.now();
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
  return `${hours}h${String(minutes).padStart(2, "0")}m`;
}