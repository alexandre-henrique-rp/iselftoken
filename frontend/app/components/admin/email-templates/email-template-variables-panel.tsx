import { Plus } from "lucide-react";
import type { EmailTemplateVersion } from "~/types/email-template";

interface EmailTemplateVariablesPanelProps {
  variablesSchema: EmailTemplateVersion["variablesSchema"];
  onInsertVariable: (variable: string) => void;
}

export function EmailTemplateVariablesPanel({
  variablesSchema,
  onInsertVariable,
}: EmailTemplateVariablesPanelProps) {
  const properties = variablesSchema.properties ?? {};

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Variáveis Disponíveis
      </h3>
      {Object.keys(properties).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma variável definida.</p>
      ) : (
        <ul className="space-y-2">
          {Object.entries(properties).map(([name, schema]) => (
            <li
              key={name}
              className="flex items-start justify-between gap-2 rounded-md border border-border p-2"
            >
              <div className="min-w-0 flex-1">
                <code className="text-sm font-mono text-primary">
                  {'{{'}
                  {name}
                  {'}}'}
                </code>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {schema.type}
                  {schema.description && ` — ${schema.description}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInsertVariable(`{{${name}}}`)}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                aria-label={`Inserir variável ${name}`}
              >
                <Plus className="h-3 w-3" />
                Inserir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
