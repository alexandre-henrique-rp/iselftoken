import { FileText, Home, Maximize2 } from "lucide-react";
import { useCallback, useState } from "react";
import { docStatusUI, type KycDoc } from "~/lib/kyc-status";
import { cn } from "~/lib/utils";
import {
  getKycDetailedUrl,
  getKycPreviewUrl,
  KycDocumentModal,
  type ActiveKycDocument,
} from "./admin-kyc-document-modal";

interface AdminKycResidenceProps {
  comprovante?: KycDoc | null;
}

/** Comprovante de residência real do usuário. */
export function AdminKycResidence({ comprovante }: AdminKycResidenceProps) {
  const ui = docStatusUI(comprovante?.status);
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);
  const previewUrl = getKycPreviewUrl(comprovante);
  const detailedUrl = getKycDetailedUrl(comprovante);
  const activeDocument: ActiveKycDocument | null = comprovante
    ? {
        label: "Comprovante de residência",
        doc: comprovante,
      }
    : null;
  const canPreview = Boolean(activeDocument && (previewUrl || detailedUrl));

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Evidência de endereço
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
              <Home className="h-5 w-5 text-primary" aria-hidden="true" />
              Comprovante de residência
            </h2>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest",
              ui.className,
            )}
          >
            {ui.label}
          </span>
        </div>

        {canPreview && activeDocument ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="Visualizar comprovante de residência"
            className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4 text-left outline-none transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:gap-5 sm:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {activeDocument.doc.originalName || "Comprovante enviado"}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Clique para visualizar o arquivo
              </p>
            </div>
            <Maximize2
              className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary"
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            Nenhum comprovante enviado
          </div>
        )}
      </section>

      {activeDocument && canPreview && (
        <KycDocumentModal
          document={activeDocument}
          open={modalOpen}
          onClose={closeModal}
        />
      )}
    </>
  );
}
