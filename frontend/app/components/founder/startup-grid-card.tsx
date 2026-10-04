import {
  ArrowRight,
  ClipboardList,
  Edit3,
  Eye,
  ExternalLink,
  Handshake,
  Rocket,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import { DashboardStatusPills } from "~/components/founder/status-pills";
import { cn } from "~/lib/utils";
import type { Startup } from "./startup-card";

interface StartupGridCardProps {
  startup: Startup;
  compact?: boolean;
}

export function StartupGridCard({
  startup,
  compact = false,
}: StartupGridCardProps) {
  const isApproved = startup.platformStatus === "approved";
  const canCorrectPhase3 = isApproved || startup.phase3Rejected === true;
  const isOpen = startup.campaignStatus === "open";
  const isDraft = startup.campaignStatus === "draft";
  const isFunded = startup.campaignStatus === "funded";
  const isPaidOut = startup.campaignStatus === "paid_out";
  // Transparência fica disponível assim que a captação é FUNDED/PAID_OUT.
  // Financeiro só aparece depois que o Admin define as parcelas.
  const isCaptacaoConcluida = isFunded || isPaidOut;
  const financeiroLiberado =
    isCaptacaoConcluida && Boolean(startup.repasseConfigurado);

  return (
    <div
      className={cn(
        "group relative bg-accent/15 hover:bg-accent/30 transition-all duration-300 rounded-xl border border-white/5 hover:border-primary/30 overflow-hidden",
        compact ? "p-3" : "p-4 lg:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-14 w-14 rounded-xl p-0.5 shrink-0",
              isApproved
                ? "bg-gradient-to-br from-primary to-primary-container"
                : "bg-gradient-to-br from-amber-500 to-orange-600",
            )}
          >
            <InitialsImage
              name={startup.name}
              src={startup.logo}
              alt={startup.name}
              className="h-full w-full rounded-[0.6rem] bg-black"
              fallbackClassName="bg-black"
              fallbackTextClassName="text-sm font-black text-primary"
              loading="lazy"
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
      </div>

      <DashboardStatusPills
        platformStatus={isApproved ? "approved" : "analyzing"}
        campaignStatus={startup.campaignStatus}
      />

      {!compact && (
        <div className={cn("space-y-1.5 mb-4", isDraft && "opacity-50")}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-black text-foreground tracking-tight tabular-nums truncate">
              {startup.raised}
              <span className="text-muted-foreground/40 font-bold text-[11px] tracking-normal">
                {" "}
                / {startup.goal}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <Link
          to={`/founder/startups/${startup.id}/edit`}
          aria-label="Editar"
          title="Editar dados cadastrais da startup"
          className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Link>
        {/* Editar Captação: apenas em rascunho (DRAFT) E com fase 2
            do Compliance aprovada (S18.6 — antes mostrava em qualquer
            DRAFT, permitindo ajustes sem feedback do analista).
            Fase 2 aprovada = `platformStatus === 'approved'`. */}
        {isDraft && canCorrectPhase3 && (
          <Link
            to={`/founder/startups/${startup.id}/captacao`}
            aria-label="Editar Captação"
            title="Ajustar parametros da rodada antes de publicar"
            className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
          >
            <ClipboardList className="w-3.5 h-3.5" />
          </Link>
        )}
        {/* Página pública: apenas OPEN */}
        {isOpen && (
          <Link
            to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
            aria-label="Ver startup"
            title="Abrir página pública da startup"
            className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
        {/* Afiliados: apenas OPEN */}
        {isOpen && (
          <Link
            to={`/founder/affiliate/triagem?startupId=${startup.id}`}
            aria-label="Afiliados"
            title="Gerenciar afiliados desta startup"
            className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
          >
            <Handshake className="w-3.5 h-3.5" />
          </Link>
        )}
        {/* Financeiro: gestão pós-captação (SÓ quando a captação
            está finalizada — FUNDED ou PAID_OUT). S18.6 — link direto
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
            className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
          >
            <Wallet className="w-3.5 h-3.5" />
          </Link>
        )}
        {/* Transparência: disponível após a captação ser financiada */}
        {isCaptacaoConcluida && (
          <Link
            to={`/founder/startups/${startup.id}/transparencia`}
            aria-label="Transparência"
            title="Transparência e divulgações"
            className="p-2 rounded-lg bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        )}
        {/* Nova Captação: apenas PAID_OUT (repasse concluído).
            Antes era isFunded — corrigido para isPaidOut porque com
            repasse em andamento (parcelas sendo pagas) nao faz
            sentido iniciar nova rodada. */}
        {isPaidOut && (
          <Link
            to={`/founder/startups/${startup.id}/new-round`}
            aria-label="Nova Captação"
            title="Iniciar nova captação (repasse concluído)"
            className="flex-1 px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 font-black uppercase text-[8px] tracking-widest transition-all bg-primary text-black hover:scale-[1.02] shadow-[0_0_12px_rgba(213,0,249,0.3)]"
          >
            <Rocket className="w-3.5 h-3.5 shrink-0" />
            <span>Nova Captação</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
