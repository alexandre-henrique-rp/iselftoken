/**
 * FeaturedReportCard: Post Principal Vigente (TRANSP-03).
 *
 * Renderizado APENAS se GET /api/transparency/featured/:startupId retornar
 * 200 com post. Se 204 / null, NAO renderiza nada (sem placeholder).
 */
import { useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useTransparencyFeaturedReport } from "~/hooks/use-transparency-featured-report";
import {
  TYPE_COLORS,
  TYPE_LABELS_PT,
  formatDate,
  formatPeriod,
} from "./_shared";
import { PostEditorView } from "./post-editor";
import { useDeleteTransparencyPost } from "~/hooks/use-transparency-mutations";

interface FeaturedReportCardProps {
  startupId: number;
  isAuthor: boolean;
  isAdmin: boolean;
  userId: number | null;
}

export function FeaturedReportCard({
  startupId,
  isAuthor,
  isAdmin,
  userId: _userId,
}: FeaturedReportCardProps) {
  const { data: post, isLoading } = useTransparencyFeaturedReport(startupId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteTransparencyPost(startupId, {});

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // SEM post vigente => nao renderiza nada (sem placeholder, conforme DEC).
  if (!post) return null;

  if (editing) {
    return (
      <PostEditorView
        startupId={startupId}
        startupNome=""
        post={post}
        isSubmitting={false}
        onClose={() => setEditing(false)}
        onSubmit={() => setEditing(false)}
      />
    );
  }

  const period = formatPeriod(post.periodMonth, post.periodYear);
  const canManage = isAuthor || isAdmin;

  return (
    <article className="bg-gradient-to-br from-primary/5 to-card border-2 border-primary/30 rounded-2xl p-6 md:p-8 space-y-4 relative">
      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
        Post vigente
      </div>

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
      </div>

      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-tight">
        {post.title}
      </h2>

      <div className="text-xs text-muted-foreground">
        Publicado em {formatDate(post.publishedAt)}
        {post.author?.nome && ` por ${post.author.nome}`}
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:font-black prose-headings:tracking-tighter prose-a:text-primary line-clamp-6">
        <ReactMarkdown
          rehypePlugins={[rehypeSanitize]}
          remarkPlugins={[remarkGfm]}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      {canManage && (
        <div className="border-t border-border pt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-red-300 text-red-700 hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-black">Excluir post vigente?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta acao remove o post em destaque. Quer continuar?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(post.id, {
                    onSuccess: () => setConfirmDelete(false),
                  });
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-red-600 text-white hover:opacity-90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back-arrow hidden visual hint for tree-shake */}
      <span className="hidden">
        <ArrowLeft className="w-4 h-4" />
      </span>
    </article>
  );
}