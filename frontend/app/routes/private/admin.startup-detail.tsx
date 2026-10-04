import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  Hash,
  IdCard,
  KeyRound,
  Landmark,
  Layers,
  Lightbulb,
  Mail,
  Phone,
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { Link, redirect, useLoaderData } from "react-router";
import { AdminStartupHeader } from "~/components/admin/admin-startup-header";
import { DocumentThumbnails } from "~/components/admin/document-thumbnails";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { formatBRLCompact } from "~/lib/currency-format";
import { serverFetch } from "~/lib/server-fetch";
import { ESTAGIO_LABELS, type EstagioStartup } from "~/lib/startup-enums";
import { cn } from "~/lib/utils";

/** Resposta completa de `GET /admin/startups/:id` (Prisma findUnique + include). */
export interface AdminStartupDetail {
  id: number;
  slug: string;
  nome: string;
  razao_social?: string | null;
  cnpj?: string | null;
  site?: string | null;
  telefone?: string | null;
  email?: string | null;
  pais?: unknown;
  redes_sociais?: unknown;
  /** Pitch */
  area_atuacao?: string | null;
  estagio?: string | null;
  descricao?: string | null;
  problema?: string | null;
  solucao?: string | null;
  modelo_receita?: string | null;
  descritivo_basico?: string | null;
  youtube_url?: string | null;
  diferencial?: string | null;
  mercado_alvo?: string | null;
  espera_alcancar?: string | null;
  dedicacao?: string | null;
  compradores?: string | null;
  investimento_previo?: string | null;
  concorrencia?: string | null;
  /** Benefícios / Lucros */
  oferece_lucros?: boolean;
  lucros_descricao?: string | null;
  oferece_beneficios?: boolean;
  beneficios_descricao?: string | null;
  /** Estrutura (JSON) */
  socios?: unknown;
  teams?: unknown;
  uso_recursos?: unknown;
  /** Dados bancários (repasse) */
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  tipo_conta?: string | null;
  pix_key?: string | null;
  titular?: string | null;
  documento_titular?: string | null;
  /** Data de fundação */
  data_fundacao?: string | null;
  /** Status / Score */
  status: string;
  score?: number | null;
  /** Documents (KYCProfile relations) */
  logo?: {
    id: number;
    url?: string | null;
    url_sm?: string | null;
    status?: string | null;
  } | null;
  cover?: {
    id: number;
    url?: string | null;
    url_sm?: string | null;
    status?: string | null;
  } | null;
  mie?: {
    id: number;
    url?: string | null;
    url_sm?: string | null;
    status?: string | null;
  } | null;
  contrato_social?: {
    id: number;
    url?: string | null;
    url_sm?: string | null;
    status?: string | null;
  } | null;
  cnpj_document?: {
    id: number;
    url?: string | null;
    url_sm?: string | null;
    status?: string | null;
  } | null;
  /** Founder */
  founder?: { id: number; nome: string; email: string } | null;
  /** Campaigns */
  campaigns?: Array<{
    id: number;
    title?: string;
    targetAmount?: number;
    minInvestment?: number;
    valuation?: number;
    tokenPrice?: number;
    totalTokens?: number;
    tokensSold?: number;
    status?: string;
    deadline?: string;
    createdAt?: string;
  }>;
  /** Timestamps */
  createdAt: string;
  updatedAt?: string;
}

export function meta(_: { params: { id?: string } }) {
  return [
    { title: "Detalhes da Startup | Admin | iSelfToken" },
    {
      name: "description",
      content: "Visão geral completa da startup para administradores.",
    },
  ];
}

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id?: string };
}): Promise<AdminStartupDetail> {
  const id = params.id;
  if (!id) throw redirect("/admin/startups");

  const response = await serverFetch(
    request,
    `/api/admin/startups/${encodeURIComponent(id)}`,
  );

  if (response.status === 404) throw redirect("/admin/startups");
  if (!response.ok) {
    throw new Response("Falha ao carregar startup", {
      status: response.status,
    });
  }

  const body = await response.json().catch(() => null);
  const data = (body?.data ?? body) as AdminStartupDetail | null;
  if (!data) {
    throw new Response("Resposta inválida do servidor", { status: 502 });
  }
  return data;
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovada",
  PENDING: "Em Análise",
  REJECTED: "Rejeitada",
  PAUSED: "Pausada",
  DRAFT: "Rascunho",
};

