import { Link } from "react-router";
import {
  ArrowRight,
  Sparkles,
  Crown,
  Plus,
  ChevronRight,
  Settings,
} from "lucide-react";
import { usePlan } from "~/hooks/use-plan";
import type { UserData } from "~/types/auth";

interface ProfilePlanBannerProps {
  user: UserData | null | undefined;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ProfilePlanBanner({ user }: ProfilePlanBannerProps) {
  const { plan, plans } = usePlan(user ?? null);

  if (!plan) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-surface-container to-primary/[0.04] p-6 md:p-8">
        {/* Glow decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/15 blur-3xl animate-pulse-ring"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-primary/10 blur-2xl"
        />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Sparkles className="size-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                Escolha seu perfil
              </span>
            </div>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Complete seu acesso à iSelfToken
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              Selecione como deseja participar da plataforma e tenha acesso aos
              recursos correspondentes ao seu perfil.
            </p>
          </div>

          <Link
            to="/pricing"
            className="group flex shrink-0 items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.97]"
          >
            Escolher meu perfil
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface-container-low p-5 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Seu perfil atual
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe seus perfis ativos e gerencie seus acessos.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((activePlan) => {
            const diasCriticos = activePlan.diasRestantes <= 7;
            const progress = Math.min(
              100,
              Math.max(
                5,
                (activePlan.diasRestantes / (activePlan.periodoMeses * 30)) *
                  100,
              ),
            );

            return (
              <article
                key={activePlan.id}
                className="rounded-xl border border-primary/10 bg-surface-container/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                    {activePlan.nome}
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Ativo
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Expira em
                    </span>
                    <span className="mt-1 block font-medium text-foreground">
                      {formatDate(activePlan.expiresAt)}
                    </span>
                  </span>
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Disponibilidade
                    </span>
                    <span
                      className={`mt-1 block font-medium ${diasCriticos ? "text-warning" : "text-foreground"}`}
                    >
                      {activePlan.diasRestantes} dia
                      {activePlan.diasRestantes !== 1 ? "s" : ""} restante
                      {activePlan.diasRestantes !== 1 ? "s" : ""}
                    </span>
                  </span>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
          <Link
            to="/profile/plans"
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-container-high px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:border-white/20 hover:text-foreground"
          >
            <Settings className="size-3.5" />
            GERENCIAR PERFIS
          </Link>
          <Link
            to="/pricing"
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.97]"
          >
            <Plus className="size-4" />
            ADICIONAR PERFIL
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
