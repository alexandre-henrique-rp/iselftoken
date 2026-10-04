/** Documento de KYC como o backend o entrega no detalhe. */
export interface KycDoc {
  id: number;
  originalName?: string | null;
  mimeType?: string | null;
  mineType?: string | null;
  extension?: string | null;
  url?: string | null;
  url_web?: string | null;
  url_md?: string | null;
  url_sm?: string | null;
  url_lg?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
}

/** Mapa de status de um documento KYC → rótulo + classes de badge. */
export const DOC_STATUS_UI: Record<
  string,
  { label: string; className: string }
> = {
  APPROVED: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  PENDING: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  UNDER_REVIEW: {
    label: "Em análise",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  REJECTED: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  NEEDS_RESUBMISSION: {
    label: "Reenvio",
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

export function docStatusUI(status?: string | null) {
  return (
    (status && DOC_STATUS_UI[status]) || {
      label: "Sem envio",
      className: "bg-white/5 text-muted-foreground border-white/10",
    }
  );
}
