import { useState } from "react";
import {
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileImage,
} from "lucide-react";
import { cn } from "~/lib/utils";

export interface DocumentItem {
  label: string;
  /** URL completa (full size) do documento. */
  url: string;
  /** URL pequena (thumbnail) — opcional. Se ausente, usa url. */
  thumbUrl?: string | null;
  /** Tipo de documento — controla o ícone da miniatura. */
  kind: "logo" | "cover" | "doc";
}

interface DocumentThumbnailsProps {
  documents: DocumentItem[];
}

/**
 * Grid de miniaturas de documentos. Cada miniatura é clicável e abre
 * um modal com o documento em tamanho original.
 *
 * Logo e Cover (kind="logo"|"cover") → tenta renderizar miniatura de imagem.
 * Se a thumbnail falhar (PDF, SVG quebrado, etc), cai no fallback com ícone.
 * Demais tipos (kind="doc") → ícone genérico de documento.
 *
 * Modal:
 *  - Imagem: `<img>` com max-height controlado.
 *  - PDF ou tipo desconhecido: `<embed>` que renderiza inline (browser nativo).
 *  - Botão "Abrir em nova aba" sempre disponível como fallback.
 */
export function DocumentThumbnails({ documents }: DocumentThumbnailsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (documents.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {documents.map((doc, i) => (
          <DocThumb key={doc.url} doc={doc} onOpen={() => setActiveIndex(i)} />
        ))}
      </div>

      {activeIndex !== null && (
        <DocumentModal
          doc={documents[activeIndex]}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}

function DocThumb({ doc, onOpen }: { doc: DocumentItem; onOpen: () => void }) {
  const isImage = doc.kind === "logo" || doc.kind === "cover";
  const Icon =
    doc.kind === "logo" || doc.kind === "cover" ? FileImage : FileText;
  const src = doc.thumbUrl || doc.url;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col items-stretch gap-2 rounded-xl border border-white/10 bg-accent/30 overflow-hidden text-left",
        "hover:border-primary/40 hover:bg-accent/50 transition-all cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
      )}
      aria-label={`Abrir documento: ${doc.label}`}
    >
      <div className="aspect-square w-full bg-black/40 flex items-center justify-center relative">
        {isImage ? (
          <img
            src={src}
            alt={doc.label}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback para ícone se a miniatura falhar
              const target = e.currentTarget;
              target.style.display = "none";
              target.parentElement
                ?.querySelector("[data-fallback]")
                ?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          data-fallback
          className={cn(
            "flex flex-col items-center gap-1.5 text-muted-foreground/60",
            isImage ? "hidden" : "",
          )}
        >
          <Icon className="w-8 h-8" aria-hidden />
          <span className="text-[9px] font-black uppercase tracking-widest">
            {doc.label}
          </span>
        </div>
      </div>
      <div className="px-2 py-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
        <Icon className="w-3 h-3 shrink-0" aria-hidden />
        <span className="truncate">{doc.label}</span>
      </div>
    </button>
  );
}

function DocumentModal({
  doc,
  onClose,
}: {
  doc: DocumentItem;
  onClose: () => void;
}) {
  const isImage = doc.kind === "logo" || doc.kind === "cover";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Documento: ${doc.label}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-black/80 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-accent/30">
          <h2 className="text-sm sm:text-base font-black text-foreground truncate flex items-center gap-2">
            {doc.label}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition"
            >
              Abrir em nova aba
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-black/40">
          {isImage ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <img
                src={doc.url}
                alt={doc.label}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
              <FileText
                className="w-16 h-16 text-muted-foreground/40"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground max-w-md">
                Este documento não pode ser pré-visualizado inline. Clique em{" "}
                <span className="text-primary font-bold">
                  "Abrir em nova aba"
                </span>{" "}
                para visualizar.
              </p>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition"
              >
                Abrir documento
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
