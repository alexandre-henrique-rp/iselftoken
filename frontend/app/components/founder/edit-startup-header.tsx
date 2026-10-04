import type { CampaignStatus, PlatformStatus } from "~/lib/startup-status";
import { StatusPills } from "./status-pills";

interface EditStartupHeaderProps {
  name: string;
  platformStatus: PlatformStatus;
  campaignStatus: CampaignStatus;
}

export function EditStartupHeader({
  name,
  platformStatus,
  campaignStatus,
}: EditStartupHeaderProps) {
  return (
    <header className="mb-6 md:mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Edição de fundador
      </p>
      <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
          Editar startup
          <span className="text-muted-foreground/60"> / </span>
          <span className="text-primary">{name}</span>
        </h1>
        <StatusPills
          platformStatus={platformStatus}
          campaignStatus={campaignStatus}
        />
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Atualize os dados principais da sua startup para manter seu perfil e sua
        rodada prontos para análise e publicação.
      </p>
    </header>
  );
}
