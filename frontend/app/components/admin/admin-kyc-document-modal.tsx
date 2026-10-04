import { FileText, ImageOff, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { KycDoc } from "~/lib/kyc-status";
import { getUploadFullUrl, getUploadWebUrl } from "~/lib/upload-url";

export interface ActiveKycDocument {
  label: string;
  doc: KycDoc;
}

function sanitizeMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  try {
    const parsed = new URL(normalizedValue, "https://iselftoken.local");
    const isAbsoluteHttpUrl = /^https?:\/\//i.test(normalizedValue);
    const isRootRelativeUrl =
      normalizedValue.startsWith("/") && !normalizedValue.startsWith("//");

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      (!isAbsoluteHttpUrl && !isRootRelativeUrl)
    ) {
      return null;
    }

    return normalizedValue;
  } catch {
    return null;
  }
}

function getSafeMediaUrl(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const safeUrl = sanitizeMediaUrl(value);
    if (safeUrl) return safeUrl;
  }

  return null;
}

function getMimeType(doc: KycDoc): string {
  return (doc.mimeType ?? doc.mineType ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

export function isKycPdf(doc: KycDoc, sourceUrl: string): boolean {
  const mimeType = getMimeType(doc);
  if (mimeType === "application/pdf") return true;
  if (mimeType.startsWith("image/")) return false;

  const extension = (doc.extension ?? "")
    .replace(/^\./, "")
    .trim()
    .toLowerCase();
  if (extension === "pdf") return true;

  return (
    /\.pdf(?:$|[?#\s])/i.test(doc.originalName ?? "") ||
    /\.pdf(?:$|[?#\s])/i.test(sourceUrl)
  );
}

export function getKycPreviewUrl(doc?: KycDoc | null): string | null {
  if (!doc) return null;

  const webUrl = getUploadWebUrl(doc);
  return getSafeMediaUrl(
    webUrl,
    doc.url_web,
    doc.url_md,
    doc.url_sm,
    doc.url,
    doc.url_lg,
  );
}

export function getKycDetailedUrl(doc?: KycDoc | null): string | null {
  if (!doc) return null;

  const fullUrl = getUploadFullUrl(doc);
  return getSafeMediaUrl(fullUrl, doc.url, doc.url_md, doc.url_web);
}

interface KycDocumentModalProps {
  document: ActiveKycDocument;
  open: boolean;
  onClose: () => void;
}

export function KycDocumentModal({
  document,
  open,
  onClose,
}: KycDocumentModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const previewUrl = getKycPreviewUrl(document.doc);
  const sourceUrl = getKycDetailedUrl(document.doc);
  const modalUrl = sourceUrl ?? previewUrl;
  const pdf = isKycPdf(document.doc, modalUrl ?? previewUrl ?? "");
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setMediaError(false);
  }, [modalUrl, pdf]);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    const previousBodyOverflow = window.document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements =
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = window.document.activeElement;
      const isFocusInside = Boolean(dialogRef.current?.contains(activeElement));

      if (!isFocusInside) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.document.addEventListener("keydown", handleKeyDown);
    window.document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      window.document.removeEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = previousBodyOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

  const FallbackIcon = pdf ? FileText : ImageOff;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 top-20 z-[9999] flex items-start justify-center overflow-y-auto bg-black/90 px-2 pb-2 pt-2 backdrop-blur-md sm:px-4 sm:pb-4 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-8"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative flex max-h-[calc(100dvh_-_6rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-container-highest shadow-[0_0_18px_rgba(213,0,249,0.25),0_24px_80px_rgba(0,0,0,0.65)] sm:max-h-[calc(100dvh_-_7rem)] lg:max-h-[calc(100dvh_-_9rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_18px_rgba(213,0,249,0.25)]"
                aria-hidden="true"
              />
              Visualização detalhada
            </p>
            <h2
              id={titleId}
              className="truncate text-xl font-bold tracking-tight text-foreground"
            >
              {document.label}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm"
            >
              Visualização ampliada do arquivo enviado para análise.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="group shrink-0 rounded-xl border border-white/10 bg-black/30 p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-highest"
            aria-label={`Fechar ${document.label}`}
          >
            <X
              className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90"
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-black/20 p-2 sm:p-4 lg:p-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                Documento enviado
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {pdf ? "PDF" : "Imagem"}
              </span>
            </div>

            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-white/10 bg-black p-2 shadow-inner sm:min-h-[280px] sm:p-3 lg:min-h-[340px] lg:p-4">
              {mediaError || !modalUrl ? (
                <div
                  className="flex min-h-[180px] w-full max-w-md flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <span className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                    <FallbackIcon
                      className="h-8 w-8 text-primary/70"
                      aria-hidden="true"
                    />
                  </span>
                  <p className="max-w-md text-sm leading-relaxed">
                    Não foi possível carregar a prévia deste documento.
                  </p>
                </div>
              ) : pdf ? (
                <iframe
                  src={modalUrl}
                  title={`Visualização de ${document.label}`}
                  className="h-[48vh] min-h-[220px] max-h-[520px] w-full rounded-xl border border-white/10 bg-white shadow-2xl"
                  onError={() => setMediaError(true)}
                />
              ) : (
                <img
                  src={modalUrl}
                  alt={document.label}
                  referrerPolicy="no-referrer"
                  className="max-h-[52vh] max-w-full rounded-xl object-contain shadow-2xl"
                  onError={() => setMediaError(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
