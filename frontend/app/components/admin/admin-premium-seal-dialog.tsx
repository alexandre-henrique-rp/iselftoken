import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { Crown, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminStartupSealsQueryOptions } from "~/lib/queries";
import {
  PREMIUM_SEAL_CATALOG,
  type PremiumSealCatalogEntry,
} from "~/lib/premium-seal-catalog";
import { cn } from "~/lib/utils";

interface PremiumDialogStartup {
  id: number | string;
  nome: string;
  score?: number | null;
  seals?: Array<{ id: number; slug: string; name: string }>;
}

interface AdminPremiumSealDialogProps {
  startup: PremiumDialogStartup | null;
  onClose: () => void;
  /** Snackbar disparado após sucesso. */
  onAfterSuccess?: (message: string) => void;
  /** Snackbar disparado em erro (já no caller — `useActionData` no pai). */
}

type ActionData = { success?: boolean; message?: string; error?: string };

/**
 * Modal "Coroar" — incrementa score de marketplace e gerencia os 4 selos
 * curatoriais (Alta Performance, AWS Partner, Founders Hunter, Potencial
 * Unicórnio). Disponível APÓS aprovação da Fase 3 (Detalhes de Captação).
 *
 * Estrutura:
 *   1. Cabeçalho — nome da startup + ID.
 *   2. Seção Score — score atual em destaque + input +N (com preview do
 *      novo total) + campo opcional de justificativa + botão "Aplicar".
 *   3. Seção Selos — grid 2×2 com os 4 selos do catálogo, cada um com
 *      imagem, nome, descrição e botão Aplicar/Remover individual.
 *
 * Cada submissão é um `<Form method="post">` independente — granularidade
 * permite ao admin aplicar 1 selo sem alterar score e vice-versa.
 *
 * Estado aplicado/não-aplicado vem de `adminStartupSealsQueryOptions`
 * (compartilhado com o modal "Selos" existente — TanStack dedup).
 *
 * @see CASE.md §Curadoria Premium
 * @see backendnode/src/api/admin/admin.service.ts (incrementStartupScore)
 */
