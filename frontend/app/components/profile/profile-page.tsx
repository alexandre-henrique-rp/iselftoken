import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useUser } from "~/hooks/use-user";
import { meQueryOptions } from "~/lib/queries";
import { ProfileAccountNav } from "./profile-account-nav";
import { ProfileAddressCard } from "./profile-address-card";
import { ProfileDocuments } from "./profile-documents";
import { ProfileHero } from "./profile-hero";
import { ProfileIdentityCard } from "./profile-identity-card";
import { ProfilePlanBanner } from "./profile-plan-banner";

function ProfilePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando perfil...</span>
      <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-container-high" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-surface-container-high" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-container" />
      <div className="h-14 animate-pulse rounded-2xl bg-surface-container" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-surface-container" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface-container" />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, isLoading, error } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const scrollToVerification = () => {
    document.getElementById("verificacao")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isLoading) return <ProfilePageSkeleton />;

  if (error || !user) {
    const isUnauthorized =
      error instanceof Response
        ? error.status === 401
        : error instanceof Error && "status" in error
          ? (error as { status: number }).status === 401
          : false;

    if (isUnauthorized) {
      navigate("/login", { replace: true });
      return <ProfilePageSkeleton />;
    }

    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 text-center">
        <AlertCircle className="mb-4 size-10 text-destructive/80" />
        <h1 className="text-xl font-bold text-foreground">
          Não foi possível carregar seu perfil
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Tente novamente. Seus dados permanecem protegidos e nenhuma alteração
          foi realizada.
        </p>
        <button
          type="button"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
          }
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Tentar novamente
        </button>
      </section>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-clip px-1.5 pb-6 pt-3 md:px-0 md:pb-8 md:pt-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-40 z-0 -translate-x-1/2 select-none whitespace-nowrap text-[clamp(8rem,20vw,20rem)] font-black tracking-[-0.08em] text-foreground/[0.025]"
      >
        PROFILE
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 xl:max-w-[1400px]">
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Conta
            </span>
            <h1 className="text-4xl font-extrabold leading-none tracking-[-0.05em] text-foreground sm:text-5xl lg:text-[4rem]">
              Meu Perfil
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Gerencie seus dados, sua verificação de identidade e o plano da
              sua conta.
            </p>
          </div>
        </header>

        <section id="resumo" className="scroll-mt-36">
          <ProfileHero user={user} onKycClick={scrollToVerification} />
        </section>

        <ProfileAccountNav />

        <div className="grid gap-6 lg:grid-cols-2">
          <section id="dados-pessoais" className="scroll-mt-36">
            <ProfileIdentityCard user={user} />
          </section>

          <section id="endereco" className="scroll-mt-36">
            <ProfileAddressCard user={user} />
          </section>
        </div>

        <section id="verificacao" className="scroll-mt-36">
          <ProfileDocuments user={user} />
        </section>

        <section id="perfil" className="scroll-mt-36">
          <ProfilePlanBanner user={user} />
        </section>
      </div>
    </main>
  );
}
