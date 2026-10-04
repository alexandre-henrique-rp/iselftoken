import type { Route } from "./+types/affiliate-panel";
import {
  Form,
  useActionData,
  useNavigation,
  useRevalidator,
} from "react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Copy,
  ExternalLink,
  Handshake,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  EditorialWalletShell,
} from "~/components/wallet/editorial-wallet-shell";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

const brl = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );

type AffiliationStatus =
  | "PENDING_FOUNDER"
  | "PENDING_ADMIN"
  | "ACTIVE"
  | "REJECTED"
  | "SUSPENDED";

interface OpenProgram {
  programId: number;
  startup: {
    id: number;
    nome: string;
    area_atuacao: string | null;
    estagio: string | null;
    logo: { url: string } | null;
  };
  affiliateCommissionPct: string | number;
  maxAffiliates: number | null;
  afiliadosAtivos: number;
}

interface MyAffiliation {
  id: number;
  status: AffiliationStatus;
  code: string;
  purchaseLinkUrl: string | null;
  tokensAllocated: number | null;
  startup: { id: number; nome: string };
  comissaoPct: string | number;
  investidores: number;
  comissaoRecebida: string | number;
  comissaoPendente: string | number;
  totalComissionado: string | number;
  rejectionReason: string | null;
}

/**
 * Card unificado da vitrine: uma startup autorizada para afiliacao, ja
 * cruzada com a afiliacao do usuario (se houver) para saber o que exibir.
 *
 * Decisao 2026-09-06 — `/affiliate` foi migrado para o padrao editorial:
 * - `EditorialWalletShell` com eyebrow "Programa de Afiliados" e watermark "AFILIADO"
 * - `useRevalidator` + botao [Atualizar] no headerActions (mesmo padrao de /wallet)
 * - Tokens de cor migrados de `bg-accent/text-foreground/text-muted-foreground`
 *   para `bg-white/5/text-on-surface/text-on-surface-variant`
 * - Loader + action preservados (integracao com banco intacta)
 */
interface StartupCard {
  startupId: number;
  nome: string;
  area: string | null;
  estagio: string | null;
  logoUrl: string | null;
  /** Presente so quando o programa esta aberto (permite candidatar-se). */
  programId: number | null;
  commissionPct: number;
  afiliadosAtivos: number | null;
  maxAffiliates: number | null;
  affiliation: {
    status: AffiliationStatus;
    code: string;
    purchaseLinkUrl: string | null;
    rejectionReason: string | null;
    comissaoRecebida: number;
    comissaoPendente: number;
    investidores: number;
  } | null;
}

const STATUS_UI: Record<
  AffiliationStatus,
  { label: string; className: string; hint: string }
