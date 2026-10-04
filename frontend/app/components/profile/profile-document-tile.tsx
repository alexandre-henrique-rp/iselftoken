import type { LucideIcon } from "lucide-react";
import { Check, Clock, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

export type TileStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  /**
   * BUG-FT-005: rejeição admin recente cujo KYCProfile já foi deletado pelo
   * cleanup. Exibe chip "Faça upload novamente" sem preview (imagem antiga
   * foi removida do storage pelo CASE.md:884).
   */
  | "REJECTED_NO_DOC"
  | "EMPTY";

interface ProfileDocumentTileProps {
  label: string;
  icon: LucideIcon;
  status: TileStatus;
  onClick?: () => void;
  rejectionReason?: string | null;
  disabled?: boolean;
  /** Resolved URL of the uploaded asset or local capture to render as a preview. */
  previewUrl?: string | null;
  /** Tipo de mídia usado no preview; Selfie é um vídeo de liveness. */
  previewType?: "image" | "video";
}

const STATUS_CONFIG: Record<
  TileStatus,
  {
    borderClass: string;
    bgClass: string;
    chipClass: string;
    chipIcon: typeof Check;
    chipLabel: string;
  }
> = {
  APPROVED: {
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/5",
    chipClass: "bg-emerald-500/15 text-emerald-500",
    chipIcon: Check,
    chipLabel: "Aprovado",
  },
  PENDING: {
    borderClass: "border-amber-500/30",
    bgClass: "bg-amber-500/5",
    chipClass: "bg-amber-500/15 text-amber-500",
    chipIcon: Clock,
    chipLabel: "Em Análise",
  },
  REJECTED: {
    borderClass: "border-rose-500/30",
    bgClass: "bg-rose-500/5",
    chipClass: "bg-rose-500/15 text-rose-500",
    chipIcon: X,
    chipLabel: "Rejeitado",
  },
  // BUG-FT-005: slot vazio por rejeição recente. Mesma cor de alerta do
  // REJECTED, mas com CTA claro: "Faça upload novamente" (não mostra a
  // imagem antiga porque foi removida do storage).
  REJECTED_NO_DOC: {
    borderClass: "border-rose-500/30",
    bgClass: "bg-rose-500/5",
    chipClass: "bg-rose-500/15 text-rose-500",
    chipIcon: X,
    chipLabel: "Faça upload novamente",
  },
  EMPTY: {
    borderClass: "border-dashed border-border hover:border-primary/50",
    bgClass: "bg-surface-container-high/50 hover:bg-surface-container-high/80",
    chipClass: "bg-surface-container-low text-muted-foreground",
    chipIcon: Plus,
    chipLabel: "Upload",
  },
};

export function ProfileDocumentTile({
  label,
  icon: Icon,
  status,
  onClick,
  rejectionReason,
  disabled = false,
  previewUrl,
  previewType = "image",
}: ProfileDocumentTileProps) {
  const cfg = STATUS_CONFIG[status];
  const ChipIcon = cfg.chipIcon;
  const ariaLabel = `${label}: ${cfg.chipLabel}${rejectionReason ? ` — ${rejectionReason}` : ""}`;
  // A captura local existe antes de o backend criar o registro READY.
  // O preview deve aparecer imediatamente, inclusive enquanto o status é EMPTY.
  // BUG-FT-005: REJECTED_NO_DOC nunca tem preview (imagem foi removida do S3).
  const showPreview =
    Boolean(previewUrl) && status !== "REJECTED_NO_DOC";

  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUrl, previewType]);

  const previewVisible = showPreview && !previewFailed;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={rejectionReason ?? undefined}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border ${cfg.borderClass} ${cfg.bgClass} p-3 text-left transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 sm:p-4 shadow-sm`}
    >
      {previewVisible ? (
        <>
          {previewType === "video" ? (
            <video
              key={previewUrl ?? "empty"}
              src={previewUrl ?? undefined}
              aria-hidden
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                setPreviewFailed(true);
              }}
            />
          ) : (
            <img
              key={previewUrl ?? "empty"}
              src={previewUrl ?? undefined}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                setPreviewFailed(true);
              }}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40"
          />
        </>
      ) : null}

      <span
        className={`relative z-10 self-end inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cfg.chipClass}`}
      >
        <ChipIcon className="size-2.5" /> {cfg.chipLabel}
      </span>
      {!previewVisible ? (
        <Icon
          className={`relative z-10 size-6 ${status === "EMPTY" ? "text-muted-foreground/60" : "text-foreground"}`}
          aria-hidden
        />
      ) : (
        <span aria-hidden className="relative z-10" />
      )}
      <span
        className={`relative z-10 text-xs font-semibold tracking-tight ${
          status === "EMPTY" ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
