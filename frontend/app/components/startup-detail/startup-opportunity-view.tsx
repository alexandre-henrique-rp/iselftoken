import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  FileText,
  Lock,
  Pencil,
  Play,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Footer } from "~/components/landing/footer";
import { Navbar } from "~/components/landing/navbar";
import { InvestmentSidebar } from "~/components/startup-detail/investment-sidebar";
import { TeamSection } from "~/components/startup-detail/team-section";
import { SealsRow } from "~/components/marketplace/category-visual";
import { InitialsImage } from "~/components/ui/initials-image";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { useUser } from "~/hooks/use-user";
import { usePlan } from "~/hooks/use-plan";
import type {
  StartupPrivateOpportunity,
  StartupPublicOpportunity,
} from "~/types/startup-opportunity-detail";

interface PublicProps {
  mode: "public" | "preview";
  startup: StartupPublicOpportunity;
  affiliateCode?: string | null;
  preview?: boolean;
}

interface PrivateProps {
  mode: "private";
  startup: StartupPrivateOpportunity;
  affiliateCode?: string | null;
  /**
   * Quando `true`, renderiza banner "Modo preview" e desabilita o CTA de
   * investir. Usado em `/startup/:slug/preview` para o founder visualizar
   * a página como ela aparecerá para investidores, sem permitir ações.
   */
  preview?: boolean;
}

type StartupOpportunityViewProps = PublicProps | PrivateProps;

export function StartupOpportunityNotFound({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const withPublicShell = !authenticated;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {withPublicShell && <Navbar />}
      <main
        className={
          withPublicShell
            ? "flex min-h-[70vh] items-center justify-center px-3 pb-12 pt-20"
            : "flex min-h-[60vh] items-center justify-center px-4 py-12"
        }
      >
        <div className="w-full max-w-xl space-y-5 text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Startup não encontrada
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta startup não existe, não está disponível para captação ou a
            rodada foi encerrada.
          </p>
          <Link
            to={authenticated ? "/home" : "/"}
            className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            {authenticated ? "Voltar ao marketplace" : "Ver oportunidades"}
          </Link>
        </div>
      </main>
      {withPublicShell && <Footer />}
    </div>
  );
}

