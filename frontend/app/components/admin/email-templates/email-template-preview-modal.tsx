import { X } from "lucide-react";
import { sanitizeHtmlPreview } from "~/lib/sanitize-html";
import type { RenderedEmail } from "~/types/email-template";

interface EmailTemplatePreviewModalProps {
  rendered: RenderedEmail | null;
  isLoading: boolean;
  onClose: () => void;
}

export function EmailTemplatePreviewModal({
  rendered,
  isLoading,
  onClose,
}: EmailTemplatePreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Preview do email"
    >
      <div className="bg-background rounded-lg border border-border shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Preview do Email</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
            aria-label="Fechar preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : rendered ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Assunto:
                </label>
                <p className="mt-1 font-medium">{rendered.subject}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Variáveis utilizadas:
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rendered.usedVariables.length > 0
                    ? rendered.usedVariables.join(", ")
                    : "Nenhuma"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Conteúdo HTML:
                </label>
                <div
                  className="mt-1 rounded-md border border-border p-3 bg-white text-black"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtmlPreview(rendered.html),
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Conteúdo Texto:
                </label>
                <pre className="mt-1 rounded-md border border-border p-3 bg-muted/50 text-sm whitespace-pre-wrap">
                  {rendered.text}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Clique em &quot;Preview&quot; para gerar a visualização.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
