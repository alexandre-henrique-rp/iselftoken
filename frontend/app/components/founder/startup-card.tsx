import {
  ArrowRight,
  ClipboardList,
  Edit3,
  Eye,
  Handshake,
  Rocket,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import { StartupLogoAvatar } from "~/components/founder/startup-logo-avatar";
import { DashboardStatusPills } from "~/components/founder/status-pills";
import { cn } from "~/lib/utils";
import type { RoundStatus } from "~/types/founder-startup";

export interface Startup {
  id: string;
  slug: string;
  name: string;
  segment: string;
  category?: string | null;
  stage?: string | null;
  logo: string | null;
  /** ID da campanha ativa (a mais recente em DRAFT/OPEN/PAUSED/FUNDED/PAID_OUT)
   *  — usada para linkar direto ao `/founder/campaigns/:campaignId/financeiro`
   *  sem passar pelo redirect legacy. `null` quando não há campanha. */
  campaignId?: number | string | null;
  /** Emoji de bandeira (🇧🇷) do país da startup. Usado como segundo sinal
   * visual no avatar quando a logo não carrega. */
  bandeira?: string | null;
  platformStatus: "approved" | "analyzing";
  /** Fase 3 rejeitada: mantém a ação de correção da captação disponível. */
  phase3Rejected?: boolean;
  campaignStatus:
    | "draft"
    | "analysis"
    | "open"
    | "paused"
    | "closed"
    | "funded"
    | "paid_out";
  raised: string;
  goal: string;
  /** Valor captado em REAIS (R$ 50 → 50). Permite computar progresso sem parsear string. */
  raisedAmount: number;
  /** Meta em REAIS. `null` se não há meta conhecida. */
  goalAmount: number | null;
  /** Progresso 0-100. `null` quando não há meta conhecida. */
  progressPct: number | null;
  /** Status da rodada de captação. Indefinido ate que o backend envie o campo. */
  roundStatus?: RoundStatus;
  /** Repasse configurado pelo admin — libera "Solicitar Parcela". */
  repasseConfigurado?: boolean;
}

export interface StartupCardProps {
  startup: Startup;
  /** Slot opcional para substituir a coluna de actions padrão.
   * Usado por StartupListView para injetar StartupActionsCell com modal state. */
  actions?: React.ReactNode;
}

export function StartupCard({ startup, actions }: StartupCardProps) {
  const isApproved = startup.platformStatus === "approved";
  const canCorrectPhase3 = isApproved || startup.phase3Rejected === true;
  const isOpen = startup.campaignStatus === "open";
  const isDraft = startup.campaignStatus === "draft";
  const isFunded = startup.campaignStatus === "funded";
  const isPaidOut = startup.campaignStatus === "paid_out";
  // "Captacao concluida com sucesso" — primeiro momento em que faz sentido abrir
  // a pagina de transparencia para o fundador reportar marcos/resultados.
  // Regra: vide [Painel do Fundador] no CASE.md. CLOSED (sem bater meta) NAO
  // conta — sem repasse/dividendos, nao ha motivo estruturado para relato.
  const isCaptacaoConcluida = isFunded || isPaidOut;
  // Transparência fica disponível assim que a captação é FUNDED/PAID_OUT.
  // Financeiro só aparece depois que o Admin define as parcelas.
  const financeiroLiberado =
    isCaptacaoConcluida && Boolean(startup.repasseConfigurado);

  return (
    <div className="group relative bg-accent/15 hover:bg-accent/30 transition-all duration-300 rounded-xl border border-white/5 hover:border-primary/30 overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(374px,562px)_200px_minmax(220px,1fr)_160px] gap-2 xl:gap-3 items-start px-4 lg:px-5 py-3.5">
        {/* Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-11 w-11 rounded-xl p-0.5 shrink-0",
              isApproved
                ? "bg-gradient-to-br from-primary to-primary-container"
                : "bg-gradient-to-br from-amber-500 to-orange-600",
            )}
          >
            <StartupLogoAvatar
              name={startup.name}
              logo={startup.logo}
              bandeira={startup.bandeira}
              className="h-full w-full rounded-[0.6rem]"
              imageClassName="rounded-[0.6rem]"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
              {startup.name} {startup.bandeira ? (
                <span
                  className="ml-1 text-sm align-middle"
                  title="País da startup"
                  aria-label="País da startup"
                >
                  {startup.bandeira}
                </span>
              ) : null}
            </h3>
            <span className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {startup.category ?? startup.segment}
            </span>
          </div>
        </div>

        {/* Status pills */}
        <DashboardStatusPills
          platformStatus={isApproved ? "approved" : "analyzing"}
          campaignStatus={startup.campaignStatus}
        />

        {/* Funding — valor + barra de progresso */}
        <div
          className={cn(
            "space-y-1.5 min-w-0 w-full max-w-[364px] justify-self:start items-start text-left",
            isDraft && "opacity-50",
          )}
        >
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-black text-foreground tracking-tight tabular-nums truncate leading-tight">
              {startup.raised}
              <span className="text-muted-foreground/40 font-bold text-[11px] tracking-normal">
                {" "}
                / {startup.goal}
              </span>
            </p>
            {startup.progressPct != null && (
              <span className="text-[10px] font-black tracking-widest text-primary tabular-nums shrink-0">
                {startup.progressPct}%
              </span>
            )}
          </div>
          {startup.progressPct != null && (
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, startup.progressPct)}%` }}
                role="progressbar"
                aria-valuenow={startup.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso de captação: ${startup.progressPct}%`}
              />
            </div>
          )}
        </div>

        {/* Actions — visibilidade por campaignStatus (regra: [Painel do Fundador] no CASE.md) */}
        {actions ?? (
          <div className="flex w-full shrink-0 flex-nowrap items-center justify-end gap-1.5 xl:w-[160px] xl:opacity-60 xl:group-hover:opacity-100 transition-opacity">
            {/* Ver investidores: apenas com captacao ATIVA (OPEN) */}
            {isOpen && (
              <Link
                to={`/founder/investors?startupId=${startup.id}`}
                aria-label="Ver investidores"
                title="Ver investidores desta startup"
                className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
              >
                <Users className="w-3.5 h-3.5" />
              </Link>
            )}
            {/* Editar (sempre visivel) */}
            <Link
              to={`/founder/startups/${startup.id}/edit`}
              aria-label="Editar"
              title="Editar dados cadastrais da startup"
              className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
            {/* Transparência: disponível após a captação ser financiada */}
            {isCaptacaoConcluida && (
              <Link
                to={`/founder/startups/${startup.id}/transparencia`}
                aria-label="Transparência"
                title="Transparência e divulgações"
                className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
              </Link>
            )}
            {/* Afiliados: apenas com captacao ATIVA (OPEN) */}
            {isOpen && (
              <Link
                to={`/founder/affiliate/triagem?startupId=${startup.id}`}
                aria-label="Afiliados"
                title="Gerenciar afiliados desta startup"
                className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
              >
                <Handshake className="w-3.5 h-3.5" />
              </Link>
            )}
            {/* Financeiro: gestão pós-captação (SÓ quando a captação
                está finalizada — FUNDED ou PAID_OUT). Em DRAFT/OPEN/PAUSED
                ainda não há repasse para gerenciar. S18.6 — link direto
                para a campanha quando disponível, fallback para a rota
                legacy de startup. */}
            {financeiroLiberado && (
              <Link
                to={
                  startup.campaignId
                    ? `/founder/campaigns/${startup.campaignId}/financeiro`
                    : `/founder/startups/${startup.id}/financeiro`
                }
                aria-label="Financeiro"
                title="Gestão financeira da startup (repasses, NF, recebimentos)"
                className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
              </Link>
            )}
            {/* Editar Captacao: apenas em rascunho (DRAFT) E com fase 2
                do Compliance aprovada (S18.6 — antes mostrava em qualquer
                DRAFT mesmo sem revisão do Compliance, permitindo que o
                founder ajustasse parâmetros sem feedback do analista).
                Fase 2 aprovada = `platformStatus === 'approved'`. */}
            {isDraft && canCorrectPhase3 && (
              <Link
                to={`/founder/startups/${startup.id}/captacao`}
                aria-label="Editar Captação"
                title="Ajustar parametros da rodada antes de publicar"
                className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </Link>
            )}
            {/* Nova Captação: apenas quando repasse CONCLUIDO (PAID_OUT).
                Antes era isFunded mas isso permitia abrir nova captacao
                enquanto o repasse ainda estava em curso (parcelas sendo
                pagas). Agora so libera quando a campanha estiver
                PAID_OUT — garantindo que o repasse termina antes de
                iniciar a proxima rodada. Gate final no loader de
                /founder/startups/:id/new-round (REPASSE_PENDENTE). */}
            {isPaidOut && (
              <Link
                to={`/founder/startups/${startup.id}/new-round`}
                aria-label="Nova Captação"
                title="Iniciar nova captação (repasse concluído)"
                className="px-3.5 py-2 rounded-lg flex items-center gap-1.5 font-black uppercase text-[9px] tracking-widest transition-all bg-primary text-black hover:scale-[1.02] shadow-[0_0_12px_rgba(213,0,249,0.3)]"
              >
                <Rocket className="w-3 h-3" />
                <span className="hidden sm:inline">Nova Captação</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
