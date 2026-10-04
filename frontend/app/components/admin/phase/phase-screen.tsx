import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Coins,
  FileCheck,
  Handshake,
  IdCard,
  Image as ImageIcon,
  ImageOff,
  Landmark,
  Lightbulb,
  PencilLine,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { PhaseHeader } from "~/components/admin/phase/phase-header";
import { PaymentReceipt } from "~/components/admin/phase/payment-receipt";

/** Format ISO date as dd/mm/yyyy (pt-BR). */
function formatBRDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    // Usa UTC: a data de fundação é armazenada como meia-noite UTC
    // (ex: 2018-01-01T00:00:00Z). Sem timeZone:"UTC", o fuso local (BRT −03)
    // recuava para 31/12/2017. Fixar UTC preserva o dia correto.
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}
import {
  computeChangedFields,
  useLatestReviewDecision,
} from "~/hooks/use-latest-review-decision";
import {
  WizardDataCard,
  type WizardField,
} from "~/components/admin/phase/wizard-data-card";
import { PhaseApprovalActions } from "~/components/admin/phase/phase-approval-actions";
import { PhaseDocuments } from "~/components/admin/phase/phase-documents";
import { adminStartupPaymentStatusQueryOptions } from "~/lib/queries";
import { formatBRLCompact } from "~/lib/currency-format";

/** Subconjunto do detalhe admin usado pelas páginas de fase. */
export interface PhaseStartup {
  id: number;
  nome: string;
  status: string;
  // Identidade
  razao_social?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  area_atuacao?: string | null;
  // Taxonomia "Tipo de Startup" (cascata) — relações Category/AreaAtuacao.
  categoryRel?: { id: number; nome: string; slug?: string } | null;
  areaAtuacaoRel?: { id: number; nome: string; slug?: string } | null;
  estagio?: string | null;
  descricao?: string | null;
  descritivo_basico?: string | null;
  data_fundacao?: string | null; // ISO date — data de abertura do CNPJ
  pais?: unknown; // JSON: {iso3, name, emoji}
  redes_sociais?: unknown; // JSON com linkedin (e outras redes)
  youtube_url?: string | null; // videoPitch
  // Midia
  logo_id?: number | null;
  pitch_deck_id?: number | null;
  cover_id?: number | null;
  logo?: { url?: string | null; url_sm?: string | null; url_md?: string | null } | null;
  pitch_deck?: { url?: string | null; url_sm?: string | null } | null;
  cover?: { url?: string | null; url_sm?: string | null } | null;
  // Bancario
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  tipo_conta?: string | null;
  pix_key?: string | null;
  titular?: string | null;
  documento_titular?: string | null;
  // CVM / Tese (preenchidos na captacao)
  problema?: string | null;
  solucao?: string | null;
  modelo_receita?: string | null;
  diferencial?: string | null;
  mercado_alvo?: string | null;
  espera_alcancar?: string | null;
  dedicacao?: string | null;
  compradores?: string | null;
  investimento_previo?: string | null;
  concorrencia?: string | null;
  socios?: unknown;
  teams?: unknown;
  uso_recursos?: unknown;
  oferece_lucros?: boolean | null;
  lucros_descricao?: string | null;
  oferece_beneficios?: boolean | null;
  beneficios_descricao?: string | null;
  documents?: Array<{
    id: number;
    categoria: string;
    nome: string;
    mimetype: string;
    sizeBytes: number;
    url: string | null;
    reviewStatus?: string;
    reviewNote?: string | null;
    naoSeAplica?: boolean;
  }> | null;
  documentNAs?: Array<{
    id: number;
    categoria: string;
    justificativa: string;
    reviewStatus?: string;
    reviewNote?: string | null;
  }> | null;
  /** Termo de Adesão assinado (PKI) — metadados de exibição. */
  signedDocuments?: Array<{
    id: string;
    type: string;
    templateVersion?: string | null;
    documentHash?: string | null;
    signatureFounderAt?: string | null;
    signatureStartupAt?: string | null;
    createdAt?: string | null;
  }> | null;
  campaigns?: Array<{
    targetAmount?: number | string | null;
    valuation?: number | string | null;
    tokenPrice?: number | string | null;
    totalTokens?: number | null;
    affiliateCommissionPct?: number | string | null;
    status?: string | null;
    // Tese / pitch
    problema?: string | null;
    solucao?: string | null;
    modeloReceita?: string | null;
    diferencial?: string | null;
    mercadoAlvo?: string | null;
    // Metas / CVM
    oQueEsperaAlcancar?: string | null;
    objetivoCaptacao?: string | null;
    // Governança / operação
    sociosCount?: number | null;
    dedicacao?: string | null;
    compradores?: string | null;
    investimentoPrevio?: string | null;
    concorrencia?: string | null;
    // Lucros / benefícios
    participacaoLucros?: boolean | null;
    politicaLucros?: string | null;
    faturamentoMinimoLucros?: number | string | null;
    beneficiosAdicionais?: boolean | null;
    beneficiosDescricao?: string | null;
    // Alocação de recursos (D8)
    resources?: Array<{
      categoria: string;
      percentual: number;
      descricaoCustomizada?: string | null;
    }> | null;
  }> | null;
}

