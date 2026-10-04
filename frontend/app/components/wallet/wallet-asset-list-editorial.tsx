/**
 * WalletAssetListEditorial — Lista editorial (kinetic) de ativos em carteira.
 *
 * Layout: header editorial + lista glass-panel + paginacao numerada.
 * Cada item eh renderizado via `renderItem`, permitindo que investidor
 * (tokens/startups) e afiliado (startups afiliadas) compartilhem o mesmo
 * shell com dados proprios.
 *
 * Variantes:
 * - `compact`: reduz padding do header das colunas (px-8 py-3 → px-6 py-2).
 *   Usado em layouts 2-cols (`/wallet` em xl+) onde cada coluna tem ~640px
 *   e densidade maior compensa largura menor.
 */

import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Pagination } from "~/components/ui/pagination";

export interface WalletAssetColumn {
  /** Texto do cabecalho da coluna (ja em uppercase tracking-widest). */
  label: string;
  /** Classes Tailwind adicionais (ex: "text-right"). */
  className?: string;
}

interface WalletAssetListEditorialProps<T> {
  /** Titulo da secao (ex: "Ativos em Carteira"). */
  title: string;
  /** Lista de colunas exibidas no header da tabela. */
  columns: WalletAssetColumn[];
  /** Itens a serem renderizados. */
  items: T[];
  /** Funcao que renderiza cada item (cada linha da lista). */
  renderItem: (item: T, index: number) => ReactNode;
  /** Identificador unico por item (para key do React). */
  keyOf: (item: T, index: number) => string | number;
  /** Botao opcional no canto superior direito (ex: "Filtros"). */
  headerAction?: ReactNode;
  /** Mensagem exibida quando a lista esta vazia. */
  emptyMessage?: string;
  /** Estado de carregamento (mostra skeleton). */
  isLoading?: boolean;
  /** Paginacao — se fornecida, exibe componente de paginacao ao final. */
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  /** Rotulo do recurso exibido na paginacao (ex: "ativos"). */
  paginationItemLabel?: string;
  /** Modo compacto: reduz paddings para uso em grids 2-cols. Default false. */
  compact?: boolean;
}

export function WalletAssetListEditorial<T>({
  title,
  columns,
  items,
  renderItem,
  keyOf,
  headerAction,
  emptyMessage = "Nenhum item encontrado.",
  isLoading = false,
  pagination,
  paginationItemLabel = "itens",
  compact = false,
}: WalletAssetListEditorialProps<T>) {
  return (
    <section className={compact ? "mb-0" : "mb-24"}>
      <div className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        compact ? "mb-6" : "mb-8",
      )}>
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">
          {title}
        </h2>
        {headerAction}
      </div>

      <div className={cn("flex", compact ? "gap-6" : "gap-12")}>
        {/* Vertical Progress Spine (decorative, hidden on small screens) */}
        <div className="progress-spine flex-shrink-0 mt-2 hidden md:block" aria-hidden="true" />

        <div className="flex-grow">
          {/* Header columns */}
          <div
            className={cn(
              "hidden md:grid gap-4 text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-bold border-b border-white/5",
              compact ? "px-6 py-2" : "px-8 py-3",
            )}
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            }}
          >
            {columns.map((col, idx) => (
              <div key={idx} className={col.className}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-on-surface-variant text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {items.map((item, idx) => (
                <div key={keyOf(item, idx)}>{renderItem(item, idx)}</div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={pagination.onPageChange}
                itemLabel={paginationItemLabel}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
