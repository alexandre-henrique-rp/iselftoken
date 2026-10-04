/**
 * EditorialAssetRow — Linha editorial (glass-panel + hover) usada na lista
 * de ativos das carteiras (investidor ou afiliado).
 *
 * Estrutura padrao: avatar/logo + 3-4 colunas de texto + acoes. Grid
 * responsivo: stack vertical em mobile, 12-cols em desktop.
 */

import type { ReactNode } from "react";
import { InitialsImage } from "~/components/ui/initials-image";

export interface EditorialAssetColumn {
  /** Conteudo da celula (texto, valor, etc). */
  content: ReactNode;
  /** Classes adicionais (ex: "text-right", "font-black"). */
  className?: string;
}

interface EditorialAssetRowProps {
  /** Avatar/logo do item (quadrado 48x48 ou 56x56). */
  avatar: ReactNode;
  /** ID opcional exibido em mono (ex: "#001"). */
  id?: string;
  /** Colunas de conteudo (ja em ordem, na horizontal). */
  columns: EditorialAssetColumn[];
  /** Acoes no canto direito (botoes circulares ou chips). */
  actions?: ReactNode;
  /** Numero de colunas no grid desktop (padrao 12). */
  gridCols?: number;
  /** Callback opcional ao clicar na linha inteira. */
  onClick?: () => void;
}

export function EditorialAssetRow({
  avatar,
  id,
  columns,
  actions,
  gridCols = 12,
  onClick,
}: EditorialAssetRowProps) {
  return (
    <div
      className={`grid grid-cols-12 items-center px-6 md:px-8 py-6 glass-panel rounded-xl hover:bg-surface-container transition-all group border border-white/5 hover:border-primary/20 gap-4 md:gap-0 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      {id && (
        <div className="col-span-2 md:col-span-1 font-mono text-primary text-sm opacity-50 group-hover:opacity-100 transition-opacity">
          {id}
        </div>
      )}

      {/* Avatar + Name/Subtitle column */}
      <div
        className={`flex items-center gap-4 min-w-0 ${id ? "col-span-10 md:col-span-4" : "col-span-12 md:col-span-5"}`}
      >
        {avatar}
        <div className="min-w-0 flex flex-col gap-1">
          {columns[0]?.content}
        </div>
      </div>

      {/* Remaining columns distributed across remaining grid */}
      {columns.slice(1).map((col, idx) => (
        <div
          key={idx}
          className={`text-left md:text-right ${col.className ?? ""}`}
          style={{
            gridColumn: `span ${Math.max(2, Math.floor((gridCols - (id ? 5 : 5)) / Math.max(1, columns.length - 1)))} / span ${Math.max(2, Math.floor((gridCols - (id ? 5 : 5)) / Math.max(1, columns.length - 1)))}`,
          }}
        >
          {col.content}
        </div>
      ))}

      {/* Actions column */}
      {actions && (
        <div
          className={`col-span-12 md:col-span-${id ? 2 : 3} text-right flex items-center justify-end gap-3 border-t border-white/5 md:border-none pt-4 md:pt-0 mt-4 md:mt-0`}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * EditorialAssetAvatar — Avatar/logotipo padrao (quadrado com img + fallback).
 */
interface EditorialAssetAvatarProps {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
  size?: "sm" | "md";
}

export function EditorialAssetAvatar({
  src,
  alt,
  fallback,
  size = "md",
}: EditorialAssetAvatarProps) {
  const sizeClass = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <InitialsImage
      name={alt}
      src={src}
      alt={alt}
      fallback={fallback}
      className={`${sizeClass} rounded-lg border border-white/5 bg-white/5`}
      fallbackClassName="bg-gradient-to-br from-primary/20 to-primary/5"
      fallbackTextClassName="text-xs font-black"
      loading="lazy"
    />
  );
}
