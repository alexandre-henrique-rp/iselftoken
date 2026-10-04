import {
  ClipboardList,
  Edit3,
  Eye,
  ExternalLink,
  Handshake,
  Pause,
  Play,
  Rocket,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { RoundStatus } from "~/types/founder-startup";

export interface StartupActionsCellProps {
  startupId: string;
  startupSlug?: string;
  campaignStatus?:
    | "draft"
    | "analysis"
    | "open"
    | "paused"
    | "closed"
    | "funded"
    | "paid_out";
  /** S18.6 — status da plataforma da startup. Quando `approved`,
   *  significa que a fase 2 do Compliance foi aprovada e o founder
   *  pode ajustar a captação (botão "Editar Captação"). */
  platformStatus?: "approved" | "analyzing";
  /** Libera correção da captação quando a Fase 3 foi rejeitada. */
  phase3Rejected?: boolean;
  roundStatus?: RoundStatus;
  /**
   * ID da campanha ativa da startup (S18.6). Quando presente, o link
   * "Financeiro" aponta direto para `/founder/campaigns/:campaignId/financeiro`
   * (sem passar pelo redirect legacy que jogava o founder de volta no dashboard).
   */
  campaignId?: number | string | null;
  /** Repasse configurado pelo admin (libera "Solicitar Parcela"). */
  repasseConfigurado?: boolean;
  onConfirmPausar?: () => void;
  onConfirmCancelar?: () => void;
}

/** Action icon button inside a tooltip wrapper. */
function ActionIcon({
  icon: Icon,
  label,
  title,
  to,
  onClick,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Tooltip detalhado em PT-BR. Default = label. */
  title?: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
}) {
  const classes = cn(
    "p-2 rounded-lg transition-all cursor-pointer",
    variant === "destructive"
      ? "bg-red-500/10 hover:bg-red-500/25 text-red-400"
      : "bg-accent/40 hover:bg-primary/15 text-muted-foreground hover:text-primary",
  );

  const icon = <Icon className="w-3.5 h-3.5" />;
  const tooltip = title ?? label;

  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes} title={tooltip}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={classes}
      title={tooltip}
    >
      {icon}
    </button>
  );
}

/**
 * Conditional action icons column for the startup list.
 *
 * Visibility matrix (alinhado com CASE.md `[Painel do Fundador]`):
 * - Editar (cadastral): sempre visivel
 * - Ver startup: somente OPEN (página pública da captação ativa)
 * - Ver investidores: somente OPEN (campanha ativa recebendo aportes)
 * - Transparência: somente FUNDED | PAID_OUT (a partir da 1a captação concluída)
 *   - CLOSED NAO entra (sem repasse/dividendos/motivo estruturado para relato)
 * - Afiliados: somente OPEN
 * - Financeiro: !OPEN (gestao pós-captação)
 * - Editar Captacao: somente DRAFT
 * - Pausar: open && roundStatus === 'ativa'
 * - Retornar: paused
 * - Cancelar: paused
 * - Nova Captacao: somente FUNDED (regra B05 -- 100% vendida + 3 meses carencia)
 */
