/**
 * WalletTransactionStatement — Tabela editorial de extrato de transacoes.
 *
 * Layout: card glass-panel unico contendo tabela com colunas configuraveis
 * (padrao: Data/Hora, Valor, Status, Comprovante). Suporta paginacao
 * numerada e estado vazio/loading.
 *
 * Variantes:
 * - `compact`: reduz paddings das celulas (px-8 py-6 → px-6 py-4) e do
 *   cabecalho (px-8 py-5 → px-6 py-3). Usado em layouts 2-cols (`/wallet`
 *   em xl+) onde cada coluna tem ~640px e densidade maior compensa a
 *   largura menor.
 */

import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Pagination } from "~/components/ui/pagination";

export interface StatementColumn<T> {
  /** Cabecalho da coluna (uppercase tracking-widest). */
  label: string;
  /** Alinhamento da coluna. */
  align?: "left" | "center" | "right";
  /** Renderer da celula. */
  render: (item: T) => ReactNode;
}

interface WalletTransactionStatementProps<T> {
  /** Titulo da secao (ex: "Extrato de Transacoes"). */
  title: string;
  /** Itens a serem exibidos. */
  items: T[];
  /** Identificador unico por item (para key do React). */
  keyOf: (item: T, index: number) => string | number;
  /** Colunas da tabela. */
  columns: StatementColumn<T>[];
  /** Mensagem exibida quando a lista esta vazia. */
  emptyMessage?: string;
  /** Estado de carregamento. */
  isLoading?: boolean;
  /** Paginacao opcional. */
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  /** Rotulo do recurso (ex: "transacoes"). */
  paginationItemLabel?: string;
  /** Modo compacto: reduz paddings para uso em grids 2-cols. Default false. */
  compact?: boolean;
}

export function WalletTransactionStatement<T>({
  title,
  items,
  keyOf,
  columns,
  emptyMessage = "Nenhuma transacao encontrada.",
  isLoading = false,
  pagination,
  paginationItemLabel = "transacoes",
  compact = false,
}: WalletTransactionStatementProps<T>) {
  const alignClass = (align?: "left" | "center" | "right") =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  // Padding compacto: cabeçalho (px-6 py-3) + células (px-6 py-4).
  // Default: cabeçalho (px-8 py-5) + células (px-8 py-6).
  const headCell = compact ? "px-6 py-3" : "px-8 py-5";
  const bodyCell = compact ? "px-6 py-4" : "px-8 py-6";

  return (
    <section className={compact ? "mb-0" : "mb-24"}>
      <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-8">
        {title}
      </h2>

      {isLoading ? (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 p-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 skeleton rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-16 text-center">
          <p className="text-on-surface-variant text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-bold",
                        alignClass(col.align),
                        headCell,
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item, idx) => (
                  <tr
                    key={keyOf(item, idx)}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    {columns.map((col, idx2) => (
                      <td
                        key={idx2}
                        className={cn(alignClass(col.align), bodyCell)}
                      >
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </section>
  );
}
