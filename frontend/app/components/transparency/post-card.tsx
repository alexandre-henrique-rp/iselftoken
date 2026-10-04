/**
 * Card de item de Post de Transparencia.
 *
 * Mostra tipo + periodo + titulo + preview + data. Click -> abre detalhe.
 *
 * Badge de origem (FIN-09): quando o post e auto-gerado por InstallmentRequest
 * aprovada, mostra um selo discreto para o founder/admin saberem que podem
 * editar o texto mas o post foi criado pelo sistema.
 */
import { Sparkles } from "lucide-react";
import type { TransparencyPost } from "~/types/transparency";
import {
  TYPE_COLORS,
  TYPE_LABELS_PT,
  formatDate,
  formatPeriod,
} from "./_shared";

interface PostCardProps {
  post: TransparencyPost;
  onClick: () => void;
  isAuthor: boolean;
  isAdmin: boolean;
}

export function PostCardItem({
  post,
  onClick,
  isAuthor: _isAuthor,
  isAdmin: _isAdmin,
}: PostCardProps) {
  const period = formatPeriod(post.periodMonth, post.periodYear);
  const isAutoFromInstallment = post.sourceType === "INSTALLMENT_REQUEST";

  return (
    <button
      onClick={onClick}
      data-testid={`post-card-${post.id}`}
      className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-foreground/30 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${TYPE_COLORS[post.type]}`}
          >
            {TYPE_LABELS_PT[post.type]}
          </span>
          {period && (
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {period}
            </span>
          )}
          {isAutoFromInstallment && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary"
              title="Auto-gerado a partir de uma solicitacao de repasse aprovada"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Auto
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(post.publishedAt)}
        </span>
      </div>
      <h3 className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition">
        {post.title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
        {post.content.replace(/[#*`]/g, "").slice(0, 180)}
      </p>
      {post.attachments && post.attachments.length > 0 && (
        <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider font-bold">
          {post.attachments.length} anexo
          {post.attachments.length !== 1 ? "s" : ""}
        </div>
      )}
    </button>
  );
}