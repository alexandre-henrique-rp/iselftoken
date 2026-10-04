/**
 * Avatar/logo de startup — carrega diretamente da URL pública do S3/CDN.
 *
 * **Estratégia simples** (sem fallback via API — o browser carrega direto do S3):
 *  1. Renderiza `<img>` com a URL retornada pelo backend (presigned ou pública).
 *  2. Se a imagem falhar (CORS, AccessDenied, bucket privado), mostra avatar com
 *     iniciais + bandeira em gradiente brand.
 *
 * **Por que NÃO tem fallback via API**: o correto é o browser carregar diretamente
 * do object storage. Passar pela API desperdiça bandwidth do backend e adiciona
 * latência. O fix correto para AccessDenied é configurar o bucket S3 (Bucket
 * Policy + CORS), documentado em `backend/.env.example`.
 */
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

export interface StartupLogoAvatarProps {
  /** Nome da startup — usado para iniciais + alt. */
  name: string;
  /** URL pública do logo (do KYCProfile.url_sm). Pode ser null. */
  logo: string | null | undefined;
  /** Emoji de bandeira (🇧🇷 etc.) vindo do `pais.emoji` no backend. */
  bandeira?: string | null;
  /** Classes para o container (tamanho, raio). */
  className?: string;
  /** Classes extras para a imagem quando renderizada. */
  imageClassName?: string;
  /** Callback exposto para consumidores que queiram reagir à falha. */
  onLogoError?: (error: unknown) => void;
}

function getInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized) return "?";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function StartupLogoAvatar({
  name,
  logo,
  bandeira,
  className,
  imageClassName,
  onLogoError,
}: StartupLogoAvatarProps) {
  const logoSrc = logo ?? null;
  const [isHydrated, setIsHydrated] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    setFailedSrc(null);
  }, [logoSrc]);

  const showImage =
    isHydrated && Boolean(logoSrc) && failedSrc !== logoSrc;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden " +
          "rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 " +
          "border border-primary/30",
        className,
      )}
      aria-label={`Logo de ${name}`}
    >
      {showImage ? (
        <img
          src={logoSrc ?? undefined}
          alt={name}
          title={name}
          loading="lazy"
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={(event) => {
            if (typeof window !== "undefined") {
              console.warn(
                `[StartupLogoAvatar] Logo de "${name}" falhou ao carregar. ` +
                  `URL=${logoSrc}. Verifique (1) bucket S3 público, ` +
                  `(2) CORS permitindo o origin do frontend, ` +
                  `(3) CSP img-src do backend permitindo o domínio S3.`,
              );
            }
            onLogoError?.(event);
            setFailedSrc(logoSrc);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center gap-0.5 font-black text-primary">
          <span className="text-xs uppercase tracking-tight">{getInitials(name)}</span>
          {bandeira && (
            <span aria-hidden="true" className="text-sm leading-none">
              {bandeira}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
