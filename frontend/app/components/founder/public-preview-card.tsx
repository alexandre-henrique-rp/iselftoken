import { ExternalLink } from "lucide-react";
import type { StartupDetail } from "~/lib/startup-loader";

interface PublicPreviewCardProps {
  // Modo edição: objeto startup completo
  startup?: StartupDetail | null;
  // Modo criação: campos individuais
  name?: string;
  sector?: string;
  stage?: string;
  tagline?: string;
}

const STAGE_LABEL: Record<string, string> = {
  ideacao: "Ideação",
  mvp: "MVP",
  tracao: "Tração",
  operacao: "Operação",
  breakeven: "Break-even",
  acelerada: "Acelerada",
  startup_verificada: "Startup Verificada",
  startup: "Startup",
  potencial_unicornio: "Potencial Unicórnio",
};

const AREA_LABEL: Record<string, string> = {
  tecnologia_saas: "Tecnologia / SaaS",
  fintech: "Fintech",
  healthtech: "HealthTech",
  edtech: "EdTech",
  agritech: "AgriTech",
  cleantech: "CleanTech",
  ecommerce: "E-commerce",
  logistica: "Logística",
  outros: "Outros",
};

const cardClass = "space-y-4 rounded-xl border border-border bg-card p-4";
const previewClass =
  "space-y-3 rounded-lg border border-border bg-background p-4";
const statusClass =
  "rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary";

function PreviewContent({
  name,
  status,
  description,
}: {
  name: string;
  status?: string;
  description: string;
}) {
  return (
    <div className={previewClass}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold text-foreground">
          {name}
        </h3>
        {status && <span className={statusClass}>{status}</span>}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function PublicPreviewCard({
  startup,
  name,
  sector,
  stage,
  tagline,
}: PublicPreviewCardProps) {
  // Modo edição: link que abre a página pública em nova aba
  if (startup) {
    const publicUrl = startup.slug
      ? `/startup/${encodeURIComponent(startup.slug)}/preview`
      : "/";

    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
            Página pública
          </p>
          <span className="text-xs text-muted-foreground">Investidores</span>
        </div>

        <PreviewContent
          name={startup.name?.trim() || "Sua startup"}
          status={startup.platformStatus}
          description="Salve suas edições e visualize a página como investidores verão."
        />

        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Ver página pública
        </a>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Salve e atualize a aba para ver as alterações.
        </p>
      </div>
    );
  }

  // Modo criação (sem startup): mostra card simples (sem link)
  return (
    <div className={cardClass}>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
        Preview no marketplace
      </p>

      <PreviewContent
        name={name?.trim() || "Sua startup"}
        status={stage ? (STAGE_LABEL[stage] ?? stage) : undefined}
        description={
          [sector ? (AREA_LABEL[sector] ?? sector) : null, tagline || null]
            .filter(Boolean)
            .join(" · ") || "Preencha os dados para visualizar sua startup."
        }
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Atualiza em tempo real conforme você preenche.
      </p>
    </div>
  );
}
