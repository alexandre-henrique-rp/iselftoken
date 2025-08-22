"use client";

import { TrText } from "@/components/tr-text";

/**
 * Tabela de startups do usuário (somente para role 'fundador').
 * Responsabilidade única: renderizar tabela e ações (placeholders) a partir de props.
 * Não realiza fetch. i18n via TrText. Botões reais devem ser implementados client-side com modais/rotas.
 */
export type StartupMin = {
  id: string | number;
  fantasia?: string;
  cnpj?: string;
};

export type TabelaStartupsDoUsuarioProps = {
  startups: StartupMin[];
  onAddClick?: () => void; // opcional, para abrir modal de cadastro
  onEditClick?: (id: string | number) => void; // opcional
  onDeleteClick?: (id: string | number) => void; // opcional
  disabledActions?: boolean; // para placeholders em server component
};

export function TabelaStartupsDoUsuario({ startups, onAddClick, onEditClick, onDeleteClick, disabledActions = true, }: TabelaStartupsDoUsuarioProps) {
  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-medium">
          <TrText k="perfil.startups.title" />
        </h2>
        <button
          disabled={disabledActions}
          onClick={onAddClick}
          title={disabledActions ? "Abrirá modal no client" : undefined}
          className="rounded bg-zinc-200 px-3 py-1 text-sm text-zinc-700 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-200"
        >
          <TrText k="perfil.startups.add" />
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2"><TrText k="perfil.startups.table.id" /></th>
              <th className="px-3 py-2"><TrText k="perfil.startups.table.fantasia" /></th>
              <th className="px-3 py-2"><TrText k="perfil.startups.table.cnpj" /></th>
              <th className="px-3 py-2"><TrText k="perfil.startups.table.actions" /></th>
            </tr>
          </thead>
          <tbody>
            {startups?.length ? (
              startups.map((s) => (
                <tr key={String(s.id)} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 align-top">{String(s.id)}</td>
                  <td className="px-3 py-2 align-top">{s.fantasia ?? '-'}</td>
                  <td className="px-3 py-2 align-top">{s.cnpj ?? '-'}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex gap-2">
                      <button
                        disabled={disabledActions}
                        onClick={() => onEditClick?.(s.id)}
                        className="rounded bg-zinc-200 px-2 py-1 text-xs disabled:cursor-not-allowed dark:bg-zinc-800"
                      >
                        <TrText k="perfil.startups.table.edit" />
                      </button>
                      <button
                        disabled={disabledActions}
                        onClick={() => onDeleteClick?.(s.id)}
                        className="rounded bg-zinc-200 px-2 py-1 text-xs disabled:cursor-not-allowed dark:bg-zinc-800"
                      >
                        <TrText k="perfil.startups.table.delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  <TrText k="perfil.startups.table.empty" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
