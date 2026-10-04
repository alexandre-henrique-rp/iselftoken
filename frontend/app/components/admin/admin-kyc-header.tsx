import { ShieldCheck } from "lucide-react";
import { docStatusUI } from "~/lib/kyc-status";
import { cn } from "~/lib/utils";

interface AdminKycHeaderProps {
  protocol: string;
  receivedAt: string;
  name: string;
  userType: string;
  status?: string | null;
}

export function AdminKycHeader({
  protocol,
  receivedAt,
  name,
  userType,
  status,
}: AdminKycHeaderProps) {
  const statusUi = docStatusUI(status || "PENDING");

  return (
    <header className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              {protocol}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Recebido em {receivedAt}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>
            <p className="mt-2 break-words text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {userType}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "inline-flex shrink-0 items-center gap-2 self-start rounded-xl border px-4 py-3 md:self-center",
            statusUi.className,
          )}
          aria-label={`Status do KYC: ${statusUi.label}`}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em]">
            {statusUi.label}
          </span>
        </div>
      </div>
    </header>
  );
}
