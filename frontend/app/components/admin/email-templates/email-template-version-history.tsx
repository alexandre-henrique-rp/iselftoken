import { Eye, RotateCcw } from "lucide-react";
import type { EmailTemplateVersion } from "~/types/email-template";

interface EmailTemplateVersionHistoryProps {
  versions: EmailTemplateVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: EmailTemplateVersion) => void;
  onReactivateVersion?: (version: EmailTemplateVersion) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ARCHIVED: "bg-white/5 text-muted-foreground border-white/10",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.ARCHIVED;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function EmailTemplateVersionHistory({
  versions,
  selectedVersionId,
  onSelectVersion,
  onReactivateVersion,
}: EmailTemplateVersionHistoryProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Histórico de Versões
      </h3>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma versão encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {[...versions]
            .sort((a, b) => b.version - a.version)
            .map((version) => (
              <li
                key={version.id}
                className={`rounded-md border p-3 transition-colors ${
                  selectedVersionId === version.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">v{version.version}</span>
                      <StatusBadge status={version.status} />
                    </div>
                    <p className="mt-1 text-sm truncate">{version.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dateFmt.format(new Date(version.createdAt))}
                    </p>
                    {version.changeNote && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        {version.changeNote}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectVersion(version)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                      aria-label={`Visualizar versão ${version.version}`}
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </button>
                    {version.status === "PUBLISHED" && onReactivateVersion && (
                      <button
                        type="button"
                        onClick={() => onReactivateVersion(version)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                        aria-label={`Reativar versão ${version.version}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
