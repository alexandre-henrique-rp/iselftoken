import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "~/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @description Calcula dias uteis entre duas datas (excluindo sabado e domingo).
 * @param from - Data inicial (epoch ms).
 * @param to - Data final (epoch ms).
 * @returns Numero de dias uteis (negativo se `to` ja passou).
 */
export function businessDaysBetween(from: number, to: number): number {
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  if (from === to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) {
    // conta para tras para obter atraso
    let days = 0;
    const cursor = new Date(start);
    while (cursor > end) {
      cursor.setDate(cursor.getDate() - 1);
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) days += 1;
    }
    return -days;
  }
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setHours(0, 0, 0, 0);
  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

type Tone = "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, { wrap: string; icon: string }> = {
  success: {
    wrap: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    icon: "text-emerald-300",
  },
  warning: {
    wrap: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    icon: "text-amber-300",
  },
  danger: {
    wrap: "bg-red-500/10 border-red-500/30 text-red-300",
    icon: "text-red-300",
  },
};

export interface RepasseSlaCountdownProps {
  /** Data de envio da solicitacao (ISO 8601). */
  submittedAt: string;
  /** SLA em dias uteis. Default 5 (padrao CASE.md). */
  businessDays?: number;
  /** Classes adicionais para o wrapper externo. */
  className?: string;
  /** Se true, renderiza apenas o texto (sem wrapper visual). Util para uso inline. */
  inline?: boolean;
}

/**
 * Componente que exibe o countdown de SLA em tempo real,
 * atualizando a cada 60s. Retorna 3 cores:
 * - verde: > 2 dias uteis restantes
 * - amarelo: 1-2 dias uteis restantes
 * - vermelho: atrasado (data atual > submittedAt + businessDays)
 */
export function RepasseSlaCountdown({
  submittedAt,
  businessDays = 5,
  className,
  inline = false,
}: RepasseSlaCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) {
    return (
      <span className={className} data-testid="sla-countdown">
        Data invalida
      </span>
    );
  }
  const elapsed = businessDaysBetween(submittedMs, now);
  const remaining = businessDays - elapsed;
  const overdue = remaining < 0 ? Math.abs(remaining) : 0;

  const tone: Tone =
    overdue > 0 ? "danger" : remaining === 1 ? "warning" : remaining <= 2 ? "warning" : "success";

  let text: string;
  if (overdue > 0) {
    text = `ATRASADO em ${overdue} ${overdue === 1 ? "dia util" : "dias uteis"}`;
  } else if (remaining === 1) {
    text = "1 dia util restante";
  } else if (remaining === 0) {
    text = "Ultimo dia";
  } else {
    text = `${remaining} dias uteis restantes`;
  }

  if (inline) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 font-black tabular-nums", TONE_CLASSES[tone].icon, className)}
        data-testid="sla-countdown"
        data-tone={tone}
        data-remaining={remaining}
      >
        {tone === "danger" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        {text}
      </span>
    );
  }

  const toneClasses = TONE_CLASSES[tone];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-black uppercase tracking-widest",
        toneClasses.wrap,
        className,
      )}
      data-testid="sla-countdown"
      data-tone={tone}
      data-remaining={remaining}
      data-overdue={overdue}
    >
      {tone === "danger" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      {text}
    </div>
  );
}

// For testing in isolation
export const __test = { DAY_MS, TONE_CLASSES };
