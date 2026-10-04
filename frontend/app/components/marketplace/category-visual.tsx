import type { StartupCardSeal } from "~/types/startup-featured";
import { resolveAssetUrl } from "~/lib/asset-url";
import { cn } from "~/lib/utils";

interface SealsRowProps {
  seals?: StartupCardSeal[];
  /** Tamanho de cada selo em pixels. */
  size?: number;
  /** Quantos selos no máximo. */
  max?: number;
  className?: string;
}

export function SealsRow({ seals, size = 32, max = 5, className }: SealsRowProps) {
  const items = (seals ?? []).slice(0, max);
  return (
    <div
      className={cn("flex items-center gap-0", className)}
      style={{ minHeight: size + 4 }}
    >
      {items.map((seal) => {
        const src = resolveAssetUrl(seal.imagePath);
        if (!src) return null;
        return (
          <img
            key={seal.slug}
            src={src}
            alt={seal.name}
            title={seal.name}
            style={{ width: size, height: size }}
            className="object-contain"
          />
        );
      })}
    </div>
  );
}
