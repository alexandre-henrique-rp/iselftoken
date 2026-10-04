import { CalendarDays, ShieldCheck, Star } from "lucide-react";
import { InitialsImage } from "~/components/ui/initials-image";
import { getUploadWebUrl } from "~/lib/upload-url";
import type { Pais, Subscription, UserData } from "~/types/auth";

function paisFromUser(u: UserData | null | undefined): Pais | null {
  if (!u?.pais) return null;
  if (typeof u.pais === "string") {
    try {
      return JSON.parse(u.pais) as Pais;
    } catch {
      return null;
    }
  }
  return u.pais;
}

interface ProfileHeroProps {
  user: UserData | null | undefined;
  onKycClick?: () => void;
}

function activeSubscription(
  user: UserData | null | undefined,
): Subscription | null {
  return user?.subscriptions?.find((s) => s.status === "ACTIVE") ?? null;
}

function daysRemaining(expiresAt: string): number | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function memberSinceLabel(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function kycCount(user: UserData | null | undefined): {
  approved: number;
  total: number;
} {
  const fields = ["avatar", "documento", "biofacial", "comprovante"] as const;
  const approved = fields.reduce(
    (acc, key) => acc + (user?.[key]?.status === "APPROVED" ? 1 : 0),
    0,
  );
  return { approved, total: fields.length };
}

export function ProfileHero({ user, onKycClick }: ProfileHeroProps) {
  const sub = activeSubscription(user);
  const planName = sub?.plan?.nome ?? "Sem plano ativo";
  const days = sub?.expiresAt ? daysRemaining(sub.expiresAt) : null;
  const kyc = kycCount(user);
  const kycComplete = kyc.approved === kyc.total;
  const memberSince = memberSinceLabel(user?.createdAt);
  const pais = paisFromUser(user);
  const progress = (kyc.approved / kyc.total) * 100;

  return (
    <section className="glass-panel relative overflow-hidden rounded-xl border border-white/5 p-5 md:p-6 lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/3 size-64 rounded-full bg-primary-container/10 blur-3xl"
      />

      <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/20 sm:size-24">
            <InitialsImage
              name={user?.nome}
              src={getUploadWebUrl(user?.avatar)}
              alt={`Avatar de ${user?.nome || "usuário"}`}
              className="size-full rounded-2xl bg-transparent"
              fallbackClassName="bg-transparent"
              fallbackTextClassName="text-2xl font-black text-primary-foreground sm:text-3xl"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {user?.nome ?? "—"}
              </h2>
              {pais ? (
                <span
                  className="shrink-0 text-base leading-none"
                  aria-label={`País: ${pais.nome}`}
                  title={pais.nome}
                >
                  {pais.emoji}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {user?.email ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Star className="size-3.5" aria-hidden="true" />
                {planName}
              </span>
              {days !== null ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {days} dias restantes
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-5 lg:min-w-[360px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <button
            type="button"
            onClick={onKycClick}
            aria-label="Ver status da verificação de identidade"
            className="rounded-xl p-1 text-left transition-colors hover:bg-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Verificação
            </div>
            <div
              className={
                kycComplete
                  ? "text-sm font-black text-emerald-400"
                  : "text-sm font-black text-amber-400"
              }
            >
              {kycComplete
                ? "Concluída"
                : `${kyc.approved} de ${kyc.total} etapas`}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-low">
              <div
                className={
                  kycComplete
                    ? "h-full rounded-full bg-emerald-400"
                    : "h-full rounded-full bg-primary"
                }
                style={{ width: `${progress}%` }}
              />
            </div>
          </button>

          <div className="rounded-xl p-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <CalendarDays
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Membro desde
            </div>
            <div className="text-sm font-black capitalize text-foreground sm:text-base">
              {memberSince}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Conta {user?.isActive ? "ativa" : "inativa"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
