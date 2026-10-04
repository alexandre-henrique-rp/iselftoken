import { useState } from "react";
import { Link } from "react-router";
import { Eye, Edit3, FileText, Plus } from "lucide-react";
import type { EmailTemplateSummary } from "~/types/email-template";
import { CreateEmailTemplateModal } from "./create-email-template-modal";

interface EmailTemplatesListProps {
  initialData?: EmailTemplateSummary[];
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

export function EmailTemplatesList({ initialData = [] }: EmailTemplatesListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const templates = initialData;

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Templates de Email</h1>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Template
          </button>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium">Nenhum template cadastrado</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Os templates de email são gerenciados pelo backend
            (GET/POST <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/admin/email-templates</code>).
            Quando houver cadastro, eles aparecerão aqui.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar Primeiro Template
          </button>
        </div>

        <CreateEmailTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates de Email</h1>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Versão</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                  {template.slug}
                </td>
                <td className="px-4 py-3">
                  {template.currentVersion ? (
                    <StatusBadge status={template.currentVersion.status} />
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {template.currentVersion ? (
                    <span>v{template.currentVersion.version}</span>
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/admin/email-templates/${template.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      aria-label={`Ver template ${template.name}`}
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Link>
                    <Link
                      to={`/admin/email-templates/${template.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition-colors"
                      aria-label={`Editar template ${template.name}`}
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateEmailTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
