/**
 * ExpandableAssetRow — Linha editorial de ativo (startup) com expansão
 * que revela os tokens individuais emitidos para o aporte.
 *
 * Comportamento:
 * - Click em qualquer área da linha (exceto botões de ação) alterna expandido/colapsado
 * - Quando expandido, mostra lista de tokens com shortCode + valor atual + data
 * - Empty state interno: "Tokens não emitidos ainda" (caso PENDING legado)
 *
 * Tokens exibidos (1 por linha, hash curto, valor atual, data):
 *   #a1b2c3d4   R$ 240,00   R$ 245,00   Adquirido em 04/10/2026
 */

import { useState } from "react";
import { ChevronDown, Coins } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import {
  EditorialAssetRow,
  type EditorialAssetColumn,
  EditorialAssetAvatar,
} from "./editorial-asset-row";

export interface WalletAssetToken {
  id: string;
  shortCode: string;
  quantity: number;
  purchaseVal: number;
  currentVal: number;
  acquiredAt: string;
  investmentId: number | null;
}

export interface ExpandableAssetRowAsset {
  investmentId: number;
  startupId: number;
  startupName: string;
  startupSlug: string;
  startupLogoUrl?: string | null;
  startupCategory?: string | null;
  campaignTitle: string;
  campaignStatus: string;
  tokensCount: number;
  tokens: WalletAssetToken[];
  investedAmount: number;
  totalCharged: number;
  currentValue: number;
}

interface ExpandableAssetRowProps {
  asset: ExpandableAssetRowAsset;
  /** ID opcional exibido em mono (ex: "#001"). */
  indexLabel?: string;
  /** Default expandido? Default false. */
  defaultExpanded?: boolean;
  /** Ação opcional no canto direito (ex: link "olho" para transparência). */
  actions?: ReactNode;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ExpandableAssetRow({
  asset,
  indexLabel,
  defaultExpanded = false,
  actions,
}: ExpandableAssetRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasTokens = asset.tokens.length > 0;

  const columns: EditorialAssetColumn[] = [
    {
      content: (
        <>
          <span className="block text-lg font-bold text-on-surface">
            {asset.startupName}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
            {asset.startupCategory || asset.campaignTitle}
          </span>
        </>
      ),
    },
    {
      content: (
        <span className="font-bold text-on-surface">
          {asset.tokensCount}{" "}
          <span className="text-[10px] text-on-surface-variant font-normal uppercase tracking-widest">
            TKN
          </span>
        </span>
      ),
    },
    {
      content: (
        <span className="text-xl font-bold tracking-tighter text-on-surface">
          {formatBRL(asset.investedAmount)}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden">
      <EditorialAssetRow
        id={indexLabel}
        avatar={
          <EditorialAssetAvatar
            src={asset.startupLogoUrl ?? null}
            alt={asset.startupName}
          />
        }
        columns={columns}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              disabled={!hasTokens}
              aria-expanded={expanded}
              aria-controls={`tokens-${asset.investmentId}`}
              aria-label={
                expanded ? "Ocultar tokens" : "Mostrar tokens individuais"
              }
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-300",
                expanded
                  ? "bg-primary text-on-primary-fixed border-primary"
                  : "bg-white/5 text-on-surface-variant border-white/10 hover:border-primary/40 hover:text-primary",
                !hasTokens && "opacity-40 cursor-not-allowed",
              )}
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
        }
        onClick={() => hasTokens && setExpanded((prev) => !prev)}
      />

      {expanded && (
        <div
          id={`tokens-${asset.investmentId}`}
          role="region"
          aria-label={`Tokens individuais de ${asset.startupName}`}
          className="border-t border-white/5 bg-black/30 backdrop-blur-sm"
        >
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">
                {asset.tokens.length} tokens individuais
              </span>
            </div>
            <div className="grid grid-cols-12 gap-3 px-2 py-2 text-[10px] uppercase tracking-widest text-on-surface-variant/70 font-bold border-b border-white/5">
              <div className="col-span-3">ID</div>
              <div className="col-span-3 text-right">Preço de compra</div>
              <div className="col-span-3 text-right">Valor atual</div>
              <div className="col-span-3 text-right">Adquirido em</div>
            </div>
            <ul className="divide-y divide-white/5">
              {asset.tokens.map((token) => (
                <li
                  key={token.id}
                  className="grid grid-cols-12 gap-3 py-2 px-2 text-xs hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-3 font-mono text-primary">
                    …{token.shortCode}
                  </div>
                  <div className="col-span-3 text-right text-on-surface">
                    {formatBRL(token.purchaseVal)}
                    {token.quantity > 1 && (
                      <span className="text-[10px] text-on-surface-variant ml-1">
                        × {token.quantity}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-right text-on-surface font-bold">
                    {formatBRL(token.currentVal)}
                  </div>
                  <div className="col-span-3 text-right text-on-surface-variant">
                    {formatDate(token.acquiredAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}