export function StartupActionsCell({
  startupId,
  startupSlug,
  campaignStatus,
  platformStatus,
  phase3Rejected,
  roundStatus,
  campaignId,
  repasseConfigurado,
  onConfirmPausar,
  onConfirmCancelar,
}: StartupActionsCellProps) {
  const isDraft = campaignStatus === "draft";
  const isOpen = campaignStatus === "open";
  const isPaused = campaignStatus === "paused";
  const isClosed = campaignStatus === "closed";
  const isFunded = campaignStatus === "funded";
  const isPaidOut = campaignStatus === "paid_out";
  // S18.6 — "Editar Captação" exige fase 2 aprovada (platformStatus === 'approved')
  const isPhase2Approved = platformStatus === "approved";
  const canCorrectPhase3 = isPhase2Approved || phase3Rejected;
  // CASE.md [Painel do Fundador]: transparência só após 1a captação concluída.
  // CLOSED nao conta (sem repasse/dividendos).
  const isCaptacaoConcluida = isFunded || isPaidOut;
  // Transparência fica disponível assim que a captação é FUNDED/PAID_OUT.
  const showTransparencia = isCaptacaoConcluida;
  // Financeiro só aparece depois que o Admin define as parcelas.
  const financeiroLiberado =
    isCaptacaoConcluida && Boolean(repasseConfigurado);
  // Sprint S34-d: Nova Captacao so quando repasse CONCLUIDO (PAID_OUT).
  // Antes era isFunded mas isso permitia nova rodada enquanto o repasse
  // ainda estava em curso (parcelas sendo pagas). Gate final no loader
  // de /founder/startups/:id/new-round (REPASSE_PENDENTE).
  const showNovaCaptacao = isPaidOut;

  return (
    <div className="flex w-full shrink-0 flex-nowrap items-center justify-end gap-1.5 xl:w-[160px] xl:opacity-60 xl:group-hover:opacity-100 transition-opacity">
      {/* Ver investidores: apenas com captacao ATIVA (regra CASE.md) */}
      {isOpen && startupSlug && (
        <>
          <ActionIcon
            icon={ExternalLink}
            label="Ver startup"
            title="Abrir página pública da startup"
            to={`/marketplace/startup/${encodeURIComponent(startupSlug)}`}
          />
          <ActionIcon
            icon={Users}
            label="Ver investidores"
            title="Ver investidores desta startup"
            to={`/founder/investors?startupId=${startupId}`}
          />
        </>
      )}
      {/* Editar (cadastral): sempre visivel */}
      <ActionIcon
        icon={Edit3}
        label="Editar"
        title="Editar dados cadastrais da startup"
        to={`/founder/startups/${startupId}/edit`}
      />
      {/* Transparência: disponível após a captação ser financiada */}
      {showTransparencia && (
        <ActionIcon
          icon={Eye}
          label="Transparência"
          title="Transparência e divulgações"
          to={`/founder/startups/${startupId}/transparencia`}
        />
      )}
      {/* Afiliados: apenas OPEN */}
      {isOpen && (
        <ActionIcon
          icon={Handshake}
          label="Afiliados"
          title="Gerenciar afiliados desta startup"
          to={`/founder/affiliate/triagem?startupId=${startupId}`}
        />
      )}

      {/* Financeiro: gestão pós-captação (SÓ quando a captação
          está finalizada — FUNDED ou PAID_OUT). S18.6 — link direto
          para a campanha quando o backend expõe `campaignId`.
          Fallback para a rota legacy de startup caso contrário. */}
      {financeiroLiberado && (
        <ActionIcon
          icon={Wallet}
          label="Financeiro"
          title="Gestão financeira da startup (repasses, NF, recebimentos)"
          to={
            campaignId
              ? `/founder/campaigns/${campaignId}/financeiro`
              : `/founder/startups/${startupId}/financeiro`
          }
        />
      )}

      {/* Editar Captacao: apenas em rascunho (DRAFT) E com fase 2
          do Compliance aprovada (S18.6 — antes mostrava em qualquer
          DRAFT, permitindo ajustes sem feedback do analista).
          Fase 2 aprovada = `platformStatus === 'approved'`. */}
      {isDraft && canCorrectPhase3 && (
        <ActionIcon
          icon={ClipboardList}
          label="Editar Captação"
          title="Ajustar parametros da rodada antes de publicar"
          to={`/founder/startups/${startupId}/captacao`}
        />
      )}

      {isOpen && roundStatus === "ativa" && (
        <ActionIcon icon={Pause} label="Pausar" onClick={onConfirmPausar} />
      )}

      {isPaused && (
        <>
          <ActionIcon
            icon={Play}
            label="Retornar"
            to={`/founder/startups/${startupId}/edit`}
          />
          <ActionIcon
            icon={XCircle}
            label="Cancelar"
            onClick={onConfirmCancelar}
            variant="destructive"
          />
        </>
      )}

      {/* Nova Captacao: apenas FUNDED (regra B05 -- 100% vendida + 3 meses carencia) */}
      {showNovaCaptacao && (
        <ActionIcon
          icon={Rocket}
          label="Nova Captação"
          title="Iniciar nova captação (repasse concluído)"
          to={`/founder/startups/${startupId}/new-round`}
        />
      )}
    </div>
  );
}