const STATUS_VARIANT: Record<string, "primary" | "destructive" | "warning"> = {
  APPROVED: "primary",
  PENDING: "warning",
  REJECTED: "destructive",
  PAUSED: "warning",
  DRAFT: "warning",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnlyFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function AdminStartupDetailPage({
  startup: startupProp,
}: {
  startup?: AdminStartupDetail;
} = {}) {
  const loaderData = useLoaderData() as AdminStartupDetail | undefined;
  const startup = startupProp ?? loaderData;
  if (!startup) return null;

  const founder = startup.founder as
    | { id: number; nome: string; email: string }
    | null
    | undefined;
  const statusLabel = STATUS_LABEL[startup.status] ?? startup.status;
  const statusVariant = STATUS_VARIANT[startup.status] ?? "warning";

  return (
    <main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
      <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
        <DashboardBackgroundWatermark />

        <Link
          to="/admin/startups"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden />
          Voltar à gestão de startups
        </Link>

        <AdminStartupHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-2">
          {/* Coluna principal — 2/3 */}
          <section className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Identidade */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                {startup.logo?.url ? (
                  <img
                    src={startup.logo.url}
                    alt={startup.nome}
                    className="size-16 sm:size-20 rounded-2xl ring-2 ring-primary/20 object-cover shrink-0 self-start sm:self-auto"
                  />
                ) : (
                  <div className="size-16 sm:size-20 rounded-2xl bg-primary/15 ring-2 ring-primary/20 flex items-center justify-center font-black text-2xl text-primary shrink-0 self-start sm:self-auto">
                    {startup.nome.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tighter italic text-foreground break-words">
                    {startup.nome}
                  </h2>
                  {startup.razao_social && (
                    <p className="text-muted-foreground text-sm mt-1 break-words">
                      {startup.razao_social}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    {startup.area_atuacao && (
                      <Badge variant="primary">{startup.area_atuacao}</Badge>
                    )}
                    {startup.score != null && (
                      <Badge variant="primary">Score: {startup.score}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Informações cadastrais */}
            <Card
              title="Informações cadastrais"
              icon={<IdCard className="w-4 h-4" aria-hidden />}
            >
              <InfoRow
                icon={<IdCard className="w-4 h-4" />}
                label="ID interno"
                value={`#${String(startup.id).padStart(6, "0")}`}
              />
              {startup.cnpj && (
                <InfoRow
                  icon={<Building2 className="w-4 h-4" />}
                  label="CNPJ"
                  value={startup.cnpj}
                />
              )}
              {startup.area_atuacao && (
                <InfoRow
                  icon={<Layers className="w-4 h-4" />}
                  label="Área de atuação"
                  value={startup.area_atuacao}
                />
              )}
              {startup.estagio && (
                <InfoRow
                  icon={<Target className="w-4 h-4" />}
                  label="Estágio"
                  value={ESTAGIO_LABELS[startup.estagio as EstagioStartup] ?? startup.estagio}
                />
              )}
              {startup.data_fundacao && (
                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data de fundação"
                  value={safeDateOnly(startup.data_fundacao)}
                />
              )}
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Cadastrada em"
                value={safeDateTime(startup.createdAt)}
              />
            </Card>

            {/* Contato */}
            {(startup.site || startup.telefone || startup.email) && (
              <Card
                title="Contato"
                icon={<Phone className="w-4 h-4" aria-hidden />}
              >
                {startup.site && (
                  <InfoRow
                    icon={<Globe className="w-4 h-4" />}
                    label="Site"
                    value={startup.site}
                    href={startup.site}
                  />
                )}
                {startup.telefone && (
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Telefone"
                    value={startup.telefone}
                  />
                )}
                {startup.email && (
                  <InfoRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={startup.email}
                    href={`mailto:${startup.email}`}
                  />
                )}
              </Card>
            )}

            {/* Dados bancários (repasse) */}
            {Boolean(
              startup.banco ||
              startup.agencia ||
              startup.conta ||
              startup.pix_key ||
              startup.titular,
            ) && (
              <Card
                title="Dados Bancários (Repasse)"
                icon={<Landmark className="w-4 h-4" aria-hidden />}
              >
                {startup.banco && (
                  <InfoRow
                    icon={<Landmark className="w-4 h-4" />}
                    label="Banco"
                    value={startup.banco}
                  />
                )}
                {startup.tipo_conta && (
                  <InfoRow
                    icon={<CreditCard className="w-4 h-4" />}
                    label="Tipo de conta"
                    value={startup.tipo_conta}
                  />
                )}
                {(startup.agencia || startup.conta) && (
                  <InfoRow
                    icon={<Hash className="w-4 h-4" />}
                    label="Agência / Conta"
                    value={[
                      startup.agencia ?? "",
                      [startup.conta ?? "", startup.digito ?? ""]
                        .filter(Boolean)
                        .join("-"),
                    ]
                      .filter((s) => s.length > 0)
                      .join(" · ")}
                  />
                )}
                {startup.pix_key && (
                  <InfoRow
                    icon={<KeyRound className="w-4 h-4" />}
                    label="Chave PIX"
                    value={startup.pix_key}
                  />
                )}
                {startup.titular && (
                  <InfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Titular"
                    value={startup.titular}
                  />
                )}
                {startup.documento_titular && (
                  <InfoRow
                    icon={<IdCard className="w-4 h-4" />}
                    label="Documento do titular"
                    value={startup.documento_titular}
                  />
                )}
              </Card>
            )}

            {/* Fundador */}
            <FounderCard founder={founder} />

            {/* Campanhas */}
            {startup.campaigns?.length ? (
              <Card
                title="Campanhas"
                icon={<Target className="w-4 h-4" aria-hidden />}
              >
                <ul className="space-y-2">
                  {startup.campaigns.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded bg-accent/20 border border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {c.title ?? `Campanha #${c.id}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Status: {c.status ?? "—"}
                        </p>
                      </div>
                      {c.targetAmount != null && (
                        <span className="text-xs font-black text-primary shrink-0">
                          {formatBRLCompact(c.targetAmount)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {/* Pitch — descritivo */}
            {(startup.descricao ||
              startup.problema ||
              startup.solucao ||
              startup.modelo_receita ||
              startup.descritivo_basico ||
              startup.diferencial ||
              startup.mercado_alvo ||
              startup.espera_alcancar ||
              startup.dedicacao ||
              startup.compradores ||
              startup.investimento_previo ||
              startup.concorrencia) && (
              <Card
                title="Pitch & Negócio"
                icon={<Lightbulb className="w-4 h-4" aria-hidden />}
              >
                {startup.descricao && (
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Descrição"
                    value={startup.descricao}
                  />
                )}
                {startup.descritivo_basico && (
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Descritivo básico"
                    value={startup.descritivo_basico}
                  />
                )}
                {startup.problema && (
                  <InfoRow
                    icon={<AlertCircle className="w-4 h-4" />}
                    label="Problema"
                    value={startup.problema}
                  />
                )}
                {startup.solucao && (
                  <InfoRow
                    icon={<Wrench className="w-4 h-4" />}
                    label="Solução"
                    value={startup.solucao}
                  />
                )}
                {startup.modelo_receita && (
                  <InfoRow
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Modelo de receita"
                    value={startup.modelo_receita}
                  />
                )}
                {startup.diferencial && (
                  <InfoRow
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Diferencial"
                    value={startup.diferencial}
                  />
                )}
                {startup.mercado_alvo && (
                  <InfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Mercado-alvo"
                    value={startup.mercado_alvo}
                  />
                )}
                {startup.espera_alcancar && (
                  <InfoRow
                    icon={<Target className="w-4 h-4" />}
                    label="O que espera alcançar"
                    value={startup.espera_alcancar}
                  />
                )}
                {startup.dedicacao && (
                  <InfoRow
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Dedicação do fundador"
                    value={startup.dedicacao}
                  />
                )}
                {startup.compradores && (
                  <InfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Compradores"
                    value={startup.compradores}
                  />
                )}
                {startup.investimento_previo && (
                  <InfoRow
                    icon={<PiggyBank className="w-4 h-4" />}
                    label="Investimento prévio"
                    value={startup.investimento_previo}
                  />
                )}
                {startup.concorrencia && (
                  <InfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Concorrência"
                    value={startup.concorrencia}
                  />
                )}
                {startup.youtube_url && (
                  <InfoRow
                    icon={<Video className="w-4 h-4" />}
                    label="Vídeo pitch"
                    value={startup.youtube_url}
                    href={startup.youtube_url}
                  />
                )}
              </Card>
            )}

            {/* Benefícios & Lucros */}
            {(startup.oferece_lucros ||
              startup.oferece_beneficios ||
              startup.lucros_descricao ||
              startup.beneficios_descricao) && (
              <Card
                title="Benefícios & Lucros"
                icon={<Gift className="w-4 h-4" aria-hidden />}
              >
                {startup.oferece_lucros && (
                  <InfoRow
                    icon={<Trophy className="w-4 h-4" />}
                    label="Oferece lucros"
                    value="Sim"
                  />
                )}
                {startup.lucros_descricao && (
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Descrição dos lucros"
                    value={startup.lucros_descricao}
                  />
                )}
                {startup.oferece_beneficios && (
                  <InfoRow
                    icon={<Gift className="w-4 h-4" />}
                    label="Oferece benefícios"
                    value="Sim"
                  />
                )}
                {startup.beneficios_descricao && (
                  <InfoRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Descrição dos benefícios"
                    value={startup.beneficios_descricao}
                  />
                )}
              </Card>
            )}

            {/* Estrutura — sócios, teams, uso_recursos (JSON) */}
            {Boolean(
              startup.socios || startup.teams || startup.uso_recursos,
            ) && (
              <Card
                title="Estrutura"
                icon={<Users className="w-4 h-4" aria-hidden />}
              >
                {startup.socios != null && (
                  <JsonInfoRow
                    icon={<Users className="w-4 h-4" />}
                    label="Sócios"
                    value={startup.socios}
                  />
                )}
                {startup.teams != null && (
                  <JsonInfoRow
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Times"
                    value={startup.teams}
                  />
                )}
                {startup.uso_recursos != null && (
                  <JsonInfoRow
                    icon={<PiggyBank className="w-4 h-4" />}
                    label="Uso dos recursos"
                    value={startup.uso_recursos}
                  />
                )}
              </Card>
            )}

            {/* Documentos (KYCProfile relations) — miniaturas com modal */}
            {Boolean(
              startup.logo ||
              startup.cover ||
              startup.mie ||
              startup.contrato_social ||
              startup.cnpj_document,
            ) && (
              <Card
                title="Documentos"
                icon={<FileText className="w-4 h-4" aria-hidden />}
              >
                <DocumentThumbnails
                  documents={(
                    [
                      startup.logo?.url
                        ? {
                            label: "Logo",
                            url: startup.logo.url,
                            thumbUrl: startup.logo.url_sm ?? null,
                            kind: "logo" as const,
                          }
                        : null,
                      startup.cover?.url
                        ? {
                            label: "Cover",
                            url: startup.cover.url,
                            thumbUrl: startup.cover.url_sm ?? null,
                            kind: "cover" as const,
                          }
                        : null,
                      startup.mie?.url
                        ? {
                            label: "MIE",
                            url: startup.mie.url,
                            thumbUrl: startup.mie.url_sm ?? null,
                            kind: "doc" as const,
                          }
                        : null,
                      startup.contrato_social?.url
                        ? {
                            label: "Contrato Social",
                            url: startup.contrato_social.url,
                            thumbUrl: startup.contrato_social.url_sm ?? null,
                            kind: "doc" as const,
                          }
                        : null,
                      startup.cnpj_document?.url
                        ? {
                            label: "Cartão CNPJ",
                            url: startup.cnpj_document.url,
                            thumbUrl: startup.cnpj_document.url_sm ?? null,
                            kind: "doc" as const,
                          }
                        : null,
                    ] as Array<{
                      label: string;
                      url: string;
                      thumbUrl: string | null;
                      kind: "logo" | "cover" | "doc";
                    } | null>
                  ).filter((d): d is NonNullable<typeof d> => d !== null)}
                />
              </Card>
            )}

            {/* Campanhas com detalhes */}
            {startup.campaigns?.length ? (
              <Card
                title="Detalhes das Campanhas"
                icon={<Target className="w-4 h-4" aria-hidden />}
              >
                {startup.campaigns.map((c) => (
                  <div
                    key={`campaign-detail-${c.id}`}
                    className="border-b border-white/5 last:border-0 py-3"
                  >
                    <p className="text-sm font-black text-foreground italic">
                      {c.title ?? `Campanha #${c.id}`}
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
                      {c.status && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Status:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {c.status}
                          </span>
                        </p>
                      )}
                      {c.targetAmount != null && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Meta:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatBRLCompact(c.targetAmount)}
                          </span>
                        </p>
                      )}
                      {c.minInvestment != null && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Mín:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatBRLCompact(c.minInvestment)}
                          </span>
                        </p>
                      )}
                      {c.valuation != null && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Valuation:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatBRLCompact(c.valuation)}
                          </span>
                        </p>
                      )}
                      {c.tokenPrice != null && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Preço/token:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {formatBRLCompact(c.tokenPrice)}
                          </span>
                        </p>
                      )}
                      {c.deadline && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            Deadline:{" "}
                          </span>
                          <span className="font-bold text-foreground">
                            {safeDateOnly(c.deadline)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            ) : null}
          </section>

          {/* Coluna lateral — 1/3 */}
          <aside className="space-y-4">
            <Card title="Resumo">
              <div className="space-y-3">
                <StatRow label="Status" value={statusLabel} />
                {startup.area_atuacao && (
                  <StatRow label="Segmento" value={startup.area_atuacao} />
                )}
                {startup.estagio && (
                  <StatRow
                    label="Estágio"
                    value={ESTAGIO_LABELS[startup.estagio as EstagioStartup] ?? startup.estagio}
                  />
                )}
                {startup.score != null && (
                  <StatRow
                    label="Score marketplace"
                    value={String(startup.score)}
                  />
                )}
                {startup.data_fundacao && (
                  <StatRow
                    label="Fundada em"
                    value={safeDateOnly(startup.data_fundacao)}
                  />
                )}
                <StatRow
                  label="Campanhas"
                  value={String(startup.campaigns?.length ?? 0)}
                />
                {startup.cnpj && (
                  <StatRow label="CNPJ" value={maskCnpj(startup.cnpj)} />
                )}
              </div>
            </Card>

            <Card title="Detalhes avançados">
              <Link
                to={`/compliance/startups/${startup.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Perfil completo (Compliance)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    7 abas: documentos, KYC, campanhas, fundadores, audit, etc
                  </p>
                </div>
                <ExternalLink
                  className="w-3 h-3 text-muted-foreground group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

// --- Sub-components ---

function FounderCard({
  founder,
}: {
  founder: { id: number; nome: string; email: string } | null | undefined;
}) {
  if (!founder) return null;

  return (
    <Card title="Fundador" icon={<Sparkles className="w-4 h-4" aria-hidden />}>
      <InfoRow
        icon={<Sparkles className="w-4 h-4" />}
        label="Nome"
        value={founder.nome}
      />
      <InfoRow
        icon={<Mail className="w-4 h-4" />}
        label="Email"
        value={founder.email}
      />
      <InfoRow
        icon={<IdCard className="w-4 h-4" />}
        label="ID do fundador"
        value={`#${String(founder.id).padStart(6, "0")}`}
      />
    </Card>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-8 space-y-4 sm:space-y-6">
      {title && (
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "primary" | "destructive" | "warning";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
        variant === "primary"
          ? "bg-primary/10 text-primary border-primary/20"
          : variant === "destructive"
            ? "bg-destructive/10 text-destructive border-destructive/20"
            : "bg-warning/10 text-warning border-warning/20",
      )}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-primary/70 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline break-words"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

/** InfoRow para valores JSON (serializa como JSON formatado). */
function JsonInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: unknown;
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);
  return (
    <div className="flex items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-primary/70 shrink-0 mt-1">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words max-h-40 overflow-auto">
          {display}
        </pre>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function safeDateTime(d: string): string {
  try {
    return dateFmt.format(new Date(d));
  } catch {
    return d;
  }
}

function safeDateOnly(d: string): string {
  try {
    return dateOnlyFmt.format(new Date(d));
  } catch {
    return d;
  }
}

/**
 * Formata o CNPJ completo (00.000.000/0000-00) para exibição no admin.
 * Admin/compliance visualizam o documento integral (sem máscara).
 */
function maskCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
