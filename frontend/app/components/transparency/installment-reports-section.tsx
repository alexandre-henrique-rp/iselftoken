/**
 * InstallmentReportsSection (FIN-09 + FIN-11 §8.2).
 *
 * Secao dedicada na aba "Atualizacoes" da /founder/startups/:id/transparencia
 * que lista todos os auto-posts gerados a partir de InstallmentRequest
 * APROVADA. Aparece ACIMA do feed manual de atualizacoes.
 *
 * Cada card mostra:
 * - Badge "Relatorio de Solicitacao" + parcela X/N
 * - Valor em BRL
 * - Periodo (mes/ano) do post
 * - Conteudo (markdown sanitizado, preview com line-clamp)
 * - Botao "Ver solicitacao original" → /founder/campaigns/:id/financeiro
 *
 * LGPD: nenhum dado pessoal/bancario vaza (conteudo vem do auto-post
 * que ja passou pelo transparency-auto-post.service.ts com filtro LGPD).
 */
import { ArrowUpRight, Calendar, CircleDollarSign, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useTransparencyInstallmentPosts } from "~/hooks/use-transparency-installment-posts";
import { formatBRLCompact, formatCurrencyBRL } from "~/lib/currency-format";
import { formatDateOnlyBR } from "~/lib/date-utils";
import { cn } from "~/lib/utils";
import type { TransparencyPost } from "~/types/transparency";
import {
  TYPE_COLORS,
  TYPE_LABELS_PT,
  formatDate,
  formatPeriod,
} from "./_shared";

export interface InstallmentReportsSectionProps {
  startupId: number | string;
  /** Limite de cards visiveis (default 6 = grid 3x2). */
  visibleLimit?: number;
  /** Link para a solicitacao original (admin/founder). */
  buildRequestLink?: (post: TransparencyPost) => string;
}

function extractParcelaFromTitle(title: string): {
  numero: number | null;
  total: number | null;
  valor: number | null;
} {
  // Formato esperado: "Solicitacao de Repasse aprovada - Parcela X/N"
  const match = title.match(/Parcela\s+(\d+)\/(\d+)/i);
  if (!match) return { numero: null, total: null, valor: null };
  return { numero: Number(match[1]), total: Number(match[2]), valor: null };
}

function ReportCard({
  post,
  buildRequestLink,
}: {
  post: TransparencyPost;
  buildRequestLink?: (post: TransparencyPost) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = extractParcelaFromTitle(post.title);
  const valorReais = (() => {
    // Tenta extrair "Valor: R$ X,XX" do content markdown
    const m = post.content.match(/\*\*Valor:\*\*\s*R\$\s*([\d.,]+)/i);
    if (!m) return null;
    return Number(m[1].replace(/\./g, "").replace(",", "."));
  })();

  const period = formatPeriod(post.periodMonth, post.periodYear);
  const requestLink = buildRequestLink?.(post);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5 space-y-3",
        "border-primary/30 hover:border-primary/50 transition",
        "bg-gradient-to-br from-primary/[0.04] to-card/60",
        "shadow-[0_0_24px_rgba(213,0,249,0.06)]",
      )}
      data-testid={`installment-report-card-${post.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
              <FileText className="h-2.5 w-2.5" /> Relatorio da Solicitacao
            </span>
            {parsed.numero !== null && parsed.total !== null && (
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Parcela {parsed.numero}/{parsed.total}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-black tracking-tight text-foreground line-clamp-2">
            {post.title}
          </h3>
        </div>
        {period && (
          <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {period}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
          <div className="flex flex-col">
            <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Valor
            </dt>
            <dd className="font-black tabular-nums text-foreground">
              {valorReais !== null ? formatCurrencyBRL(valorReais) : "—"}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <div className="flex flex-col">
            <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Publicado
            </dt>
            <dd className="font-bold text-foreground">
              {formatDate(post.publishedAt)}
            </dd>
          </div>
        </div>
      </dl>

      <div
        className={cn(
          "prose prose-slate dark:prose-invert max-w-none prose-xs prose-headings:font-black prose-headings:tracking-tighter prose-a:text-primary prose-a:no-underline",
          expanded ? "" : "line-clamp-6",
        )}
      >
        <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
          data-testid={`installment-report-toggle-${post.id}`}
        >
          {expanded ? "Recolher" : "Expandir"}
        </button>
        {requestLink && (
          <Link
            to={requestLink}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black"
            data-testid={`installment-report-link-${post.id}`}
          >
            Ver solicitacao original
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function InstallmentReportsSection({
  startupId,
  visibleLimit = 6,
  buildRequestLink,
}: InstallmentReportsSectionProps) {
  const { posts, total, isLoading, isError } = useTransparencyInstallmentPosts(
    startupId,
    { limit: 50 },
  );

  if (isLoading) {
    return (
      <section
        className="space-y-3"
        data-testid="installment-reports-section"
        data-loading="true"
      >
        <header className="flex items-center gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Relatorios de Solicitacoes
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
        data-testid="installment-reports-section-error"
      >
        <p className="text-xs font-bold text-destructive">
          Nao foi possivel carregar os relatorios de solicitacoes.
        </p>
      </section>
    );
  }

  const visible = posts.slice(0, visibleLimit);
  const hidden = total - visible.length;

  return (
    <section
      className="space-y-3"
      data-testid="installment-reports-section"
      data-total={total}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Relatorios de Solicitacoes
          </h2>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {total}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Auto-gerados a partir das parcelas aprovadas.
        </p>
      </header>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhum relatorio de solicitacao publicado ainda. Eles aparecerao
            aqui apos as primeiras parcelas serem aprovadas pelo financeiro.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((post) => (
              <ReportCard
                key={post.id}
                post={post}
                buildRequestLink={buildRequestLink}
              />
            ))}
          </div>
          {hidden > 0 && (
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Mostrando {visible.length} de {total} relatorios. Role o feed
              abaixo para ver as atualizacoes manuais.
            </p>
          )}
        </>
      )}
    </section>
  );
}