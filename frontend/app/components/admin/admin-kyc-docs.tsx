import { ExternalLink, FileText, ImageOff, Maximize2 } from "lucide-react";
import { useCallback, useState } from "react";
import { docStatusUI, type KycDoc } from "~/lib/kyc-status";
import { cn } from "~/lib/utils";
import {
  getKycDetailedUrl,
  getKycPreviewUrl,
  isKycPdf,
  KycDocumentModal,
  type ActiveKycDocument,
} from "./admin-kyc-document-modal";

interface AdminKycDocsProps {
  documents?: {
    avatar?: KycDoc | null;
    comprovante?: KycDoc | null;
    documento?: KycDoc | null;
    biofacial?: KycDoc | null;
  } | null;
}

function DocImageCard({
  label,
  doc,
  previewable = false,
  onPreview,
}: {
  label: string;
  doc?: KycDoc | null;
  previewable?: boolean;
  onPreview?: () => void;
}) {
  const ui = docStatusUI(doc?.status);
  const src = doc ? getKycPreviewUrl(doc) : null;
  const detailedUrl = doc ? getKycDetailedUrl(doc) : null;
  const mediaUrl = detailedUrl ?? src;
  const pdf = !!doc && !!src && isKycPdf(doc, src);
  const canPreview = Boolean(doc && src && previewable && onPreview);

  return (
    <article className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest",
            ui.className,
          )}
        >
          {ui.label}
        </span>
      </div>

      {src && doc ? (
        canPreview ? (
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Visualizar ${label}`}
            className="group relative block h-56 w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 text-left outline-none transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {pdf ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
                <FileText
                  className="h-10 w-10 text-primary"
                  aria-hidden="true"
                />
                <span className="max-w-full truncate text-xs font-bold text-foreground">
                  {doc.originalName || "Documento PDF"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Visualizar documento
                </span>
              </div>
            ) : (
              <>
                <img
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  src={src}
                  alt={label}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Visualizar
                </span>
              </>
            )}
          </button>
        ) : (
          <a
            href={mediaUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            referrerPolicy="no-referrer"
            aria-label={`Abrir ${label}`}
            className="group relative block overflow-hidden rounded-lg border border-white/10 bg-black/30 outline-none transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {pdf ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3 px-5 text-center">
                <FileText
                  className="h-10 w-10 text-primary"
                  aria-hidden="true"
                />
                <span className="max-w-full truncate text-xs font-bold text-foreground">
                  {doc.originalName || "Documento PDF"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Abrir arquivo
                </span>
              </div>
            ) : (
              <>
                <img
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  src={src}
                  alt={label}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Abrir
                </span>
              </>
            )}
          </a>
        )
      ) : (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-black/20 text-muted-foreground/50">
          <ImageOff className="h-8 w-8" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Não enviado
          </span>
        </div>
      )}
    </article>
  );
}

export function AdminKycDocs({ documents }: AdminKycDocsProps = {}) {
  const [activeDocument, setActiveDocument] =
    useState<ActiveKycDocument | null>(null);
  const closeDocumentModal = useCallback(() => {
    setActiveDocument(null);
  }, []);
  const identityDocument = documents?.documento;
  const avatarDocument = documents?.avatar;
  const openIdentityModal = identityDocument
    ? () =>
        setActiveDocument({
          label: "Documento de identidade",
          doc: identityDocument,
        })
    : undefined;
  const openAvatarModal = avatarDocument
    ? () =>
        setActiveDocument({
          label: "Selfie / foto",
          doc: avatarDocument,
        })
    : undefined;

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Evidências recebidas
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              Identidade
            </h2>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            2 arquivos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DocImageCard
            label="Documento de identidade"
            doc={identityDocument}
            previewable
            onPreview={openIdentityModal}
          />
          <DocImageCard
            label="Selfie / foto"
            doc={avatarDocument}
            previewable
            onPreview={openAvatarModal}
          />
        </div>
      </section>

      {activeDocument && (
        <KycDocumentModal
          document={activeDocument}
          open
          onClose={closeDocumentModal}
        />
      )}
    </>
  );
}
