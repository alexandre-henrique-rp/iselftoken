import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { resolveAssetUrl } from "~/lib/asset-url";
import { cn } from "~/lib/utils";

export interface InitialsImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> {
  /** Nome usado no alt e para gerar as iniciais do fallback. */
  name: string | null | undefined;
  /** URL absoluta ou caminho servido pelo backend. */
  src?: string | null;
  /** Texto alternativo; por padrão usa o nome recebido. */
  alt?: string;
  /** Conteúdo opcional para substituir as iniciais no fallback. */
  fallback?: ReactNode;
  /** Classes aplicadas ao conteúdo visual do fallback. */
  fallbackClassName?: string;
  /** Classes aplicadas especificamente ao texto das iniciais. */
  fallbackTextClassName?: string;
  /** Classes aplicadas à imagem, sem afetar o container. */
  imageClassName?: string;
}

function resolveImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return resolveAssetUrl(src);
}

function getInitials(name: string | null | undefined): string {
  const normalized = name?.trim() ?? "";
  if (!normalized) return "?";

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Renderiza uma imagem de avatar/logo e cai para iniciais quando a URL não
 * existe ou quando o navegador não consegue carregar a imagem.
 */
export function InitialsImage({
  name,
  src,
  alt,
  fallback,
  fallbackClassName,
  fallbackTextClassName,
  imageClassName,
  className,
  onError,
  ...imageProps
}: InitialsImageProps) {
  const resolvedSrc = resolveImageSrc(src);
  const [isHydrated, setIsHydrated] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    setFailedSrc(null);
  }, [resolvedSrc]);

  const showImage =
    isHydrated && Boolean(resolvedSrc) && failedSrc !== resolvedSrc;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-primary/10",
        className,
      )}
    >
      {showImage ? (
        <img
          {...imageProps}
          src={resolvedSrc ?? undefined}
          alt={alt ?? name ?? "Imagem"}
          title={alt ?? name ?? undefined}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={(event) => {
            // Diagnóstico: log explícito em dev para identificar URL quebrada,
            // CORS, ou bucket inacessível. Em prod, expõe o `title` no fallback
            // para inspeção via DevTools.
            if (typeof window !== "undefined") {
              console.warn(
                `[InitialsImage] Falha ao carregar logo "${name}". URL: ${resolvedSrc}. ` +
                  "Verifique se (1) a URL é acessível, (2) CORS permite o origin do frontend, " +
                  "(3) o bucket é público (ou presigned URL válida).",
                { src: resolvedSrc, alt },
              );
            }
            event.currentTarget.style.display = "none";
            onError?.(event);
            setFailedSrc(resolvedSrc);
          }}
        />
      ) : fallback ? (
        fallback
      ) : (
        <span
          aria-label={alt ?? name ?? "Imagem"}
          title={resolvedSrc ? `Logo indisponível: ${resolvedSrc}` : undefined}
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-primary",
            fallbackClassName,
            fallbackTextClassName,
          )}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