export function StartupOpportunityView({
  mode,
  startup,
  affiliateCode = null,
  preview = false,
}: StartupOpportunityViewProps) {
  const withPublicShell = mode !== "private" || preview;
  const isPreview = preview;
  const privateStartup = mode === "private" ? startup : null;
  const areaLabels = Array.from(
    new Set(
      [
        startup.category,
        ...(startup.areasAtuacao ?? []).map((area) => area.nome),
      ].filter((label): label is string => Boolean(label?.trim())),
    ),
  );
  if (!startup.areasAtuacao?.length && startup.stage) {
    areaLabels.push(startup.stage);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {withPublicShell && <Navbar />}

      <main className={withPublicShell ? "pb-12 pt-20" : "pb-12 pt-3"}>
        <div className="mx-auto w-full max-w-7xl space-y-8 px-3 md:px-5 lg:px-6">
          {isPreview && <PreviewToolbar startup={startup} />}
          {mode === "public" && (
            <PublicTopNotice
              slug={startup.slug}
              affiliateCode={affiliateCode}
            />
          )}

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-card">
            <div className="relative h-40 bg-accent/30 md:h-56">
              {startup.cover ? (
                <img
                  src={startup.cover}
                  alt={`Capa da ${startup.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 via-card to-background" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            </div>

            <div className="relative -mt-14 flex flex-col gap-5 px-4 pb-5 md:-mt-20 md:flex-row md:items-end md:px-6">
              <InitialsImage
                name={startup.name}
                src={startup.logo}
                alt={startup.name}
                className="h-28 w-28 shrink-0 rounded-2xl border-4 border-card md:h-40 md:w-40"
                fallbackClassName="bg-primary/10"
                fallbackTextClassName="text-3xl font-black text-primary md:text-5xl"
              />
              <div className="min-w-0 flex-1 pb-1">
                <div className="mb-2 flex flex-wrap items-center gap-2" aria-label="Categoria e áreas de atuação">
                  {areaLabels.length > 0 ? areaLabels.map((label, index) => (
                    <span
                      key={label}
                      className={index === 0
                        ? "rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary"
                        : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"}
                    >
                      {label}
                    </span>
                  )) : (
                    <span className="text-xs font-medium text-muted-foreground">Startup</span>
                  )}
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  {startup.name}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {startup.description ||
                    "Oportunidade de investimento em startup."}
                </p>
                {startup.seals?.length ? (
                  <SealsRow
                    seals={startup.seals}
                    size={36}
                    max={6}
                    className="mt-3"
                  />
                ) : null}
              </div>
            </div>
          </section>

          <div
            className={
              privateStartup
                ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
                : "space-y-8"
            }
          >
            <div className="min-w-0 space-y-8">
              <PitchSection
                name={startup.name}
                youtubeUrl={startup.youtubeUrl}
                videoFileUrl={startup.pitchVideoUrl}
                deckUrl={startup.pitchDeckUrl}
                showDeck={mode !== "private"}
              />

              {mode === "private" ? (
                <>
                  <PitchDeckSection deckUrl={startup.pitchDeckUrl} />
                  <PublicStartupDetails startup={startup} />
                </>
              ) : (
                <>
                  <PublicCampaignSection
                    startup={startup as StartupPublicOpportunity}
                  />
                  <PublicStartupDetails startup={startup} />
                </>
              )}

              {privateStartup && <PrivateContent />}

              <TeamSection socios={startup.socios} teams={startup.teams} />
            </div>

            {privateStartup && (
              <InvestmentSidebar
                raised={privateStartup.campaign.raised}
                goal={privateStartup.campaign.goal}
                valuation={privateStartup.metrics.valuation}
                percentage={privateStartup.campaign.percentage}
                remainingDays={privateStartup.campaign.remainingDays}
                equity={privateStartup.campaign.equity}
                startupName={privateStartup.name}
                startupLogo={privateStartup.logo}
                startupDescription={privateStartup.description}
                investment={privateStartup.investment}
                affiliateCode={affiliateCode}
                preview={preview}
              />
            )}
          </div>

          {mode === "public" && (
            <PublicAccessCta
              slug={startup.slug}
              affiliateCode={affiliateCode}
            />
          )}
          {isPreview && <PreviewFooter />}
        </div>
      </main>

      {withPublicShell && <Footer />}
    </div>
  );
}

function PreviewToolbar({
  startup,
}: {
  startup:
    | StartupPrivateOpportunity
    | (StartupPublicOpportunity & { id?: number });
}) {
  const [copied, setCopied] = useState(false);

  function copyPublicUrl() {
    const url = `${window.location.origin}/startup/${startup.slug}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        toast.success("URL pública copiada");
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Não foi possível copiar a URL"),
    );
  }

  const editPath =
    startup.id != null
      ? `/founder/startups/${startup.id}/edit`
      : "/founder/dashboard";

  return (
    <div className="sticky top-3 z-40 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 shadow-[0_8px_24px_rgba(213,0,249,0.15)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-primary">
            Modo preview · {startup.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Você está vendo esta página como ela aparece para investidores.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/founder/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground transition hover:bg-accent"
        >
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        <Link
          to={editPath}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground transition hover:bg-accent"
        >
          <Pencil className="h-3 w-3" /> Editar
        </Link>
        <button
          type="button"
          onClick={copyPublicUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/30"
        >
          <Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar URL"}
        </button>
      </div>
    </div>
  );
}

function PublicTopNotice({
  slug,
  affiliateCode,
}: {
  slug: string;
  affiliateCode?: string | null;
}) {
  const privatePath = `/marketplace/startup/${slug}${
    affiliateCode ? `?ref=${encodeURIComponent(affiliateCode)}` : ""
  }`;
  const redirect = encodeURIComponent(privatePath);

  return (
    <div className="sticky top-3 z-40 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-primary" />
        <span>
          <span className="font-black uppercase tracking-widest text-primary">
            Versão pública.
          </span>{" "}
          Faça login para acessar detalhes completos e investir.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/login?redirect=${redirect}`}
          className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
        >
          Entrar
        </Link>
        <Link
          to={`/register?redirect=${redirect}`}
          className="inline-flex items-center rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/10"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}

function PitchSection({
  name,
  youtubeUrl,
  videoFileUrl,
  deckUrl,
  showDeck = true,
}: {
  name: string;
  youtubeUrl: string | null;
  videoFileUrl: string | null;
  deckUrl: string | null;
  showDeck?: boolean;
}) {
  const hasVideo = Boolean(youtubeUrl || videoFileUrl);
  const hasDeck = showDeck && Boolean(deckUrl);
  const hasAny = hasVideo || hasDeck;

  return (
    <>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          <Play className="h-4 w-4 text-primary" /> Vídeo de apresentação
        </h2>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
          {youtubeUrl ? (
            <iframe
              src={getYoutubeEmbedUrl(youtubeUrl)}
              title={`Vídeo de apresentação — ${name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          ) : videoFileUrl ? (
            <video
              src={videoFileUrl}
              controls
              preload="metadata"
              className="absolute inset-0 h-full w-full bg-black object-contain"
            >
              <track kind="captions" />
              Seu navegador não suporta a tag de vídeo.
            </video>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-card to-background text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Play className="h-5 w-5" />
              </span>
              <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Vídeo de pitch ainda não publicado
              </p>
              <p className="max-w-sm text-xs text-muted-foreground/70">
                O founder ainda não cadastrou um vídeo de apresentação para esta
                startup. Assim que for publicado, aparecerá aqui.
              </p>
            </div>
          )}
        </div>
      </section>

      {hasDeck && <PitchDeckSection deckUrl={deckUrl} />}

      {!hasAny && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground/70">
            Nenhum material de pitch publicado ainda.
          </p>
        </section>
      )}
    </>
  );
}

function PitchDeckSection({ deckUrl }: { deckUrl: string | null }) {
  if (!deckUrl) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        <FileText className="h-4 w-4 text-primary" /> Pitch deck
      </h2>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card">
        <PdfCanvasViewer url={deckUrl} title="Leitura do pitch deck" />
        <div className="flex items-center justify-between gap-3 border-t border-white/10 p-3">
          <p className="text-xs text-muted-foreground">
            Visualização integrada do documento PDF.
          </p>
          <a
            href={deckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
          >
            <Download className="h-3 w-3" /> Abrir PDF
          </a>
        </div>
      </div>
    </section>
  );
}

function PdfCanvasViewer({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    let destroyPdf: (() => void) | undefined;

    async function renderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const sourceUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
        const loadingTask = pdfjs.getDocument({ url: sourceUrl });
        const pdfDocument = await loadingTask.promise;
        destroyPdf = () => {
          void loadingTask.destroy();
        };
        if (cancelled || !containerRef.current || !pagesRef.current) return;

        const container = containerRef.current;
        const pages = pagesRef.current;
        pages.replaceChildren();
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
          const page = await pdfDocument.getPage(pageNumber);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(
            1.5,
            Math.max(0.75, container.clientWidth / baseViewport.width),
          );
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "mx-auto mb-4 block max-w-full bg-white shadow-lg";
          pages.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform:
              outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : undefined,
          }).promise;
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void renderPdf();
    return () => {
      cancelled = true;
      pagesRef.current?.replaceChildren();
      destroyPdf?.();
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      role="document"
      aria-label={title}
      aria-busy={status === "loading"}
      className="min-h-[560px] max-h-[min(80vh,900px)] overflow-y-auto bg-neutral-900 p-3 md:p-5"
    >
      <div ref={pagesRef} />
      {status === "loading" && (
        <p className="py-16 text-center text-xs text-muted-foreground">
          Carregando pitch deck...
        </p>
      )}
      {status === "error" && (
        <p className="py-16 text-center text-xs text-destructive">
          Não foi possível renderizar o pitch deck. Use “Abrir PDF” para
          visualizar o arquivo.
        </p>
      )}
    </div>
  );
}

function PublicStartupDetails({
  startup,
}: {
  startup: StartupPublicOpportunity | StartupPrivateOpportunity;
}) {
  // Programa de afiliados: a comissão só é visível para quem tem plano de
  // afiliado ativo (slug "plano-afiliado") — informação comercial restrita.
  const { user } = useUser();
  const { plans } = usePlan(user);
  const isAffiliate = plans.some((p) => p.slug.includes("afiliado"));

  const links = startup.socialLinks ?? {};
  const socialEntries = [
    ["Site", startup.website ?? links.website],
    ["LinkedIn", links.linkedin],
    ["Instagram", links.instagram],
    ["X / Twitter", links.twitter],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  // Agrupa os campos pelos tópicos do wizard de captação:
  // /captacao/tese, /captacao/governanca, /captacao/retornos, /captacao/recursos.
  const detailGroups: Array<{
    title: string;
    items: Array<[string, string]>;
  }> = [
    {
      title: "Tese de negócios",
      items: [
        ["Resumo", startup.descritivoBasico],
        ["Objetivo da captação", startup.objetivoCaptacao],
        ["O problema", startup.problema],
        ["A solução", startup.solucao],
        ["Diferencial competitivo", startup.diferencial],
        ["Modelo de receita", startup.modeloReceita],
        ["Mercado-alvo", startup.mercadoAlvo],
      ],
    },
    {
      title: "Governança & operação",
      items: [
        [
          "Sócios/fundadores",
          startup.sociosCount != null
            ? String(startup.sociosCount)
            : undefined,
        ],
        ["Dedicação", startup.dedicacao],
        ["Compradores potenciais", startup.compradores],
        ["Investimento prévio", startup.investimentoPrevio],
        ["Concorrência", startup.concorrencia],
      ],
    },
    {
      title: "Retornos & benefícios",
      items: [
        [
          "Participação nos lucros",
          startup.participacaoLucros == null
            ? undefined
            : startup.participacaoLucros
              ? "Sim"
              : "Não",
        ],
        ["Política de lucros", startup.politicaLucros],
        [
          "Faturamento mínimo para lucros",
          startup.faturamentoMinimoLucros != null
            ? String(startup.faturamentoMinimoLucros)
            : undefined,
        ],
        [
          "Benefícios adicionais",
          startup.beneficiosDescricao ||
            (startup.beneficiosAdicionais == null
              ? undefined
              : startup.beneficiosAdicionais
                ? "Sim"
                : "Não"),
        ],
        [
          "Programa de afiliados",
          isAffiliate
            ? Number(startup.affiliateCommissionPct ?? 0) > 0
              ? `Sim — comissão de ${Number(startup.affiliateCommissionPct)}%`
              : "Não"
            : undefined,
        ],
      ],
    },
    {
      title: "Uso dos recursos",
      items: [["O que esperamos alcançar", startup.esperaAlcancar]],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (entry): entry is [string, string] => Boolean(entry[1]),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const hasResources = Boolean(startup.usoRecursos?.length);
  if (!socialEntries.length && !detailGroups.length && !hasResources) {
    return null;
  }

  return (
    <section className="space-y-4">
      {socialEntries.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-card p-4 md:p-5">
          <SectionHeading title="Redes e links oficiais" />
          <div className="mt-4 flex flex-wrap gap-3">
            {socialEntries.map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {(detailGroups.length > 0 || hasResources) && (
        <div className="rounded-2xl border border-white/10 bg-card p-4 md:p-5">
          <SectionHeading title="Tese e plano da rodada" />
          <div className="mt-4 min-w-0 space-y-6">
            {detailGroups.map((group, groupIndex) => (
              <div
                key={group.title}
                className={
                  groupIndex > 0
                    ? "border-t border-white/10 pt-5"
                    : undefined
                }
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  {group.title}
                </p>
                <div className="mt-3 grid gap-4">
                  {group.items.map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-background/30 p-3"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                        {label}
                      </p>
                      <div className="mt-2 border-l-2 border-primary/40 pl-3">
                        <p className="break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {group.title === "Uso dos recursos" && hasResources && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {startup.usoRecursos?.map((resource) => (
                      <div
                        key={`${resource.category ?? resource.descricao}-${resource.percentual}`}
                        className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-sm"
                      >
                        <span>{resource.category ?? resource.descricao}</span>
                        <span className="font-bold text-primary">
                          {resource.percentual}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Alocações mesmo quando "O que esperamos alcançar" está vazio */}
            {!detailGroups.some((g) => g.title === "Uso dos recursos") &&
              hasResources && (
                <div className="border-t border-white/10 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    Uso dos recursos
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {startup.usoRecursos?.map((resource) => (
                      <div
                        key={`${resource.category ?? resource.descricao}-${resource.percentual}`}
                        className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-sm"
                      >
                        <span>{resource.category ?? resource.descricao}</span>
                        <span className="font-bold text-primary">
                          {resource.percentual}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </section>
  );
}

function PublicCampaignSection({
  startup,
}: {
  startup: StartupPublicOpportunity;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-card p-4 md:p-5">
      <SectionHeading title="Campanha ativa" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Meta" value={formatCurrencyBRL(startup.campaign.goal)} />
        <Metric
          label="Valuation"
          value={formatCurrencyBRL(startup.campaign.valuation)}
        />
        <Metric
          label="Captado"
          value={formatCurrencyBRL(startup.campaign.raised)}
        />
        <Metric
          label="Equity"
          value={
            startup.campaign.equity == null
              ? "—"
              : `${startup.campaign.equity}%`
          }
        />
        <Metric label="Progresso" value={`${startup.campaign.percentage}%`} />
      </div>
      <Progress value={startup.campaign.percentage} />
    </section>
  );
}

function PrivateContent() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <TextCard
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        title="Análise da oportunidade"
        text="Consulte os dados da campanha, os documentos autorizados e os riscos antes de investir."
      />
      <TextCard
        icon={<ShieldCheck className="h-4 w-4 text-primary" />}
        title="Oferta auditada"
        text="A disponibilidade e os valores da rodada são validados pelo backend no momento do investimento."
      />
    </section>
  );
}

function PublicAccessCta({
  slug,
  affiliateCode,
}: {
  slug: string;
  affiliateCode?: string | null;
}) {
  const privatePath = `/marketplace/startup/${slug}${
    affiliateCode ? `?ref=${encodeURIComponent(affiliateCode)}` : ""
  }`;
  const redirect = encodeURIComponent(privatePath);
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center md:p-6">
      <Lock className="mx-auto h-6 w-6 text-primary" />
      <h2 className="mt-3 text-xl font-black">
        Quer analisar a oportunidade completa?
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Faça login ou crie sua conta para acessar os detalhes privados e
        investir com segurança.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to={`/register?redirect=${redirect}`}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Criar conta
        </Link>
        <Link
          to={`/login?redirect=${redirect}`}
          className="rounded-lg border border-primary/40 px-5 py-3 text-sm font-bold text-primary hover:bg-primary/10"
        >
          Já tenho conta
        </Link>
      </div>
    </section>
  );
}

function PreviewFooter() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      As ações de investimento ficam disponíveis somente no marketplace
      autenticado.
    </p>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
      {title}
    </h2>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-black text-foreground md:text-lg">
        {value}
      </p>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progresso da captação</span>
        <span className="font-bold text-primary">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function TextCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-white/10 bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        {icon}
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </article>
  );
}

function getYoutubeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}?rel=0`;
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.pathname.includes("/embed/")
        ? parsed.pathname.split("/embed/")[1]?.split(/[?/]/)[0]
        : parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
  } catch {
    return url;
  }
  return url;
}