> = {
  PENDING_FOUNDER: {
    label: "Aguardando fundador",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    hint: "Sua candidatura esta em analise pelo fundador da startup.",
  },
  PENDING_ADMIN: {
    label: "Aguardando iSelfToken",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    hint: "O fundador aprovou; falta o aval final da iSelfToken.",
  },
  ACTIVE: {
    label: "Ativo",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    hint: "",
  },
  REJECTED: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    hint: "",
  },
  SUSPENDED: {
    label: "Suspenso",
    className: "bg-white/5 text-on-surface-variant border-white/10",
    hint:
      "Programa suspenso pela plataforma. Sua afiliacao volta a valer se ele for reativado.",
  },
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Afiliacao | iSelfToken" },
    { name: "description", content: "Startups autorizadas para afiliacao." },
  ];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{
  cards: StartupCard[];
  erro: string | null;
  origin: string;
}> {
  const cookie = request.headers.get("cookie") || "";
  const origin = new URL(request.url).origin;
  try {
    const [progRes, meRes] = await Promise.all([
      fetch(`${BACKEND_URL}/affiliate/programs`, {
        headers: { accept: "application/json", cookie },
      }),
      fetch(`${BACKEND_URL}/affiliate/me`, {
        headers: { accept: "application/json", cookie },
      }),
    ]);

    const progJson = await progRes.json().catch(() => null);
    const meJson = await meRes.json().catch(() => null);

    // /affiliate/me sinaliza inelegibilidade (sem plano AFILIADO) via error.
    if (!meRes.ok || meJson?.error) {
      return {
        cards: [],
        erro:
          meJson?.message ??
          "Nao foi possivel carregar seus dados de afiliacao.",
        origin,
      };
    }

    const programs: OpenProgram[] =
      progRes.ok && !progJson?.error ? (progJson.data ?? []) : [];
    const minhas: MyAffiliation[] = meJson.data ?? [];

    // Indexa minhas afiliacoes por startup para cruzar com a vitrine.
    const porStartup = new Map<number, MyAffiliation>();
    for (const a of minhas) porStartup.set(a.startup.id, a);

    const cards = new Map<number, StartupCard>();

    // 1) Vitrine de programas abertos (startups autorizadas para afiliacao).
    for (const p of programs) {
      const mine = porStartup.get(p.startup.id);
      cards.set(p.startup.id, {
        startupId: p.startup.id,
        nome: p.startup.nome,
        area: p.startup.area_atuacao,
        estagio: p.startup.estagio,
        logoUrl: p.startup.logo?.url ?? null,
        programId: p.programId,
        commissionPct: Number(mine?.comissaoPct ?? p.affiliateCommissionPct),
        afiliadosAtivos: p.afiliadosAtivos,
        maxAffiliates: p.maxAffiliates,
        affiliation: mine
          ? {
              status: mine.status,
              code: mine.code,
              purchaseLinkUrl: mine.purchaseLinkUrl,
              rejectionReason: mine.rejectionReason,
              comissaoRecebida: Number(mine.comissaoRecebida || 0),
              comissaoPendente: Number(mine.comissaoPendente || 0),
              investidores: mine.investidores,
            }
          : null,
      });
    }

    // 2) Minhas afiliacoes cuja startup saiu da vitrine (ex.: programa suspenso)
    //    ainda aparecem — para o afiliado nao perder o codigo/link.
    for (const a of minhas) {
      if (cards.has(a.startup.id)) continue;
      cards.set(a.startup.id, {
        startupId: a.startup.id,
        nome: a.startup.nome,
        area: null,
        estagio: null,
        logoUrl: null,
        programId: null,
        commissionPct: Number(a.comissaoPct || 0),
        afiliadosAtivos: null,
        maxAffiliates: null,
        affiliation: {
          status: a.status,
          code: a.code,
          purchaseLinkUrl: a.purchaseLinkUrl,
          rejectionReason: a.rejectionReason,
          comissaoRecebida: Number(a.comissaoRecebida || 0),
          comissaoPendente: Number(a.comissaoPendente || 0),
          investidores: a.investidores,
        },
      });
    }

    // Ordena: ativas primeiro, depois pendentes, depois disponiveis.
    const peso = (c: StartupCard) => {
      const s = c.affiliation?.status;
      if (s === "ACTIVE") return 0;
      if (s === "PENDING_FOUNDER" || s === "PENDING_ADMIN") return 1;
      if (!c.affiliation && c.programId) return 2;
      return 3;
    };
    const ordenadas = [...cards.values()].sort((a, b) => peso(a) - peso(b));

    return { cards: ordenadas, erro: null, origin };
  } catch {
    return { cards: [], erro: "Erro de conexao.", origin };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const formData = await request.formData();
  const programId = formData.get("programId");
  if (!programId) return { success: false, error: "Programa invalido" };
  try {
    const res = await fetch(
      `${BACKEND_URL}/affiliate/programs/${programId}/apply`,
      {
        method: "POST",
        headers: { cookie },
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      // 403 = sem plano AFILIADO / papel inelegivel; mensagem do backend explica.
      return {
        success: false,
        error: json?.message ?? "Nao foi possivel enviar a candidatura.",
      };
    }
    return { success: true, message: json?.message ?? "Candidatura enviada!" };
  } catch {
    return { success: false, error: "Erro de conexao." };
  }
}

export default function AffiliatePanelPage({
  loaderData,
}: Route.ComponentProps) {
  const { cards, erro, origin } = loaderData;
  const nav = useNavigation();
  const enviando = nav.state !== "idle";
  const actionData = useActionData<{
    success?: boolean;
    message?: string;
    error?: string;
  }>();
  const ultimo = useRef<unknown>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Padrao espelhado de /wallet e /transparencia (decisao 2026-09-06):
  // revalidator + toast + timestamp para feedback explicito de atualizacao.
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const wasLoading = useRef(false);

  // Toast do action (candidatar-se / Candidatura rejeitada etc).
  useEffect(() => {
    if (!actionData || actionData === ultimo.current) return;
    ultimo.current = actionData;
    if (actionData.success) toast.success(actionData.message ?? "Candidatura enviada!");
    else if (actionData.error) toast.error(actionData.error);
  }, [actionData]);

  // Detecta transicao `loading -> idle` do revalidator para disparar feedback.
  useEffect(() => {
    if (isRevalidating) {
      wasLoading.current = true;
      return;
    }
    if (wasLoading.current) {
      wasLoading.current = false;
      const now = new Date();
      setLastUpdated(now);
      toast.success("Lista de startups atualizada", {
        description: `Dados refrescados as ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`,
      });
    }
  }, [isRevalidating]);

  const copiar = async (texto: string, id: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      toast.success("Copiado!");
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error("Nao foi possivel copiar.");
    }
  };

  const ativas = cards.filter((c) => c.affiliation?.status === "ACTIVE").length;

  // Header actions: [Atualizar] + timestamp. Botao Carteira removido — acesso
  // continua via card "Carteira de Afiliado" dentro do /wallet (decisao 2026-09-06).
  const headerActions = (
    <div className="flex items-center gap-3">
      {lastUpdated && !isRevalidating && (
        <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
          Atualizado{" "}
          {lastUpdated.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
      <button
        type="button"
        onClick={() => revalidator.revalidate()}
        disabled={isRevalidating}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-on-surface-variant text-[10px] font-black uppercase tracking-widest transition-all",
          isRevalidating
            ? "opacity-50 cursor-wait"
            : "hover:border-primary/40 hover:text-primary",
        )}
        aria-label="Atualizar lista de startups"
      >
        <RefreshCw
          className={cn("w-3.5 h-3.5", isRevalidating && "animate-spin")}
        />
        {isRevalidating ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );

  return (
    <EditorialWalletShell
      eyebrow="Programa de Afiliados"
      title="Startups para Afiliacao"
      description="Candidate-se para divulgar uma startup e ganhe comissao sobre cada venda de token atribuida a voce."
      watermark="AFILIADO"
      headerActions={headerActions}
    >
      {erro ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border border-white/5">
          <p className="text-on-surface-variant font-medium">{erro}</p>
          <p className="text-xs text-on-surface-variant/60">
            Para atuar como afiliado e preciso ter o plano AFILIADO ativo.
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center space-y-3 border border-white/5">
          <p className="text-lg font-black text-on-surface">
            Nenhuma startup autorizada para afiliacao no momento.
          </p>
          <p className="text-sm text-on-surface-variant">
            Volte em breve — novas startups aderem ao programa com frequencia.
          </p>
        </div>
      ) : (
        <>
          {ativas > 0 && (
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60">
              {ativas} afiliacao{ativas !== 1 ? "oes" : ""} ativa
              {ativas !== 1 ? "s" : ""} · {cards.length} startup
              {cards.length !== 1 ? "s" : ""} disponivei
              {cards.length !== 1 ? "s" : "l"}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 md:mb-10">
            {cards.map((c) => {
              const st = c.affiliation?.status;
              const ui = st ? STATUS_UI[st] : null;
              const lotado =
                c.maxAffiliates !== null &&
                c.afiliadosAtivos !== null &&
                c.afiliadosAtivos >= c.maxAffiliates;
              const podeCandidatar = !c.affiliation && c.programId !== null;
              const podeRecandidatar =
                c.affiliation?.status === "REJECTED" && c.programId !== null;

              return (
                <div
                  key={c.startupId}
                  className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <InitialsImage
                        name={c.nome}
                        src={c.logoUrl}
                        alt={c.nome}
                        className="h-14 w-14 shrink-0 rounded-xl border border-white/10"
                        fallbackClassName="bg-white/5"
                        fallbackTextClassName="text-lg font-black text-primary"
                      />
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-on-surface truncate">
                          {c.nome}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 truncate">
                          {c.area || "—"}
                          {c.estagio ? ` · ${c.estagio}` : ""}
                        </p>
                      </div>
                    </div>
                    {ui && (
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0",
                          ui.className,
                        )}
                      >
                        {ui.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Comissao
                    </span>
                    <span className="text-2xl font-black text-primary tracking-tighter">
                      {c.commissionPct}%
                    </span>
                  </div>

                  {/* Afiliacao ativa: link de divulgacao + codigo */}
                  {st === "ACTIVE" && c.affiliation && (() => {
                    const divulgueUrl = `${origin}/r/${c.affiliation.code}`;
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1.5">
                            Link de divulgacao
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-primary/90 font-mono truncate">
                              {divulgueUrl}
                            </div>
                            <button
                              onClick={() => copiar(divulgueUrl, `link-${c.startupId}`)}
                              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-primary hover:text-on-primary-fixed transition-all"
                              title="Copiar link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={divulgueUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-primary hover:text-on-primary-fixed transition-all"
                              title="Abrir"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                          <p className="text-[10px] text-on-surface-variant/50 mt-1.5">
                            Quem se cadastrar por este link fica registrado como sua indicacao.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-primary font-bold truncate"
                            title="Codigo de afiliado"
                          >
                            {c.affiliation.code}
                          </div>
                          <button
                            onClick={() => copiar(c.affiliation!.code, `code-${c.startupId}`)}
                            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-primary hover:text-on-primary-fixed transition-all"
                            title="Copiar codigo"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {copiado?.endsWith(`-${c.startupId}`) && (
                          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                            Copiado para a area de transferencia
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="text-center rounded-xl bg-white/5 py-3">
                            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="text-lg font-black text-on-surface leading-none">
                              {c.affiliation.investidores}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mt-1">
                              Investidores
                            </p>
                          </div>
                          <div className="text-center rounded-xl bg-white/5 py-3">
                            <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                            <p className="text-base font-black text-emerald-400 leading-none">
                              {brl(c.affiliation.comissaoRecebida)}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mt-1">
                              Recebido
                            </p>
                          </div>
                          <div className="text-center rounded-xl bg-white/5 py-3">
                            <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                            <p className="text-base font-black text-amber-400 leading-none">
                              {brl(c.affiliation.comissaoPendente)}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mt-1">
                              A receber
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/50 leading-relaxed">
                          A comissao e {c.commissionPct}% sobre o valor que cada indicado investir.
                          Os valores so existem depois que um indicado investe — "a receber"
                          ainda depende da confirmacao e do pagamento.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Pendente: aviso de analise */}
                  {(st === "PENDING_FOUNDER" || st === "PENDING_ADMIN") && ui && (
                    <p className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      {ui.hint}
                    </p>
                  )}

                  {/* Suspenso */}
                  {st === "SUSPENDED" && ui && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {ui.hint}
                    </p>
                  )}

                  {/* Rejeitado: motivo */}
                  {st === "REJECTED" && c.affiliation?.rejectionReason && (
                    <p className="text-xs text-red-400/80 bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                      Motivo: {c.affiliation.rejectionReason}
                    </p>
                  )}

                  {/* Vagas + candidatar-se */}
                  {(podeCandidatar || podeRecandidatar) && (
                    <div className="mt-auto space-y-3">
                      {c.afiliadosAtivos !== null && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                          <Users className="w-4 h-4" />
                          {c.afiliadosAtivos} afiliado
                          {c.afiliadosAtivos !== 1 ? "s" : ""} ativo
                          {c.afiliadosAtivos !== 1 ? "s" : ""}
                          {c.maxAffiliates !== null && (
                            <span className="text-on-surface-variant/50">
                              / {c.maxAffiliates} vagas
                            </span>
                          )}
                        </div>
                      )}
                      <Form method="post">
                        <input type="hidden" name="programId" value={c.programId!} />
                        <button
                          type="submit"
                          disabled={enviando || lotado}
                          className="w-full py-3 rounded-full bg-primary text-on-primary-fixed hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Handshake className="w-4 h-4" />
                          {lotado
                            ? "Vagas esgotadas"
                            : podeRecandidatar
                              ? "Candidatar-se novamente"
                              : "Candidatar-se"}
                        </button>
                      </Form>
                    </div>
                  )}

                  {/* Autorizada mas fora da vitrine (sem programa aberto) e sem acao */}
                  {!podeCandidatar && !podeRecandidatar && !st && (
                    <p className="mt-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50">
                      <ShieldCheck className="w-4 h-4" /> Autorizada
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </EditorialWalletShell>
  );
}