/**
 * Formata o CNPJ completo (00.000.000/0000-00) para exibição no admin.
 * O admin/compliance precisa ver o documento integral — sem mascarar dígitos.
 */
function formatCnpj(cnpj?: string | null): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj; // fallback: mostra como veio
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/** Rótulos amigáveis das categorias de alocação de recursos (D8). */
const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  FUNDADOR: "Fundador",
  DESENVOLVIMENTO: "Desenvolvimento",
  COMERCIAL: "Comercial (Equipe)",
  MARKETING: "Marketing",
  NUVEM: "Nuvem / Infra",
  JURIDICO: "Jurídico",
  RESERVA_CAIXA: "Reserva de Caixa",
  CUSTOMIZADO: "Customizado",
};

function boolLabel(v: boolean | null | undefined): string {
  if (v == null) return "";
  return v ? "Sim" : "Não";
}

function brl(v: unknown): string {
  const n = num(v);
  return n != null ? formatBRLCompact(n) : "";
}

/** Monta os cards read-only conforme a fase. */
function cardsForPhase(phase: 1 | 2 | 3, s: PhaseStartup) {
  const campaign = s.campaigns?.[0];
  if (phase === 3) {
    // A Fase 3 é a validação dos detalhes de captação (campanha DRAFT). O
    // admin precisa ver TUDO o que o founder preencheu em /founder/startups/
    // :id/captacao — espelhamos as abas daquela tela em cards temáticos.
    const c = campaign;

    // Alocação de recursos → grid 2 colunas com barra horizontal por item
    // (label à esquerda, percentual magenta à direita). Espelha o padrão
    // editorial do restante da Fase 3. Inclui linha final de "Soma total"
    // para validar 100% à vista.
    const resources = (c?.resources ?? [])
      .slice()
      .sort((a, b) => (b.percentual ?? 0) - (a.percentual ?? 0));
    const resourcesNode =
      resources.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {resources.map((r) => {
              const label =
                RESOURCE_CATEGORY_LABELS[r.categoria] ?? r.categoria;
              return (
                <div
                  key={r.categoria}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/40 px-4 py-3"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {label}
                    {r.descricaoCustomizada
                      ? ` — ${r.descricaoCustomizada}`
                      : ""}
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {r.percentual}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              Soma total
            </span>
            <span className="font-mono text-base font-bold text-primary">
              {resources.reduce(
                (acc, r) => acc + (Number(r.percentual) || 0),
                0,
              )}
              %
            </span>
          </div>
        </div>
      ) : (
        ""
      );

    return [
      {
        title: "Captação & Valuation",
        icon: Target,
        fields: [
          { label: "Meta de captação", value: brl(c?.targetAmount) },
          { label: "Valuation", value: brl(c?.valuation) },
          { label: "Preço do token", value: brl(c?.tokenPrice) },
          {
            label: "Quantidade de tokens",
            value:
              c?.totalTokens != null
                ? c.totalTokens.toLocaleString("pt-BR")
                : "",
          },
        ] as WizardField[],
      },
      {
        title: "Tese de negócio",
        icon: Lightbulb,
        fields: [
          { label: "Problema", value: c?.problema },
          { label: "Solução", value: c?.solucao },
          { label: "Modelo de receita", value: c?.modeloReceita },
          { label: "Diferencial", value: c?.diferencial },
          { label: "Mercado-alvo", value: c?.mercadoAlvo },
        ] as WizardField[],
      },
      {
        title: "Metas & Destinação de recursos",
        icon: Coins,
        fields: [
          {
            label: "O que espera alcançar",
            value: c?.oQueEsperaAlcancar,
          },
          { label: "Objetivo da captação", value: c?.objetivoCaptacao },
          { label: "Distribuição dos recursos", value: resourcesNode },
        ] as WizardField[],
      },
      {
        title: "Governança & Operação",
        icon: Brain,
        fields: [
          {
            label: "Sócios/fundadores",
            value:
              c?.sociosCount != null ? String(c.sociosCount) : "",
          },
          { label: "Dedicação dos fundadores", value: c?.dedicacao },
          { label: "Potenciais compradores", value: c?.compradores },
          { label: "Investimento prévio", value: c?.investimentoPrevio },
          { label: "Concorrência", value: c?.concorrencia },
        ] as WizardField[],
      },
      {
        title: "Benefícios & Participação de lucros",
        icon: ShieldCheck,
        fields: [
          {
            label: "Oferece participação nos lucros",
            value: boolLabel(c?.participacaoLucros),
          },
          { label: "Política de lucros", value: c?.politicaLucros },
          {
            label: "Faturamento mínimo p/ lucros",
            value: brl(c?.faturamentoMinimoLucros),
          },
          {
            label: "Oferece benefícios adicionais",
            value: boolLabel(c?.beneficiosAdicionais),
          },
          { label: "Descrição dos benefícios", value: c?.beneficiosDescricao },
        ] as WizardField[],
      },
      {
        title: "Programa de afiliados",
        icon: Handshake,
        fields: [
          {
            label: "Aceita afiliados",
            value:
              num(c?.affiliateCommissionPct) != null &&
              (num(c?.affiliateCommissionPct) as number) > 0
                ? "Sim"
                : "Não",
          },
          {
            label: "Comissão do afiliado",
            value:
              num(c?.affiliateCommissionPct) != null &&
              (num(c?.affiliateCommissionPct) as number) > 0
                ? `${num(c?.affiliateCommissionPct)}%`
                : "—",
          },
        ] as WizardField[],
      },
    ];
  }

  // `pais` guarda tanto o país quanto o endereço completo preenchido em
  // /founder/startups/:id/edit (aba Identidade → Localização). Suporta o
  // formato novo (nome/codigo/cep/cidade/uf/logradouro/...) e o legado
  // (iso3/name/emoji).
  const paisObj = (s.pais ?? {}) as {
    iso3?: string;
    name?: string;
    nome?: string;
    emoji?: string;
    codigo?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
  };
  const redesObj = (s.redes_sociais ?? {}) as {
    website?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
    instagram?: string | null;
  };
  const linkedin = redesObj.linkedin ?? "";
  const youtubeUrl = s.youtube_url ?? "";
  const paisNome = paisObj.nome || paisObj.name || paisObj.iso3 || "";
  const paisLabel = paisObj.emoji
    ? `${paisObj.emoji} ${paisNome}`.trim()
    : paisNome;
  const enderecoLinha = [
    [paisObj.logradouro, paisObj.numero].filter(Boolean).join(", "),
    paisObj.complemento,
    paisObj.bairro,
  ]
    .filter((s) => s && s.length > 0)
    .join(" · ");
  const cidadeUf = [paisObj.cidade, paisObj.uf].filter(Boolean).join(" / ");
  const contaPartes = (s.conta ?? "").split("-");
  const contaNumero = contaPartes.length > 1
    ? contaPartes.slice(0, -1).join("-")
    : s.conta;
  const contaDigito = s.digito || (contaPartes.length > 1 ? contaPartes.at(-1) : "");

  const identidade = {
    title: "Identidade",
    icon: IdCard,
    fields: [
      {
        label: "Nome fantasia",
        value: s.nome,
        snapshotKey: "nome",
      },
      {
        label: "Razão social",
        value: s.razao_social,
        snapshotKey: "razao_social",
      },
      { label: "CNPJ", value: formatCnpj(s.cnpj), snapshotKey: "cnpj" },
      {
        label: "Data de abertura",
        value: formatBRDate(s.data_fundacao),
        snapshotKey: "data_fundacao",
      },
      {
        label: "País",
        value: paisLabel,
      },
      { label: "Cidade / UF", value: cidadeUf },
      { label: "CEP", value: paisObj.cep },
      { label: "Endereço", value: enderecoLinha },
      { label: "Telefone", value: s.telefone },
      { label: "Email", value: s.email },
      { label: "Website", value: s.site ?? redesObj.website, snapshotKey: "site" },
      {
        label: "LinkedIn",
        value: linkedin,
      },
      {
        label: "Instagram",
        value: redesObj.instagram ?? "",
      },
      {
        label: "Twitter / X",
        value: redesObj.twitter ?? "",
      },
      {
        label: "Vídeo pitch (YouTube)",
        value: youtubeUrl,
      },
      {
        label: "Categoria",
        value: s.categoryRel?.nome ?? "",
      },
      {
        label: "Área de atuação",
        // Prioriza a taxonomia nova (cascata); cai para o legado se ausente.
        value: s.areaAtuacaoRel?.nome ?? s.area_atuacao ?? "",
        snapshotKey: "area_atuacao",
      },
      { label: "Estágio", value: s.estagio, snapshotKey: "estagio" },
      { label: "Descrição", value: s.descricao, snapshotKey: "descricao" },
      {
        label: "Descritivo básico",
        value: s.descritivo_basico,
        snapshotKey: "descritivo_basico",
      },
    ] as WizardField[],
  };
  const bancario = {
    title: "Dados bancários",
    icon: Landmark,
    fields: [
      { label: "Titular", value: s.titular, snapshotKey: "titular" },
      { label: "Documento do titular", value: s.documento_titular },
      { label: "Banco", value: s.banco, snapshotKey: "banco" },
      { label: "Agência", value: s.agencia, snapshotKey: "agencia" },
      { label: "Conta", value: contaNumero, snapshotKey: "conta" },
      { label: "Dígito", value: contaDigito, snapshotKey: "digito" },
      { label: "Tipo de conta", value: s.tipo_conta },
      { label: "Chave PIX", value: s.pix_key },
    ] as WizardField[],
  };
  const captacao = {
    title: "Captação & Valuation",
    icon: Target,
    fields: [
      {
        label: "Meta de captação",
        value:
          num(campaign?.targetAmount) != null
            ? formatBRLCompact(num(campaign?.targetAmount) as number)
            : "",
        // Campos da Campaign não estão no snapshot (que é da Startup).
        // Mantemos sem snapshotKey — não são destacados como diff.
      },
      {
        label: "Valuation",
        value:
          num(campaign?.valuation) != null
            ? formatBRLCompact(num(campaign?.valuation) as number)
            : "",
      },
      {
        label: "Preço do token",
        value:
          num(campaign?.tokenPrice) != null
            ? formatBRLCompact(num(campaign?.tokenPrice) as number)
            : "",
      },
    ] as WizardField[],
  };

  return phase === 1
    ? [identidade, bancario, captacao]
    : [identidade, bancario];
}

/**
 * Tipo derivado do retorno de `cardsForPhase` (cada card é uma linha do wizard).
 * Mantido como type público porque pode ser útil para futuras extensões
 * (ex.: testes que validem a ordem dos cards por fase).
 */
type PhaseCard = ReturnType<typeof cardsForPhase>[number];

interface PhaseScreenProps {
  phase: 1 | 2 | 3;
  startup: PhaseStartup;
}

/** Membro individual (founder/advisor/employee) com foto e metadados. */
interface TeamMember {
  nome?: string | null;
  cargo?: string | null;
  participacao?: number | null;
  dedicacao?: string | null;
  linkedin?: string | null;
  bio?: string | null;
  fotoUrl?: string | null;
}

const DEDICACAO_LABEL: Record<string, string> = {
  integral: "Integral",
  parcial: "Parcial",
};

function normalizeMembers(value: unknown): TeamMember[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (m): m is TeamMember => !!m && typeof m === "object",
  );
}

function MemberRow({ m }: { m: TeamMember }) {
  const inicial = (m.nome ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      {m.fotoUrl ? (
        <img
          src={m.fotoUrl}
          alt={m.nome ?? "Membro"}
          className="size-12 shrink-0 rounded-full object-cover ring-1 ring-white/10"
          loading="lazy"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-black text-primary ring-1 ring-primary/20">
          {inicial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {m.nome || "—"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {m.cargo && <span>{m.cargo}</span>}
          {m.participacao != null && (
            <span className="text-primary">· {m.participacao}%</span>
          )}
          {m.dedicacao && (
            <span>· {DEDICACAO_LABEL[m.dedicacao] ?? m.dedicacao}</span>
          )}
        </div>
        {m.bio && (
          <p className="mt-1 break-words text-xs text-muted-foreground/80">
            {m.bio}
          </p>
        )}
        {m.linkedin && (
          <a
            href={m.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * TeamCard — espelha a aba "Time" de /founder/startups/:id/edit: founders
 * (JSON `socios`) e demais membros do time (JSON `teams`). Só renderiza quando
 * há pelo menos um membro.
 */
function TeamCard({
  socios,
  teams,
  showEmpty = false,
}: {
  socios?: unknown;
  teams?: unknown;
  showEmpty?: boolean;
}) {
  const founders = normalizeMembers(socios);
  const team = normalizeMembers(teams);
  if (founders.length === 0 && team.length === 0 && !showEmpty) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-card p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary/70" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">Time</h2>
      </div>

      {founders.length === 0 && team.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          Nenhum membro cadastrado.
        </p>
      )}

      {founders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Founders &amp; Co-founders
          </p>
          {founders.map((m, i) => (
            <MemberRow key={`founder-${i}-${m.nome ?? i}`} m={m} />
          ))}
        </div>
      )}

      {team.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Advisors &amp; Time
          </p>
          {team.map((m, i) => (
            <MemberRow key={`team-${i}-${m.nome ?? i}`} m={m} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * TermoAdesaoCard — status da assinatura digital do Termo de Adesão (PKI).
 * Exibido na Fase 2. Só renderiza quando existe um termo assinado.
 */
function TermoAdesaoCard({
  signedDocuments,
  showEmpty = false,
}: {
  signedDocuments?: PhaseStartup["signedDocuments"];
  showEmpty?: boolean;
}) {
  const termo = (signedDocuments ?? []).find((d) => d.type === "termo_adesao");
  if (!termo && !showEmpty) return null;

  const assinadoEm = termo?.signatureFounderAt ?? termo?.createdAt ?? null;

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-card p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <FileCheck className="h-4 w-4 text-primary/70" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">Termo de Adesão</h2>
        <span
          className={
            termo
              ? "ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300"
              : "ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300"
          }
        >
          {termo ? "Assinado" : "Não assinado"}
        </span>
      </div>
      {!termo ? (
        <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          Termo de adesão ainda não assinado pelo founder.
        </p>
      ) : (
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {assinadoEm && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Assinado em
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {formatBRDate(assinadoEm)}
            </dd>
          </div>
        )}
        {termo.templateVersion && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Versão do termo
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {termo.templateVersion}
            </dd>
          </div>
        )}
        {termo.documentHash && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Hash SHA-256
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-foreground/80">
              {termo.documentHash}
            </dd>
          </div>
        )}
      </dl>
      )}
    </section>
  );
}

/** Miniatura de mídia read-only (logo/capa) com fallback quando ausente. */
function MediaThumb({
  label,
  url,
  aspect,
}: {
  label: string;
  url?: string | null;
  aspect: "square" | "wide";
}) {
  const box =
    aspect === "square"
      ? "aspect-square max-w-[160px]"
      : "aspect-[16/9] w-full";
  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className={`relative flex ${box} items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20`}
      >
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full w-full"
          >
            <img
              src={url}
              alt={label}
              // object-contain evita que a logo fique "estufada"/esticada:
              // preserva o aspect-ratio original dentro do box.
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </a>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-wider">
              Não enviado
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MediaCard — pré-visualização da identidade visual enviada pelo founder
 * (logo + capa). Usa `object-contain` para não distorcer a logo. Só é
 * exibido nas Fases 1 e 2 (a Fase 3 trata apenas de captação).
 */
function MediaCard({
  logo,
  cover,
  showEmpty = false,
}: {
  logo?: {
    url?: string | null;
    url_md?: string | null;
    url_sm?: string | null;
  } | null;
  cover?: { url?: string | null; url_sm?: string | null } | null;
  showEmpty?: boolean;
}) {
  const logoUrl = logo?.url ?? logo?.url_md ?? logo?.url_sm ?? null;
  const coverUrl = cover?.url ?? cover?.url_sm ?? null;

  // Nada enviado → só oculta quando showEmpty=false (Fase 1). Na Fase 2
  // (showEmpty=true) o card aparece com placeholders "Não enviado".
  if (!logoUrl && !coverUrl && !showEmpty) return null;

  // A capa só é considerada quando o caller a passa (Fase 2). Sem capa, o card
  // exibe apenas a logo em coluna única (Fase 1) — sem slot vazio "Não enviado".
  const showCover = cover !== undefined;

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-card p-4 sm:p-8">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary/70" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">Identidade visual</h2>
      </div>
      {showCover ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MediaThumb label="Logo" url={logoUrl} aspect="square" />
          <div className="sm:col-span-2">
            <MediaThumb label="Capa" url={coverUrl} aspect="wide" />
          </div>
        </div>
      ) : (
        <MediaThumb label="Logo" url={logoUrl} aspect="square" />
      )}
    </section>
  );
}

/**
 * PhaseScreen — layout completo de uma página de Fase (design §2).
 * Header + dados read-only do wizard + comprovante/gate + ações de aprovação.
 * O gate de pagamento vem de payment-status (hidratado no cache pelo loader).
 */
export function PhaseScreen({ phase, startup }: PhaseScreenProps) {
  const { data: paymentStatus } = useQuery(
    adminStartupPaymentStatusQueryOptions(startup.id),
  );
  const gate = paymentStatus?.phases?.[phase];
  const cards = cardsForPhase(phase, startup);

  // Última decisão desta fase (pode ser null se nunca decidida).
  const { data: lastDecision } = useLatestReviewDecision(startup.id, phase);

  // Quando houve rejeição, computa o diff contra o estado ATUAL da startup.
  // Só destacamos se o founder JÁ editou depois (pelo menos 1 campo mudou).
  const changedFields =
    lastDecision?.decision === "REJECTED" && lastDecision.rejectedSnapshot
      ? computeChangedFields(
          lastDecision.rejectedSnapshot as Record<string, unknown>,
          startup as unknown as Record<string, unknown>,
        )
      : undefined;

  // Enriquece cada field com `previousValue` (do snapshot) para o diff visual.
  // Indexado por título para lookup O(1) durante a renderização.
  const enrichedByTitle = new Map(
    cards.map((card) => [
      card.title,
      {
        ...card,
        fields: card.fields.map((f) => {
          if (
            !f.snapshotKey ||
            !lastDecision?.rejectedSnapshot ||
            !changedFields?.has(f.snapshotKey)
          ) {
            return f;
          }
          const before = (lastDecision.rejectedSnapshot as Record<
            string,
            unknown
          >)[f.snapshotKey];
          return {
            ...f,
            previousValue:
              before == null || before === "" ? (
                <em className="not-italic opacity-60">(vazio)</em>
              ) : (
                String(before)
              ),
          };
        }),
      },
    ]),
  );

  return (
    <main className="min-h-screen px-5 pb-6 pt-3 md:px-20 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-7xl xl:max-w-[1400px]">
        <DashboardBackgroundWatermark />
        <PhaseHeader
          phase={phase}
          startupId={startup.id}
          startupName={startup.nome}
          status={startup.status}
        />
        {changedFields && changedFields.size > 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100 shadow-lg">
            <PencilLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
            <div>
              <p className="text-sm font-bold">
                O founder atualizou esta startup após a rejeição.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
                {changedFields.size} campo{changedFields.size === 1 ? "" : "s"} foi{changedFields.size === 1 ? "" : "ram"} alterado{changedFields.size === 1 ? "" : "s"}. Os valores anteriores aparecem riscados ao lado dos valores atuais.
              </p>
            </div>
          </div>
        )}
        <div className="mt-6 space-y-4 md:space-y-6">
          {/*
            Mídia enviada pelo founder.
            - Fase 1 (Cadastro): apenas a LOGO (a capa ainda não foi enviada).
            - Fase 2 (Edição do Cadastro): LOGO + CAPA (a capa é preenchida
              nesta etapa).
          */}
          {phase !== 3 && (
            <MediaCard
              logo={startup.logo}
              cover={phase === 2 ? startup.cover : undefined}
              showEmpty={phase === 2}
            />
          )}
          {/*
            Cards do wizard — fluxo único em coluna. Sem pareamento lateral:
            a página inteira é uma coluna (5rem de padding lateral) e cada
            card ocupa a largura cheia do conteúdo interno.
          */}
          {cards.map((c) => {
            const enriched = enrichedByTitle.get(c.title);
            if (!enriched) return null;
            return (
              <WizardDataCard
                key={c.title}
                title={c.title}
                icon={c.icon}
                fields={enriched.fields}
                changedFields={changedFields}
                showEmpty={phase === 2}
              />
            );
          })}
          {/*
            Time (founders + colaboradores) — espelha a aba "Time" de
            /founder/startups/:id/edit. Exibido na Fase 2 (Edição do Cadastro).
          */}
          {phase === 2 && (
            <TeamCard
              socios={startup.socios}
              teams={startup.teams}
              showEmpty
            />
          )}
          {/*
            Documentos para avaliação:
            - Fase 1 (Cadastro + Reserva): SOMENTE o Pitch Deck.
            - Fase 2 (Edição do Cadastro): os demais documentos (contrato
              social, CNPJ, balanços, etc.) + marcadores "Não se aplica".
          */}
          {phase !== 3 && (
            <PhaseDocuments
              phase={phase}
              startupId={startup.id}
              documents={startup.documents ?? []}
              naoSeAplica={startup.documentNAs ?? []}
            />
          )}
          {/* Termo de Adesão assinado (PKI) — Fase 2. */}
          {phase === 2 && (
            <TermoAdesaoCard
              signedDocuments={startup.signedDocuments}
              showEmpty
            />
          )}
          {/*
            Comprovante + Ações de aprovação no rodapé do fluxo (não mais em
            sidebar lateral sticky). Com a página em coluna única + 5rem de
            padding lateral, fica mais legível revisar de cima para baixo e
            decidir no final.
          */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <PaymentReceipt gate={gate} />
            <PhaseApprovalActions
              phase={phase}
              startupId={startup.id}
              unlocked={gate?.unlocked ?? false}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
