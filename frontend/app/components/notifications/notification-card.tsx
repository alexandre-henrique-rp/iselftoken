import { Rocket, Shield, Wallet, TrendingUp, Mail, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  type: "investment" | "security" | "wallet" | "market" | "support";
}

interface NotificationCardProps extends Notification {
  /** Callback disparado ao ativar o card (clique ou Enter/Espaço). */
  onActivate?: () => void;
}

const typeConfig: Record<Notification["type"], { icon: LucideIcon; color: string }> = {
  investment: { icon: Rocket, color: "text-primary" },
  security: { icon: Shield, color: "text-amber-400" },
  wallet: { icon: Wallet, color: "text-emerald-400" },
  market: { icon: TrendingUp, color: "text-primary" },
  support: { icon: Mail, color: "text-muted-foreground" },
};

export function NotificationCard({
  title,
  description,
  time,
  isUnread,
  type,
  onActivate,
}: NotificationCardProps) {
  const { icon: Icon, color } = typeConfig[type];
  const interactive = Boolean(onActivate) && isUnread;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Marcar "${title}" como lida` : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border border-transparent bg-accent/20 p-4 transition-all duration-500 sm:gap-6 sm:p-6",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        interactive && "cursor-pointer hover:border-primary/30",
        !isUnread && "opacity-60 grayscale-[0.5]",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/40 transition-all group-hover:border-primary/20 sm:size-12 sm:rounded-2xl",
          color,
        )}
      >
        <Icon className="size-5 sm:size-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3 className="line-clamp-2 text-base font-black tracking-tight text-foreground sm:line-clamp-1 sm:text-lg">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-2 self-start sm:gap-3 sm:self-auto">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
              {time}
            </span>
            {isUnread && (
              <span
                className="size-2.5 rounded-full bg-primary animate-pulse"
                aria-label="Não lida"
              />
            )}
          </div>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