export function AdminPremiumSealDialog({
  startup,
  onClose,
  onAfterSuccess,
}: AdminPremiumSealDialogProps) {
  const navigation = useNavigation();
  const actionData = useActionData<ActionData>();
  const lastResult = useRef<unknown>(null);
  const [delta, setDelta] = useState<number>(0);

  // Query compartilhada com o modal "Selos" existente — TanStack dedup.
  const sealsQuery = useQuery(
    adminStartupSealsQueryOptions(startup?.id ?? null),
  );
  const assignedSeals = sealsQuery.data?.data ?? startup?.seals ?? [];

  const enviando = navigation.state !== "idle";
  const currentScore = startup?.score ?? 0;
  const previewScore = Math.max(0, Math.min(100, currentScore + delta));

  // Notifica o caller (pai) após sucesso — fecha modal + toast.
  useEffect(() => {
    if (!actionData || actionData === lastResult.current) return;
    lastResult.current = actionData;
    if (actionData.success) {
      onAfterSuccess?.(actionData.message ?? "Operação concluída.");
      // Não fechamos automaticamente — admin pode aplicar mais selos em sequência.
      setDelta(0);
    }
  }, [actionData, onAfterSuccess]);

  if (!startup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-seal-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Crown
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <h3
                id="premium-seal-title"
                className="truncate text-lg font-semibold text-foreground"
              >
                Coroar startup
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {startup.nome} · #{String(startup.id).padStart(6, "0")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Seção 1 — Score */}
        <ScoreSection
          currentScore={currentScore}
          delta={delta}
          previewScore={previewScore}
          enviando={enviando}
          onDeltaChange={setDelta}
          startupId={startup.id}
        />

        {/* Seção 2 — Selos premium */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Selos premium
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PREMIUM_SEAL_CATALOG.map((seal) => (
              <PremiumSealCard
                key={seal.slug}
                seal={seal}
                assigned={assignedSeals.some(
                  (s) => s.slug === seal.slug,
                )}
                assignedId={
                  assignedSeals.find((s) => s.slug === seal.slug)?.id
                }
                startupId={startup.id}
                enviando={enviando}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full border border-white/10 py-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// ScoreSection
// ===========================================================================

interface ScoreSectionProps {
  currentScore: number;
  delta: number;
  previewScore: number;
  enviando: boolean;
  onDeltaChange: (n: number) => void;
  startupId: number | string;
}

function ScoreSection({
  currentScore,
  delta,
  previewScore,
  enviando,
  onDeltaChange,
  startupId,
}: ScoreSectionProps) {
  return (
    <Form
      method="post"
      className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3"
    >
      <input type="hidden" name="startupId" value={startupId} />
      <input type="hidden" name="intent" value="increment-score" />

      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Score de marketplace
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/30 px-5 py-3">
          <span
            className="font-mono text-3xl font-bold text-primary"
            data-testid="current-score"
          >
            {currentScore}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            atual
          </span>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="premium-delta"
            className="text-xs font-semibold text-muted-foreground"
          >
            Adicionar pontos (–100 a +100, ≠ 0)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="premium-delta"
              name="delta"
              type="number"
              min={-100}
              max={100}
              step={1}
              value={delta}
              onChange={(e) => onDeltaChange(Number(e.target.value || 0))}
              className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              data-testid="delta-input"
              aria-describedby="premium-delta-help"
            />
            <span className="text-xs text-muted-foreground">pontos</span>
          </div>
          <p
            id="premium-delta-help"
            className="text-[11px] text-muted-foreground"
          >
            Preview: <strong className="text-foreground">{currentScore}</strong>{" "}
            {delta >= 0 ? "+" : ""}
            {delta} ={" "}
            <strong
              className={cn(
                previewScore === 100 && "text-emerald-400",
                previewScore === 0 && "text-destructive",
                previewScore !== 100 &&
                  previewScore !== 0 &&
                  "text-primary",
              )}
              data-testid="preview-score"
            >
              {previewScore} / 100
            </strong>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="premium-reason"
          className="text-xs font-semibold text-muted-foreground"
        >
          Justificativa (opcional — gravada no AuditLog)
        </label>
        <input
          id="premium-reason"
          name="reason"
          type="text"
          maxLength={280}
          placeholder="Ex.: Performance Q3 validada pela curadoria"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        />
      </div>

      <button
        type="submit"
        disabled={enviando || delta === 0 || delta < -100 || delta > 100}
        className="w-full rounded-full bg-primary py-2.5 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        {enviando ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Aplicando…
          </span>
        ) : (
          "Aplicar mudança de score"
        )}
      </button>
    </Form>
  );
}

// ===========================================================================
// PremiumSealCard
// ===========================================================================

interface PremiumSealCardProps {
  seal: PremiumSealCatalogEntry;
  assigned: boolean;
  assignedId: number | undefined;
  startupId: number | string;
  enviando: boolean;
}

function PremiumSealCard({
  seal,
  assigned,
  assignedId,
  startupId,
  enviando,
}: PremiumSealCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-3 transition",
        assigned
          ? "border-primary/40 bg-primary/5"
          : "border-white/10 bg-black/20",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <img
            src={seal.imagePath}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 object-contain"
            loading="lazy"
            onError={(e) => {
              // Esconde imagem quebrada (PNG ausente) sem quebrar layout.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="truncate text-sm font-semibold text-foreground">
            {seal.name}
          </h5>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            {seal.category === "ACHIEVEMENT" ? "Conquista" : "Parceria"}
          </p>
          <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {seal.description}
          </p>
        </div>
      </div>

      <Form method="post" className="mt-3">
        <input type="hidden" name="startupId" value={startupId} />
        {assigned ? (
          <>
            <input type="hidden" name="intent" value="remove-seal" />
            <input
              type="hidden"
              name="sealId"
              value={assignedId ?? ""}
            />
            <button
              type="submit"
              disabled={enviando || !assignedId}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive transition hover:bg-destructive hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Remover
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="intent" value="assign-seal" />
            <input type="hidden" name="sealSlug" value={seal.slug} />
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Aplicar
            </button>
          </>
        )}
      </Form>
    </article>
  );
}
