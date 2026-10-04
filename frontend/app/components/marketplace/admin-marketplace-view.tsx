/**
 * S4-T03 — AdminMarketplaceView
 *
 * Pagina /admin/marketplace: lista 3 slots visuais (vazio/preenchido) +
 * busca por nome/slug + botoes Pinar/Despinear.
 *
 * Auth: ADMIN, COMPLIANCE ou FINANCEIRO (gate cosmético; backend revalida).
 */

import { useQuery } from "@tanstack/react-query";
import type { AdminPinnedStartup } from "~/types/admin-marketplace";
import { adminMarketplacePinnedQueryOptions } from "~/lib/queries";

export const MAX_PINNED_SLOTS = 3;

export function AdminMarketplaceView({
  initialPinned,
}: {
  initialPinned: AdminPinnedStartup[];
}) {
  const query = useQuery({
    ...adminMarketplacePinnedQueryOptions(),
    initialData: initialPinned,
  });

  const pinned = query.data ?? [];
  const count = pinned.length;
  const slotsLeft = MAX_PINNED_SLOTS - count;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Pinos manuais do marketplace
        </h2>
        <span
          className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
          data-testid="amp-counter"
        >
          {count}/{MAX_PINNED_SLOTS} pinos ativos
        </span>
      </div>

      {count === 0 ? (
        <div
          className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-400"
          data-testid="amp-empty"
        >
          Nenhum pino ativo. Pinar startups adiciona destaque editorial ao{" "}
          <code className="rounded bg-zinc-800 px-1">/marketplace/featured</code>.
        </div>
      ) : (
        <ul className="space-y-3">
          {pinned.map((p) => (
            <li
              key={p.startupId}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              data-testid={`amp-pin-${p.startupId}`}
            >
              <div>
                <p className="font-medium text-white">{p.nome}</p>
                <p className="text-xs text-zinc-500">{p.slug}</p>
                <p className="mt-2 text-sm text-zinc-300">
                  {p.manuallyPinnedReason}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
                data-testid={`amp-unpin-${p.startupId}`}
              >
                Despinear
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        {slotsLeft > 0
          ? `Voce ainda pode pinar ${slotsLeft} startup${slotsLeft > 1 ? "s" : ""}.`
          : "Limite maximo atingido. Despinar uma para liberar slot."}
      </p>
    </div>
  );
}