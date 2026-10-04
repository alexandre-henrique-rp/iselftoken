import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovada",
  PENDING: "Em Análise",
  PENDING_RESERVATION_PAYMENT: "Aguardando reserva",
  RESERVATION_PAID: "Reserva paga",
  AWAITING_COMPLIANCE_FEE: "Aguardando Taxa de Compliance",
  PENDING_CURATOR_REVIEW: "Em análise (curadoria)",
  PENDING_APPROVAL: "Aguardando aprovação",
  REJECTED: "Rejeitada",
  LIVE: "Ativa",
};

const PHASE_TITLE: Record<number, string> = {
  1: "Cadastro + Reserva",
  2: "Edição do Cadastro",
  3: "Detalhes de Captação",
};

interface PhaseHeaderProps {
  phase: 1 | 2 | 3;
  startupId: number | string;
  startupName: string;
  status: string;
}

/**
 * PhaseHeader — breadcrumb "Voltar", eyebrow "Etapa N", título da fase e o
 * status atual da startup. Segue o padrão editorial admin (magenta + glass).
 */
export function PhaseHeader({
  phase,
  startupId,
  startupName,
  status,
}: PhaseHeaderProps) {
  const statusLabel = STATUS_LABEL[status] ?? status;
  const approved = status === "APPROVED" || status === "LIVE";
  const rejected = status === "REJECTED";

  return (
    <header className="mb-6 md:mb-8">
      <Link
        to="/admin/startups"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar à gestão de startups
      </Link>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
        Etapa {phase}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Fase {phase} — {PHASE_TITLE[phase]}
        </h1>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest",
            approved && "border-primary/20 bg-primary/10 text-primary",
            rejected &&
              "border-destructive/20 bg-destructive/10 text-destructive",
            !approved &&
              !rejected &&
              "border-warning/20 bg-warning/10 text-warning",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {startupName} ·{" "}
        <span className="font-mono text-primary">
          #{String(startupId).padStart(6, "0")}
        </span>
      </p>
    </header>
  );
}
