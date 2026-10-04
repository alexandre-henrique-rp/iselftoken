import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Link } from "react-router";
import {
  adminStartupPaymentStatusQueryOptions,
  type PhaseGate,
} from "~/lib/queries";
import { cn } from "~/lib/utils";

const PHASES = [
  { n: 1 as const, label: "Fase 1", title: "Cadastro + Reserva" },
  { n: 2 as const, label: "Fase 2", title: "Edição do Cadastro" },
  { n: 3 as const, label: "Fase 3", title: "Detalhes de Captação" },
];

interface PhaseActionsProps {
  startupId: number | string;
  startupName: string;
}

/**
 * PhaseActions (S2) — substitui as 5 ações antigas por 3 botões de Fase.
 *
 * Cada fase tem 2 estados visuais (admin-startup-phases-design §1.4):
 *  - 🔓 Ativo (gate PAID): link magenta para /admin/startups/:id/N
 *  - 🔒 Trancado (gate não atendido): não clicável, tooltip com o motivo
 *
 * O gate vem de GET /admin/startups/:id/payment-status (cache 30s). Enquanto
 * carrega, os botões aparecem em estado neutro (evita flash de layout).
 */
export function PhaseActions({ startupId, startupName }: PhaseActionsProps) {
  const { data, isLoading } = useQuery(
    adminStartupPaymentStatusQueryOptions(startupId),
  );

  return (
    <div className="flex items-center justify-end gap-1.5">
      {PHASES.map(({ n, label, title }) => {
        const gate: PhaseGate | undefined = data?.phases?.[n];
        const unlocked = gate?.unlocked ?? false;
        const reason = gate?.reason ?? undefined;
        const tooltip = unlocked
          ? `${label} — ${title}`
          : (reason ?? "Aguardando pagamento");

        if (isLoading) {
          return (
            <span
              key={n}
              className="h-7 w-16 animate-pulse rounded-full border border-white/10 bg-white/5"
              aria-hidden="true"
            />
          );
        }

        if (!unlocked) {
          return (
            <span
              key={n}
              title={tooltip}
              aria-label={`${label} bloqueada: ${tooltip}`}
              className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning opacity-70"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              {label}
            </span>
          );
        }

        const reviewApproved = gate?.reviewStatus === "APPROVED";
        return (
          <Link
            key={n}
            to={`/admin/startups/${startupId}/${n}`}
            title={tooltip}
            aria-label={`${label} — ${title} de ${startupName}`}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition",
              reviewApproved
                ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-black focus-visible:ring-primary/70"
                : "border border-warning/30 bg-warning/10 text-warning hover:bg-warning hover:text-black focus-visible:ring-warning/70",
              "focus-visible:outline-none focus-visible:ring-2",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
