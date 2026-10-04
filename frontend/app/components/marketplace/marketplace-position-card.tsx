/**
 * S3-T02 — MarketplacePositionCard
 *
 * Card do /founder/dashboard mostrando a posicao da startup no marketplace:
 *   - Score grande 0..100 com unidade "/100"
 *   - Badge "Em destaque por: <motivo>" se pinned
 *   - Badge "Score alto" se score >= 85 e nao pinned
 *   - Empty state "Vamos melhorar seu score?" se score === 0
 *   - Tooltip/section "Como melhorar?" com breakdown de 9 chaves
 *
 * Fonte: PRD_MARKETPLACE_IMPL.md §6.1
 */

import { useState } from "react";
import type {
  MarketplacePositionData,
  ScoreBreakdown,
} from "~/types/marketplace-position";

export type MarketplacePositionCardData = MarketplacePositionData;

type KeyInfo = { key: keyof ScoreBreakdown; label: string; description: string };

const BREAKDOWN_KEYS: KeyInfo[] = [
  { key: "kyc", label: "KYC aprovado", description: "Tenha seus documentos aprovados" },
  { key: "documents", label: "Documentos", description: "Submeta documentos para revisao" },
  { key: "seals", label: "Selos", description: "Conquiste selos de compliance/parceiros" },
  { key: "traction", label: "Investimentos", description: "Tenha mais de 5 investimentos" },
  { key: "raised", label: "Captacao", description: "Alcance >= 80% da meta" },
  { key: "deadline", label: "Prazo", description: "Mantenha captacao com prazo > 60 dias" },
  { key: "category", label: "Categoria", description: "Categorias premium: AI, SaaS, FinTech" },
  { key: "partnerships", label: "Parcerias", description: "Selos de parceria ativos" },
  { key: "activity", label: "Atividade", description: "Atualize a startup nos ultimos 7 dias" },
];

const HIGHSCORE_THRESHOLD = 85;
const EMPTY_SCORE_THRESHOLD = 1;

export function MarketplacePositionCard({
  data,
  hasActiveCampaign = false,
}: {
  data: MarketplacePositionCardData;
  /**
   * Quando true, o founder já criou uma campanha (DRAFT/OPEN/PAUSED/CLOSED/FUNDED/PAID_OUT).
   * Nesse caso, suprimimos a mensagem "Vamos melhorar seu score?" mesmo que o score
   * esteja zerado — porque o founder já demonstrou progresso e a copy de "ainda não
   * subiu" não se aplica. Mantém o card de score real quando score > 0.
   */
  hasActiveCampaign?: boolean;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  if (!data || (data.score <= EMPTY_SCORE_THRESHOLD && !hasActiveCampaign)) {
    return (
      <div
        className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6"
        data-testid="mp-empty"
      >
        <p className="text-sm text-zinc-300">
          Vamos melhorar seu score? Cadastre documentos, conquiste selos e mantenha
          sua captacao ativa para subir no marketplace.
        </p>
      </div>
    );
  }

  const isPinned = Boolean(data.pin?.manuallyPinned);
  const isHigh = data.score >= HIGHSCORE_THRESHOLD;
  const breakdown: Partial<ScoreBreakdown> = data.scoreBreakdown ?? {};

  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-950 p-6"
      data-testid="mp-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Posicao no marketplace
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="text-4xl font-bold text-white"
              data-testid="mp-score"
            >
              {data.score}
              <span className="text-base text-zinc-500">/100</span>
            </span>
          </div>
        </div>
        {isPinned && (
          <span
            className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary"
            data-testid="mp-pinned-badge"
          >
            Em destaque por: {data.pin.manuallyPinnedReason ?? "ADMIN"}
          </span>
        )}
        {!isPinned && isHigh && (
          <span
            className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400"
            data-testid="mp-highscore-badge"
          >
            Score alto
          </span>
        )}
      </div>

      <button
        type="button"
        className="mt-4 text-sm text-primary hover:underline"
        onClick={() => setBreakdownOpen((v) => !v)}
        data-testid="mp-breakdown-trigger"
      >
        {breakdownOpen ? "Ocultar" : "Como melhorar?"}
      </button>

      {breakdownOpen && (
        <div
          className="mt-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm"
          data-testid="mp-breakdown"
        >
          {BREAKDOWN_KEYS.map(({ key, label, description }) => {
            const k = breakdown[key];
            const earned = k?.earned ?? 0;
            const max = k?.max ?? 0;
            const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
            return (
<div
                  key={key}
                  className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 last:border-b-0 last:pb-0"
                  data-testid={`mp-bd-${key}`}
                  data-key={key}
                >
                <div>
                  <p className="font-medium text-white">
                    {label}
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      ({key})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs text-zinc-300">
                    {earned}/{max}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}