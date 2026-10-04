/**
 * View de detalhe de Post de Transparencia.
 *
 * Renderiza markdown sanitizado + anexos + acoes (editar/deletar) se autor/ADMIN.
 *
 * Badge de origem (FIN-09): quando o post e auto-gerado a partir de uma
 * InstallmentRequest aprovada, mostramos o selo "Auto: Relatorio de
 * Solicitacao" para o founder entender que ele pode editar mas o post
 * foi criado a partir de uma solicitacao de repasse.
 */
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { TransparencyPost } from "~/types/transparency";
import {
  TYPE_COLORS,
  TYPE_LABELS_PT,
  formatDate,
  formatPeriod,
} from "./_shared";

interface PostDetailProps {
  post: TransparencyPost;
  isAuthor: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: (p: TransparencyPost) => void;
  onDelete: (postId: number) => void;
}

export function PostDetailView({
  post,
  isAuthor,
  isAdmin,
  onBack,
  onEdit,
  onDelete,
}: PostDetailProps) {
  const period = formatPeriod(post.periodMonth, post.periodYear);
  const isAutoFromInstallment = post.sourceType === "INSTALLMENT_REQUEST";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o feed
      </button>

      <article className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
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
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary"
              title="Este post foi gerado automaticamente quando a solicitacao de repasse foi aprovada. Voce pode editar o texto."
              data-testid="post-source-auto-badge"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Auto: Relatorio de Solicitacao
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-tight">
          {post.title}
        </h1>

        <div className="text-xs text-muted-foreground">
          Publicado em {formatDate(post.publishedAt)}
          {post.author?.nome && ` por ${post.author.nome}`}
        </div>

        {/* Conteudo markdown sanitizado */}
        <div className="prose prose-slate dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:font-black prose-headings:tracking-tighter prose-a:text-primary">
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Anexos */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Anexos ({post.attachments.length})
            </p>
            <ul className="space-y-1">
              {post.attachments.map((a) => (
                <li key={a.uploadId}>
                  {a.upload.url ? (
                    <a
                      href={a.upload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {a.upload.originalName || `Upload #${a.uploadId}`}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {a.upload.originalName || `Upload #${a.uploadId}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Acoes do autor/ADMIN */}
        {(isAuthor || isAdmin) && (
          <div className="border-t border-border pt-4 flex gap-2">
            <button
              onClick={() => onEdit(post)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-red-300 text-red-700 hover:bg-red-50"
            >
              Deletar
            </button>
          </div>
        )}
      </article>
    </div>
  );
}