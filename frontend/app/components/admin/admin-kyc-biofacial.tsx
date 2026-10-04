import {
  ExternalLink,
  ImageOff,
  Maximize2,
  UserCheck,
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { docStatusUI, type KycDoc } from "~/lib/kyc-status";
import { getUploadFullUrl, getUploadWebUrl } from "~/lib/upload-url";
import { cn } from "~/lib/utils";

interface AdminKycBiofacialProps {
  biofacial?: KycDoc | null;
}

type MediaKind = "image" | "video";

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

function detectMediaKind(
  document?: KycDoc | null,
  sourceUrls: Array<string | null | undefined> = [],
): MediaKind {
  const mimeType = (document?.mimeType ?? document?.mineType ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";

  const extension = (document?.extension ?? "")
    .replace(/^\./, "")
    .trim()
    .toLowerCase();
  if (extension === "mp4" || extension === "webm") return "video";

  const mediaHint = [document?.originalName, ...sourceUrls]
    .filter(Boolean)
    .join(" ");
  return /\.(mp4|webm)(?:$|[?#\s])/i.test(mediaHint) ? "video" : "image";
}

function BiofacialMediaFallback({
  hasSource,
  mediaKind,
}: {
  hasSource: boolean;
  mediaKind: MediaKind;
}) {
  const Icon = hasSource && mediaKind === "video" ? VideoOff : ImageOff;

  return (
    <div
      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-black/30 px-4 text-center text-muted-foreground/60"
      role="status"
      aria-live="polite"
    >
      <Icon className="h-8 w-8" aria-hidden="true" />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {hasSource ? "Prévia indisponível" : "Não enviada"}
      </span>
      {hasSource && (
        <span className="max-w-xs text-xs text-muted-foreground">
          Não foi possível carregar a captura biométrica.
        </span>
      )}
    </div>
  );
}

interface BiofacialVideoModalProps {
  open: boolean;
  src: string;
  highQuality: boolean;
  mediaError: boolean;
  onClose: () => void;
  onMediaError: () => void;
}

function BiofacialVideoModal({
  open,
  src,
  highQuality,
  mediaError,
  onClose,
  onMediaError,
}: BiofacialVideoModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), a[href], video, [tabindex]:not([tabindex="-1"])';

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
      const activeElement = document.activeElement;
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

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

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
              Vídeo da biometria facial
            </h2>
            <p
              id={descriptionId}
              className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm"
            >
              {highQuality
                ? "Visualização do arquivo original ou da variante de maior qualidade."
                : "Visualização do arquivo biométrico disponível."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="group shrink-0 rounded-xl border border-white/10 bg-black/30 p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-highest"
            aria-label="Fechar vídeo da biometria facial"
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
                Arquivo biométrico
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {highQuality ? "Alta qualidade" : "Fonte disponível"}
              </span>
            </div>

            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-white/10 bg-black p-2 shadow-inner sm:min-h-[280px] sm:p-3 lg:min-h-[340px] lg:p-4">
              {mediaError ? (
                <div
                  className="flex min-h-[180px] w-full max-w-md flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <span className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                    <VideoOff
                      className="h-8 w-8 text-primary/70"
                      aria-hidden="true"
                    />
                  </span>
                  <p className="max-w-md text-sm leading-relaxed">
                    Não foi possível carregar o vídeo em alta qualidade.
                  </p>
                </div>
              ) : (
                <video
                  key={src}
                  src={src}
                  controls
                  playsInline
                  preload="auto"
                  aria-label="Vídeo completo da biometria facial"
                  className="max-h-[52vh] w-full max-w-4xl rounded-xl bg-black object-contain shadow-2xl"
                  onError={onMediaError}
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

/**
 * Biometria facial. Mostra o documento biométrico real e o status persistido.
 * O backend não calcula face-match; por isso nenhum percentual é fabricado.
 */
export function AdminKycBiofacial({ biofacial }: AdminKycBiofacialProps) {
  const ui = docStatusUI(biofacial?.status);
  const sourceUrl = getUploadWebUrl(biofacial);
  const fullSourceUrl = getUploadFullUrl(biofacial);
  const src = getSafeMediaUrl(
    sourceUrl,
    biofacial?.url_web,
    biofacial?.url_md,
    biofacial?.url_sm,
    biofacial?.url,
    biofacial?.url_lg,
  );
  const modalSrc = getSafeMediaUrl(
    fullSourceUrl,
    biofacial?.url,
    biofacial?.url_md,
    biofacial?.url_web,
  );
  const highQualitySrc = getSafeMediaUrl(
    biofacial?.url,
    biofacial?.url_md,
    biofacial?.url_web,
  );
  const mediaKind = detectMediaKind(biofacial, [
    sourceUrl,
    fullSourceUrl,
    biofacial?.url,
    biofacial?.url_lg,
  ]);
  const openUrl = modalSrc ?? src;
  const hasSource = Boolean(
    sourceUrl ||
    fullSourceUrl ||
    biofacial?.url ||
    biofacial?.url_lg ||
    biofacial?.url_md ||
    biofacial?.url_sm,
  );
  const [mediaError, setMediaError] = useState(false);
  const [modalMediaError, setModalMediaError] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const handleCloseVideoModal = useCallback(() => {
    setVideoModalOpen(false);
  }, []);

  useEffect(() => {
    setMediaError(false);
    setModalMediaError(false);
  }, [mediaKind, modalSrc, src, videoModalOpen]);

  const previewVisible = Boolean(src) && !mediaError;
  const canOpenVideo = mediaKind === "video" && Boolean(modalSrc);

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Verificação complementar
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
              <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Biometria facial
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

        <div className="flex justify-center rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
          <div className="w-full max-w-sm text-center">
            {previewVisible ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-primary/50 bg-black/60 shadow-[0_0_35px_rgba(213,0,249,0.16)]">
                {mediaKind === "video" ? (
                  <video
                    key={src}
                    src={src ?? undefined}
                    autoPlay
                    controls
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    aria-label="Prévia automática da biometria facial"
                    className="h-full w-full object-cover"
                    onError={() => setMediaError(true)}
                  />
                ) : (
                  <img
                    key={src}
                    src={src ?? undefined}
                    alt="Prévia da biometria facial"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => setMediaError(true)}
                  />
                )}
              </div>
            ) : (
              <BiofacialMediaFallback
                hasSource={hasSource}
                mediaKind={mediaKind}
              />
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {canOpenVideo && (
                <button
                  type="button"
                  onClick={() => {
                    setModalMediaError(false);
                    setVideoModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-[0_0_18px_rgba(213,0,249,0.25)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {highQualitySrc
                    ? "Ver em alta qualidade"
                    : "Visualizar vídeo"}
                </button>
              )}

              {openUrl && hasSource && mediaKind !== "video" && (
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noreferrer"
                  referrerPolicy="no-referrer"
                  aria-label="Abrir biometria facial em nova aba"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-accent/30 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Abrir arquivo
                </a>
              )}
            </div>

            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {mediaKind === "video"
                ? "Prévia automática da captura biométrica"
                : "Captura biométrica"}
            </p>
          </div>
        </div>
      </section>

      {canOpenVideo && modalSrc && (
        <BiofacialVideoModal
          open={videoModalOpen}
          src={modalSrc}
          highQuality={Boolean(highQualitySrc)}
          mediaError={modalMediaError}
          onClose={handleCloseVideoModal}
          onMediaError={() => setModalMediaError(true)}
        />
      )}
    </>
  );
}
